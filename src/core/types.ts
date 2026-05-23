export interface IRType {
  kind: 'primitive' | 'model' | 'array' | 'map';
  name: string; // 'string', 'number', 'boolean', 'integer', or the name of a referenced Model
  itemType?: IRType; // Used if kind is 'array'
  valueType?: IRType; // Used if kind is 'map'
}

export interface IRProperty {
  name: string;
  type: IRType;
  required: boolean;
  description?: string;
}

export interface IRModel {
  name: string;
  description?: string;
  properties: IRProperty[];
}

export interface IRParameter {
  name: string;
  in: 'path' | 'query' | 'header';
  type: IRType;
  required: boolean;
  description?: string;
}

export interface IREndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  operationId: string;
  summary?: string;
  description?: string;
  parameters: IRParameter[];
  requestBodyType?: IRType;
  responseType: IRType;
}

export interface IRSecurityScheme {
  type: 'apiKey' | 'http';
  name?: string; // e.g. parameter or header name for apiKey
  in?: 'header' | 'query'; // for apiKey
  scheme?: 'bearer' | 'basic'; // for http
}

export interface APIClientIR {
  title: string;
  version: string;
  description?: string;
  servers: string[];
  models: IRModel[];
  endpoints: IREndpoint[];
  securitySchemes: Record<string, IRSecurityScheme>;
}
