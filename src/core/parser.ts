import { APIClientIR, IRModel, IRProperty, IRType, IREndpoint, IRParameter, IRSecurityScheme } from './types.js';

// Clean camelCase generator helper
export function toCamelCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '');
}

export function toPascalCase(str: string): string {
  const camel = toCamelCase(str);
  if (!camel) return '';
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

// Portable JSON Pointer resolver
function resolveRef(spec: any, ref: string): any {
  if (!ref) return undefined;
  if (!ref.startsWith('#/')) {
    throw new Error(`Unsupported ref: "${ref}". Only local document references (starting with '#/') are supported.`);
  }
  const parts = ref.split('/').slice(1);
  let current = spec;
  for (const part of parts) {
    if (!current || typeof current !== 'object') return undefined;
    const decoded = part.replace(/~1/g, '/').replace(/~0/g, '~');
    current = current[decoded];
  }
  return current;
}

// Translates a schema to a structured IRType
function parseSchemaType(schema: any, spec: any): IRType {
  if (!schema) {
    return { kind: 'primitive', name: 'any' };
  }

  // Resolve references
  if (schema.$ref) {
    const refPath = schema.$ref;
    const modelName = refPath.split('/').pop() || 'UnknownModel';
    return { kind: 'model', name: toPascalCase(modelName) };
  }

  const type = schema.type;

  if (type === 'array') {
    return {
      kind: 'array',
      name: 'array',
      itemType: parseSchemaType(schema.items, spec),
    };
  }

  if (type === 'object') {
    if (schema.additionalProperties) {
      return {
        kind: 'map',
        name: 'map',
        valueType: parseSchemaType(
          schema.additionalProperties === true ? null : schema.additionalProperties,
          spec
        ),
      };
    }
    // If it's an inline object with properties but no ref, represent as inline map of any or model
    return { kind: 'primitive', name: 'any' };
  }

  if (type === 'integer' || type === 'number') {
    return { kind: 'primitive', name: 'number' };
  }

  if (type === 'boolean') {
    return { kind: 'primitive', name: 'boolean' };
  }

  if (type === 'string') {
    return { kind: 'primitive', name: 'string' };
  }

  return { kind: 'primitive', name: 'any' };
}

// Extracts models from components/schemas
function extractModels(spec: any): IRModel[] {
  const models: IRModel[] = [];
  const schemas = spec.components?.schemas || spec.definitions || {};

  for (const [name, rawSchema] of Object.entries(schemas)) {
    const schema: any = rawSchema;
    const resolvedSchema = schema.$ref ? resolveRef(spec, schema.$ref) : schema;
    if (!resolvedSchema) continue;

    const properties: IRProperty[] = [];
    const rawProps = resolvedSchema.properties || {};
    const requiredList = resolvedSchema.required || [];

    for (const [propName, propSchema] of Object.entries(rawProps)) {
      properties.push({
        name: propName,
        type: parseSchemaType(propSchema, spec),
        required: requiredList.includes(propName),
        description: (propSchema as any).description,
      });
    }

    models.push({
      name: toPascalCase(name),
      description: resolvedSchema.description,
      properties,
    });
  }

  return models;
}

// Parses paths/operations
function extractEndpoints(spec: any): IREndpoint[] {
  const endpoints: IREndpoint[] = [];
  const paths = spec.paths || {};

  for (const [path, pathItem] of Object.entries(paths)) {
    const methods: ('get' | 'post' | 'put' | 'delete' | 'patch')[] = ['get', 'post', 'put', 'delete', 'patch'];
    const resolvedPathItem: any = (pathItem as any).$ref ? resolveRef(spec, (pathItem as any).$ref) : pathItem;

    for (const method of methods) {
      const op = resolvedPathItem[method];
      if (!op) continue;

      // Extract operationId or generate one
      let operationId = op.operationId;
      if (!operationId) {
        operationId = toCamelCase(`${method}_${path.replace(/{/g, '').replace(/}/g, '_')}`);
      } else {
        operationId = toCamelCase(operationId);
      }

      // Compile parameters
      const parameters: IRParameter[] = [];
      const rawParams: any[] = op.parameters || [];
      const resolvedParams = rawParams.map(p => (p.$ref ? resolveRef(spec, p.$ref) : p));

      // Also merge path-level parameters if they exist
      const pathParams: any[] = resolvedPathItem.parameters || [];
      const resolvedPathParams = pathParams.map(p => (p.$ref ? resolveRef(spec, p.$ref) : p));
      
      const allParams = [...resolvedPathParams, ...resolvedParams];

      // De-duplicate parameters by name + location
      const seenParams = new Set<string>();
      for (const param of allParams) {
        if (!param) continue;
        const key = `${param.name}_${param.in}`;
        if (seenParams.has(key)) continue;
        seenParams.add(key);

        parameters.push({
          name: param.name,
          in: param.in,
          type: parseSchemaType(param.schema || param, spec),
          required: !!param.required,
          description: param.description,
        });
      }

      // Extract Request Body type
      let requestBodyType: IRType | undefined;
      const requestBody = op.requestBody?.$ref ? resolveRef(spec, op.requestBody.$ref) : op.requestBody;
      if (requestBody?.content) {
        const jsonContent = requestBody.content['application/json'];
        if (jsonContent?.schema) {
          requestBodyType = parseSchemaType(jsonContent.schema, spec);
        }
      }

      // Extract Response Type (look at 2xx response)
      let responseType: IRType = { kind: 'primitive', name: 'any' };
      const responses = op.responses || {};
      const successCode = Object.keys(responses).find(code => code.startsWith('2'));
      const successResponse = successCode ? (responses[successCode].$ref ? resolveRef(spec, responses[successCode].$ref) : responses[successCode]) : responses.default;
      
      if (successResponse?.content) {
        const jsonContent = successResponse.content['application/json'];
        if (jsonContent?.schema) {
          responseType = parseSchemaType(jsonContent.schema, spec);
        }
      }

      endpoints.push({
        path,
        method: method.toUpperCase() as any,
        operationId,
        summary: op.summary,
        description: op.description,
        parameters,
        requestBodyType,
        responseType,
      });
    }
  }

  return endpoints;
}

// Extracts security schemes
function extractSecuritySchemes(spec: any): Record<string, IRSecurityScheme> {
  const schemes: Record<string, IRSecurityScheme> = {};
  const rawSchemes = spec.components?.securitySchemes || spec.securityDefinitions || {};

  for (const [name, scheme] of Object.entries(rawSchemes)) {
    const s: any = scheme;
    if (s.type === 'apiKey') {
      schemes[name] = {
        type: 'apiKey',
        name: s.name,
        in: s.in,
      };
    } else if (s.type === 'http') {
      schemes[name] = {
        type: 'http',
        scheme: s.scheme,
      };
    }
  }

  return schemes;
}

// Core Isomorphic Parser Function
export function parseOpenAPI(specString: string): APIClientIR {
  let spec: any;
  try {
    spec = JSON.parse(specString);
  } catch (err) {
    // If not JSON, it could be YAML. For #caveman portability, we will throw a clear error
    // in the core engine, but let the caller handle it. In the browser/playground,
    // we can easily parse YAML with a client-side parser, or we can handle basic YAML.
    // Let's support pre-parsed JSON objects directly too!
    throw new Error('Invalid JSON spec provided. Please ensure the OpenAPI spec is valid JSON.');
  }

  return parseOpenAPIObject(spec);
}

export function parseOpenAPIObject(spec: any): APIClientIR {
  if (!spec || typeof spec !== 'object') {
    throw new Error('OpenAPI specification must be a valid JSON object.');
  }

  const title = spec.info?.title || 'APIClient';
  const version = spec.info?.version || '1.0.0';
  const description = spec.info?.description;
  
  // Extract servers/baseUrls
  const servers: string[] = [];
  if (Array.isArray(spec.servers)) {
    for (const server of spec.servers) {
      if (server.url) servers.push(server.url);
    }
  } else if (spec.host) {
    const scheme = Array.isArray(spec.schemes) ? spec.schemes[0] : 'https';
    const basePath = spec.basePath || '';
    servers.push(`${scheme}://${spec.host}${basePath}`);
  }
  if (servers.length === 0) {
    servers.push('https://api.example.com');
  }

  return {
    title: toPascalCase(title),
    version,
    description,
    servers,
    models: extractModels(spec),
    endpoints: extractEndpoints(spec),
    securitySchemes: extractSecuritySchemes(spec),
  };
}
