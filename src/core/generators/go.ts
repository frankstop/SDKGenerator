import { APIClientIR, IRModel, IRType, IREndpoint, IRProperty } from '../types.js';

// Type mapping helper for Go
function mapGoType(type: IRType): string {
  switch (type.kind) {
    case 'primitive':
      if (type.name === 'integer') return 'int';
      if (type.name === 'number') return 'float64';
      if (type.name === 'boolean') return 'bool';
      if (type.name === 'string') return 'string';
      return 'any';
    case 'model':
      return type.name;
    case 'array':
      return `[]${mapGoType(type.itemType!)}`;
    case 'map':
      return `map[string]${mapGoType(type.valueType!)}`;
    default:
      return 'any';
  }
}

// Capitalize helper for struct fields
function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Generate Go models
function generateModels(packageName: string, models: IRModel[]): string {
  let code = `package ${packageName}\n\n`;

  for (const model of models) {
    if (model.description) {
      code += `// ${model.name} - ${model.description}\n`;
    }
    code += `type ${model.name} struct {\n`;
    for (const prop of model.properties) {
      const goField = capitalize(prop.name);
      const goType = mapGoType(prop.type);
      const jsonTag = prop.required ? prop.name : `${prop.name},omitempty`;
      
      if (prop.description) {
        code += `\t// ${prop.description}\n`;
      }
      code += `\t${goField} ${goType} \`json:"${jsonTag}"\`\n`;
    }
    code += `}\n\n`;
  }

  return code;
}

// Generate Go Client using net/http
function generateClient(packageName: string, ir: APIClientIR): string {
  const hasSecurity = Object.keys(ir.securitySchemes).length > 0;
  const defaultServer = ir.servers[0] || 'https://api.example.com';
  const clientName = `${ir.title}Client`;

  let code = `package ${packageName}\n\n`;
  code += `import (\n`;
  code += `\t"bytes"\n`;
  code += `\t"context"\n`;
  code += `\t"encoding/json"\n`;
  code += `\t"fmt"\n`;
  code += `\t"io"\n`;
  code += `\t"net/http"\n`;
  code += `\t"net/url"\n`;
  code += `\t"strings"\n`;
  code += `\t"time"\n`;
  code += `)\n\n`;

  // Config definition
  code += `type ClientConfig struct {\n`;
  code += `\tBaseURL    string\n`;
  code += `\tHTTPClient *http.Client\n`;
  if (hasSecurity) {
    code += `\tToken      string\n`;
  }
  code += `}\n\n`;

  // Client Struct
  code += `type ${clientName} struct {\n`;
  code += `\tbaseURL    string\n`;
  code += `\thttpClient *http.Client\n`;
  if (hasSecurity) {
    code += `\ttoken      string\n`;
  }
  code += `}\n\n`;

  // Constructor
  code += `func NewClient(config ClientConfig) *${clientName} {\n`;
  code += `\tbaseURL := config.BaseURL\n`;
  code += `\tif baseURL == "" {\n`;
  code += `\t\tbaseURL = "${defaultServer}"\n`;
  code += `\t}\n`;
  code += `\thttpClient := config.HTTPClient\n`;
  code += `\tif httpClient == nil {\n`;
  code += `\t\thttpClient = &http.Client{\n`;
  code += `\t\t\tTimeout: 30 * time.Second,\n`;
  code += `\t\t}\n`;
  code += `\t}\n`;
  code += `\treturn &${clientName}{\n`;
  code += `\t\tbaseURL:    strings.TrimSuffix(baseURL, "/"),\n`;
  code += `\t\thttpClient: httpClient,\n`;
  if (hasSecurity) {
    code += `\t\ttoken:      config.Token,\n`;
  }
  code += `\t}\n`;
  code += `}\n\n`;

  // Internal Request Helper
  code += `func (c *${clientName}) doRequest(ctx context.Context, method, path string, query url.Values, body any, headers map[string]string) ([]byte, error) {\n`;
  code += `\tfullURL := c.baseURL + path\n`;
  code += `\tif len(query) > 0 {\n`;
  code += `\t\tfullURL += "?" + query.Encode()\n`;
  code += `\t}\n\n`;

  code += `\tvar bodyReader io.Reader\n`;
  code += `\tif body != nil {\n`;
  code += `\t\tjsonBytes, err := json.Marshal(body)\n`;
  code += `\t\tif err != nil {\n`;
  code += `\t\t\treturn nil, fmt.Errorf("failed to marshal request body: %w", err)\n`;
  code += `\t\t}\n`;
  code += `\t\tbodyReader = bytes.NewReader(jsonBytes)\n`;
  code += `\t}\n\n`;

  code += `\treq, err := http.NewRequestWithContext(ctx, method, fullURL, bodyReader)\n`;
  code += `\tif err != nil {\n`;
  code += `\t\treturn nil, fmt.Errorf("failed to create HTTP request: %w", err)\n`;
  code += `\t}\n\n`;

  code += `\treq.Header.Set("Content-Type", "application/json")\n`;
  code += `\tfor k, v := range headers {\n`;
  code += `\t\treq.Header.Set(k, v)\n`;
  code += `\t}\n\n`;

  if (hasSecurity) {
    const apiKeyScheme = Object.entries(ir.securitySchemes).find(([_, s]) => s.type === 'apiKey');
    const httpScheme = Object.entries(ir.securitySchemes).find(([_, s]) => s.type === 'http');

    code += `\tif c.token != "" {\n`;
    if (apiKeyScheme) {
      const s = apiKeyScheme[1];
      if (s.in === 'header') {
        code += `\t\treq.Header.Set("${s.name || 'X-API-Key'}", c.token)\n`;
      } else if (s.in === 'query') {
        code += `\t\tq := req.URL.Query()\n`;
        code += `\t\tq.Set("${s.name || 'api-key'}", c.token)\n`;
        code += `\t\treq.URL.RawQuery = q.Encode()\n`;
      }
    } else if (httpScheme && httpScheme[1].scheme === 'bearer') {
      code += `\t\treq.Header.Set("Authorization", "Bearer "+c.token)\n`;
    } else {
      code += `\t\treq.Header.Set("Authorization", "Bearer "+c.token)\n`;
    }
    code += `\t}\n\n`;
  }

  code += `\tresp, err := c.httpClient.Do(req)\n`;
  code += `\tif err != nil {\n`;
  code += `\t\treturn nil, fmt.Errorf("HTTP request failed: %w", err)\n`;
  code += `\t}\n`;
  code += `\tdefer resp.Body.Close()\n\n`;

  code += `\trespBody, err := io.ReadAll(resp.Body)\n`;
  code += `\tif err != nil {\n`;
  code += `\t\treturn nil, fmt.Errorf("failed to read response body: %w", err)\n`;
  code += `\t}\n\n`;

  code += `\tif resp.StatusCode < 200 || resp.StatusCode >= 300 {\n`;
  code += `\t\treturn nil, fmt.Errorf("HTTP error %d: %s", resp.StatusCode, string(respBody))\n`;
  code += `\t}\n\n`;

  code += `\treturn respBody, nil\n`;
  code += `}\n\n`;

  // Generate Endpoint Methods
  for (const ep of ir.endpoints) {
    if (ep.summary || ep.description) {
      code += `// ${ep.operationId} - `;
      if (ep.summary) code += `${ep.summary}\n`;
      else if (ep.description) code += `${ep.description}\n`;
    }

    const pathParams = ep.parameters.filter(p => p.in === 'path');
    const queryParams = ep.parameters.filter(p => p.in === 'query');
    const headerParams = ep.parameters.filter(p => p.in === 'header');

    // Method arguments
    const args: string[] = ['ctx context.Context'];
    pathParams.forEach(p => {
      args.push(`${p.name} ${mapGoType(p.type)}`);
    });

    if (queryParams.length > 0) {
      // Inline struct or Map for query params
      const fields = queryParams.map(p => `${capitalize(p.name)} ${mapGoType(p.type)}`).join('\n\t\t');
      args.push(`query struct {\n\t\t${fields}\n\t}`);
    }

    if (ep.requestBodyType) {
      args.push(`body ${mapGoType(ep.requestBodyType)}`);
    }

    // Return types
    const responseTypeGo = mapGoType(ep.responseType);
    const returnType = responseTypeGo === 'any' ? 'any' : `*${responseTypeGo}`;

    code += `func (c *${clientName}) ${capitalize(ep.operationId)}(${args.join(', ')}) (${returnType}, error) {\n`;
    
    // Path resolution
    let pathStr = ep.path;
    pathParams.forEach(p => {
      pathStr = pathStr.replace(`{${p.name}}`, `"%v"`);
    });

    if (pathParams.length > 0) {
      const formattingArgs = pathParams.map(p => p.name).join(', ');
      code += `\tresolvedPath := fmt.Sprintf("${pathStr}", ${formattingArgs})\n`;
    } else {
      code += `\tresolvedPath := "${pathStr}"\n`;
    }

    // Query Params setup
    if (queryParams.length > 0) {
      code += `\tqueryParams := url.Values{}\n`;
      queryParams.forEach(p => {
        const fieldName = capitalize(p.name);
        if (p.type.name === 'string') {
          code += `\tif query.${fieldName} != "" {\n`;
          code += `\t\tqueryParams.Set("${p.name}", query.${fieldName})\n`;
          code += `\t}\n`;
        } else if (p.type.name === 'boolean') {
          code += `\tqueryParams.Set("${p.name}", fmt.Sprintf("%t", query.${fieldName}))\n`;
        } else {
          code += `\tqueryParams.Set("${p.name}", fmt.Sprintf("%v", query.${fieldName}))\n`;
        }
      });
    } else {
      code += `\tvar queryParams url.Values\n`;
    }

    // Headers setup
    if (headerParams.length > 0) {
      code += `\theaderParams := make(map[string]string)\n`;
      // Map custom headers
    } else {
      code += `\tvar headerParams map[string]string\n`;
    }

    // Request body setup
    const reqBodyArg = ep.requestBodyType ? 'body' : 'nil';

    code += `\trespBytes, err := c.doRequest(ctx, "${ep.method}", resolvedPath, queryParams, ${reqBodyArg}, headerParams)\n`;
    code += `\tif err != nil {\n`;
    code += `\t\treturn nil, err\n`;
    code += `\t}\n\n`;

    if (responseTypeGo === 'any') {
      code += `\tvar result any\n`;
      code += `\tif len(respBytes) > 0 {\n`;
      code += `\t\tif err := json.Unmarshal(respBytes, &result); err != nil {\n`;
      code += `\t\t\treturn nil, fmt.Errorf("failed to unmarshal response: %w", err)\n`;
      code += `\t\t}\n`;
      code += `\t}\n`;
      code += `\treturn result, nil\n`;
    } else {
      code += `\tvar result ${responseTypeGo}\n`;
      code += `\tif len(respBytes) > 0 {\n`;
      code += `\t\tif err := json.Unmarshal(respBytes, &result); err != nil {\n`;
      code += `\t\t\treturn nil, fmt.Errorf("failed to unmarshal response: %w", err)\n`;
      code += `\t\t}\n`;
      code += `\t}\n`;
      code += `\treturn &result, nil\n`;
    }

    code += `}\n\n`;
  }

  return code;
}

export function generateGoSDK(ir: APIClientIR) {
  const pkgName = ir.title.toLowerCase();
  
  const modelsContent = generateModels(pkgName, ir.models);
  const clientContent = generateClient(pkgName, ir);

  const goMod = `module github.com/frankstop/SDKGenerator/generated/go/${pkgName}

go 1.21
`;

  return [
    { path: 'models.go', content: modelsContent },
    { path: 'client.go', content: clientContent },
    { path: 'go.mod', content: goMod }
  ];
}
