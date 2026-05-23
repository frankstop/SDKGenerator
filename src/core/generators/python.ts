import { APIClientIR, IRModel, IRType, IREndpoint } from '../types.js';

// Type mapping helper for Python
function mapPythonType(type: IRType): string {
  switch (type.kind) {
    case 'primitive':
      if (type.name === 'integer') return 'int';
      if (type.name === 'number') return 'float';
      if (type.name === 'boolean') return 'bool';
      if (type.name === 'string') return 'str';
      return 'Any';
    case 'model':
      return `"${type.name}"`; // Quote to prevent forward reference errors in Python
    case 'array':
      return `List[${mapPythonType(type.itemType!)}]`;
    case 'map':
      return `Dict[str, ${mapPythonType(type.valueType!)}]`;
    default:
      return 'Any';
  }
}

// Generate Python classes representing models (using standard typing or pydantic BaseModel)
function generateModels(models: IRModel[]): string {
  let code = `from typing import List, Dict, Any, Optional\nfrom pydantic import BaseModel, Field\n\n`;

  for (const model of models) {
    code += `class ${model.name}(BaseModel):\n`;
    if (model.description) {
      code += `    \"\"\"\n    ${model.description}\n    \"\"\"\n`;
    }
    
    if (model.properties.length === 0) {
      code += `    pass\n\n`;
      continue;
    }

    for (const prop of model.properties) {
      const pyType = mapPythonType(prop.type);
      const isRequired = prop.required;
      
      const fieldOptions: string[] = [];
      if (prop.description) {
        fieldOptions.push(`description="${prop.description.replace(/"/g, '\\"')}"`);
      }
      
      const fieldDecl = fieldOptions.length > 0 ? ` = Field(${fieldOptions.join(', ')})` : '';
      
      if (isRequired) {
        code += `    ${prop.name}: ${pyType}${fieldDecl}\n`;
      } else {
        code += `    ${prop.name}: Optional[${pyType}] = None\n`;
      }
    }
    code += `\n`;
  }

  return code;
}

// Generate Python Client
function generateClient(ir: APIClientIR): string {
  const hasSecurity = Object.keys(ir.securitySchemes).length > 0;
  const defaultServer = ir.servers[0] || 'https://api.example.com';

  let code = `import requests\nfrom typing import List, Dict, Any, Optional\nfrom . import models\n\n`;

  code += `class ${ir.title}Client:\n`;
  code += `    def __init__(\n`;
  code += `        self,\n`;
  code += `        base_url: str = "${defaultServer}",\n`;
  code += `        headers: Optional[Dict[str, str]] = None,\n`;
  if (hasSecurity) {
    code += `        token: Optional[str] = None,\n`;
  }
  code += `    ):\n`;
  code += `        self.base_url = base_url.rstrip("/")\n`;
  code += `        self.headers = {"Content-Type": "application/json"}\n`;
  code += `        if headers:\n`;
  code += `            self.headers.update(headers)\n`;
  if (hasSecurity) {
    code += `        self.token = token\n`;
  }
  code += `\n`;

  // Internal Request Handler
  code += `    def _request(\n`;
  code += `        self,\n`;
  code += `        method: str,\n`;
  code += `        path: str,\n`;
  code += `        params: Optional[Dict[str, Any]] = None,\n`;
  code += `        json: Optional[Any] = None,\n`;
  code += `        headers: Optional[Dict[str, str]] = None,\n`;
  code += `    ) -> Any:\n`;
  code += `        url = f"{self.base_url}{path}"\n`;
  code += `        req_headers = self.headers.copy()\n`;
  code += `        if headers:\n`;
  code += `            req_headers.update(headers)\n\n`;

  if (hasSecurity) {
    const apiKeyScheme = Object.entries(ir.securitySchemes).find(([_, s]) => s.type === 'apiKey');
    const httpScheme = Object.entries(ir.securitySchemes).find(([_, s]) => s.type === 'http');

    code += `        if self.token:\n`;
    if (apiKeyScheme) {
      const s = apiKeyScheme[1];
      if (s.in === 'header') {
        code += `            req_headers["${s.name || 'X-API-Key'}"] = self.token\n`;
      } else if (s.in === 'query') {
        code += `            params = params or {}\n`;
        code += `            params["${s.name || 'api_key'}"] = self.token\n`;
      }
    } else if (httpScheme && httpScheme[1].scheme === 'bearer') {
      code += `            req_headers["Authorization"] = f"Bearer {self.token}"\n`;
    } else {
      code += `            req_headers["Authorization"] = f"Bearer {self.token}"\n`;
    }
  }

  code += `\n`;
  code += `        response = requests.request(\n`;
  code += `            method=method,\n`;
  code += `            url=url,\n`;
  code += `            params=params,\n`;
  code += `            json=json,\n`;
  code += `            headers=req_headers,\n`;
  code += `        )\n\n`;

  code += `        if not response.ok:\n`;
  code += `            raise Exception(f"HTTP {response.status_code}: {response.text}")\n\n`;

  code += `        if response.status_code == 204:\n`;
  code += `            return {}\n`;
  code += `        return response.json()\n\n`;

  // Generate Endpoint Methods
  for (const ep of ir.endpoints) {
    // Generate docstring
    let doc = '';
    if (ep.summary || ep.description) {
      doc += `        \"\"\"\n`;
      if (ep.summary) doc += `        ${ep.summary}\n`;
      if (ep.description) doc += `        ${ep.description}\n`;
      doc += `        \"\"\"\n`;
    }

    const pyMethod = ep.operationId.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/_+/g, '_');

    // Method arguments
    const argsList: string[] = ['self'];
    
    // Path params first (required)
    const pathParams = ep.parameters.filter(p => p.in === 'path');
    for (const p of pathParams) {
      argsList.push(`${p.name}: ${mapPythonType(p.type).replace(/"/g, '')}`);
    }

    // Query params (optional)
    const queryParams = ep.parameters.filter(p => p.in === 'query');
    if (queryParams.length > 0) {
      argsList.push(`query: Optional[Dict[str, Any]] = None`);
    }

    // Header params (optional)
    const headerParams = ep.parameters.filter(p => p.in === 'header');
    if (headerParams.length > 0) {
      argsList.push(`headers: Optional[Dict[str, str]] = None`);
    }

    // Request body (optional)
    if (ep.requestBodyType) {
      const bodyType = mapPythonType(ep.requestBodyType).replace(/"/g, '');
      const qualifiedBodyType = ep.requestBodyType.kind === 'model' ? `models.${bodyType}` : bodyType;
      argsList.push(`body: ${qualifiedBodyType}`);
    }

    code += `    def ${pyMethod}(self, ${argsList.join(', ')}) -> Any:\n`;
    if (doc) code += doc;

    // Construct path interpolation
    let pathStr = ep.path;
    pathParams.forEach(p => {
      pathStr = pathStr.replace(`{${p.name}}`, `{${p.name}}`);
    });

    const requestCallArgs: string[] = [];
    requestCallArgs.push(`method="${ep.method}"`);
    requestCallArgs.push(`path=f"${pathStr}"`);
    requestCallArgs.push(queryParams.length > 0 ? `params=query` : 'params=None');
    
    if (ep.requestBodyType) {
      if (ep.requestBodyType.kind === 'model') {
        requestCallArgs.push(`json=body.model_dump()`);
      } else {
        requestCallArgs.push(`json=body`);
      }
    } else {
      requestCallArgs.push('json=None');
    }

    if (headerParams.length > 0) {
      requestCallArgs.push('headers=headers');
    }

    code += `        res = self._request(${requestCallArgs.join(', ')})\n`;
    
    // Parse response to Model if applicable
    if (ep.responseType.kind === 'model') {
      code += `        return models.${ep.responseType.name}(**res)\n`;
    } else {
      code += `        return res\n`;
    }
    code += `\n`;
  }

  return code;
}

export function generatePythonSDK(ir: APIClientIR) {
  const modelsContent = generateModels(ir.models);
  const clientContent = generateClient(ir);
  
  const initContent = `from .client import ${ir.title}Client\nfrom .models import *\n`;

  const pyProject = `[tool.poetry]
name = "${ir.title.toLowerCase()}-sdk"
version = "${ir.version}"
description = "Python SDK for ${ir.title}"
authors = ["Frankstop <frank@example.com>"]

[tool.poetry.dependencies]
python = "^3.9"
requests = "^2.31.0"
pydantic = "^2.7.0"
`;

  return [
    { path: 'src/__init__.py', content: initContent },
    { path: 'src/models.py', content: modelsContent },
    { path: 'src/client.py', content: clientContent },
    { path: 'pyproject.toml', content: pyProject }
  ];
}
