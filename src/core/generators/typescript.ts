import { APIClientIR, IRModel, IRType, IREndpoint } from '../types.js';

// Type mapping helper for TS
function mapTSType(type: IRType): string {
  switch (type.kind) {
    case 'primitive':
      if (type.name === 'integer' || type.name === 'number') return 'number';
      return type.name; // string, boolean, any
    case 'model':
      return type.name;
    case 'array':
      return `${mapTSType(type.itemType!)}[]`;
    case 'map':
      return `Record<string, ${mapTSType(type.valueType!)}>`;
    default:
      return 'any';
  }
}

// Generate TS Interfaces representing models
function generateModels(models: IRModel[]): string {
  let code = `/**\n * Auto-generated models for the API client.\n */\n\n`;

  for (const model of models) {
    if (model.description) {
      code += `/**\n * ${model.description}\n */\n`;
    }
    code += `export interface ${model.name} {\n`;
    for (const prop of model.properties) {
      if (prop.description) {
        code += `  /** ${prop.description} */\n`;
      }
      const optional = prop.required ? '' : '?';
      code += `  ${prop.name}${optional}: ${mapTSType(prop.type)};\n`;
    }
    code += `}\n\n`;
  }

  return code;
}

// Generate TS Client
function generateClient(ir: APIClientIR): string {
  const hasSecurity = Object.keys(ir.securitySchemes).length > 0;
  const defaultServer = ir.servers[0] || 'https://api.example.com';

  let code = `/**\n * Auto-generated client for ${ir.title}\n */\n\n`;
  code += `import * as Models from './models.js';\n\n`;

  code += `export interface ClientConfig {\n`;
  code += `  baseUrl?: string;\n`;
  code += `  headers?: Record<string, string>;\n`;
  if (hasSecurity) {
    code += `  token?: string; // Bearer token or API key\n`;
  }
  code += `}\n\n`;

  code += `export class ${ir.title}Client {\n`;
  code += `  private baseUrl: string;\n`;
  code += `  private headers: Record<string, string>;\n`;
  if (hasSecurity) {
    code += `  private token?: string;\n`;
  }
  code += `\n`;

  code += `  constructor(config: ClientConfig = {}) {\n`;
  code += `    this.baseUrl = config.baseUrl || '${defaultServer}';\n`;
  code += `    this.headers = {\n`;
  code += `      'Content-Type': 'application/json',\n`;
  code += `      ...config.headers\n`;
  code += `    };\n`;
  if (hasSecurity) {
    code += `    this.token = config.token;\n`;
  }
  code += `  }\n\n`;

  // Base request handler
  code += `  private async request<T>(method: string, path: string, query?: Record<string, any>, body?: any, headers?: Record<string, string>): Promise<T> {\n`;
  code += `    const url = new URL(this.baseUrl + path);\n`;
  code += `    if (query) {\n`;
  code += `      Object.entries(query).forEach(([k, v]) => {\n`;
  code += `        if (v !== undefined && v !== null) url.searchParams.append(k, String(v));\n`;
  code += `      });\n`;
  code += `    }\n\n`;
  
  code += `    const reqHeaders = { ...this.headers, ...headers };\n`;
  if (hasSecurity) {
    // Standard bearer / apiKey setup
    const apiKeyScheme = Object.entries(ir.securitySchemes).find(([_, s]) => s.type === 'apiKey');
    const httpScheme = Object.entries(ir.securitySchemes).find(([_, s]) => s.type === 'http');
    
    code += `    if (this.token) {\n`;
    if (apiKeyScheme) {
      const s = apiKeyScheme[1];
      if (s.in === 'header') {
        code += `      reqHeaders['${s.name || 'X-API-Key'}'] = this.token;\n`;
      } else if (s.in === 'query') {
        code += `      url.searchParams.append('${s.name || 'api_key'}', this.token);\n`;
      }
    } else if (httpScheme && httpScheme[1].scheme === 'bearer') {
      code += `      reqHeaders['Authorization'] = \`Bearer \${this.token}\`;\n`;
    } else {
      code += `      reqHeaders['Authorization'] = \`Bearer \${this.token}\`;\n`;
    }
    code += `    }\n`;
  }

  code += `\n`;
  code += `    const response = await fetch(url.toString(), {\n`;
  code += `      method,\n`;
  code += `      headers: reqHeaders,\n`;
  code += `      body: body ? JSON.stringify(body) : undefined\n`;
  code += `    });\n\n`;

  code += `    if (!response.ok) {\n`;
  code += `      const errorText = await response.text();\n`;
  code += `      throw new Error(\`HTTP \${response.status}: \${errorText}\`);\n`;
  code += `    }\n\n`;

  code += `    if (response.status === 204) return {} as T;\n`;
  code += `    return await response.json() as T;\n`;
  code += `  }\n\n`;

  // Generate Endpoint Methods
  for (const ep of ir.endpoints) {
    if (ep.summary || ep.description) {
      code += `  /**\n`;
      if (ep.summary) code += `   * ${ep.summary}\n`;
      if (ep.description) code += `   * ${ep.description}\n`;
      code += `   */\n`;
    }

    // Method Signature
    const paramsList: string[] = [];
    
    // Path params
    const pathParams = ep.parameters.filter(p => p.in === 'path');
    for (const p of pathParams) {
      paramsList.push(`${p.name}: ${mapTSType(p.type)}`);
    }

    // Query params
    const queryParams = ep.parameters.filter(p => p.in === 'query');
    if (queryParams.length > 0) {
      const qFields = queryParams.map(p => `${p.name}${p.required ? '' : '?'}: ${mapTSType(p.type)}`).join('; ');
      paramsList.push(`query?: { ${qFields} }`);
    }

    // Headers
    const headerParams = ep.parameters.filter(p => p.in === 'header');
    if (headerParams.length > 0) {
      const hFields = headerParams.map(p => `${p.name}${p.required ? '' : '?'}: ${mapTSType(p.type)}`).join('; ');
      paramsList.push(`headers?: { ${hFields} }`);
    }

    // Request body
    if (ep.requestBodyType) {
      paramsList.push(`body: ${mapTSType(ep.requestBodyType)}`);
    }

    const returnType = mapTSType(ep.responseType);
    const qualifiedReturnType = ep.responseType.kind === 'model' ? `Models.${returnType}` : returnType;

    code += `  async ${ep.operationId}(${paramsList.join(', ')}): Promise<${qualifiedReturnType}> {\n`;
    
    // Construct dynamic path string
    let pathString = ep.path;
    pathParams.forEach(p => {
      pathString = pathString.replace(`{${p.name}}`, `\${${p.name}}`);
    });

    // Make request call
    const argList: string[] = [];
    argList.push(`'${ep.method}'`);
    argList.push(`\`${pathString}\``);
    argList.push(queryParams.length > 0 ? 'query' : 'undefined');
    argList.push(ep.requestBodyType ? 'body' : 'undefined');

    if (headerParams.length > 0) {
      argList.push('headers');
    }

    code += `    return this.request<${qualifiedReturnType}>(${argList.join(', ')});\n`;
    code += `  }\n\n`;
  }

  code += `}\n`;

  return code;
}

export function generateTypeScriptSDK(ir: APIClientIR) {
  const modelsContent = generateModels(ir.models);
  const clientContent = generateClient(ir);

  const indexContent = `export * from './client.js';\nexport * from './models.js';\n`;

  const packageJson = `{
  "name": "${ir.title.toLowerCase()}-sdk",
  "version": "${ir.version}",
  "description": "TypeScript SDK for ${ir.title}",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc"
  },
  "devDependencies": {
    "typescript": "^5.4.5"
  }
}`;

  const tsConfig = `{
  "compilerOptions": {
    "target": "ESNext",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}`;

  return [
    { path: 'src/models.ts', content: modelsContent },
    { path: 'src/client.ts', content: clientContent },
    { path: 'src/index.ts', content: indexContent },
    { path: 'package.json', content: packageJson },
    { path: 'tsconfig.json', content: tsConfig }
  ];
}
