(function(){const o=document.createElement("link").relList;if(o&&o.supports&&o.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))r(t);new MutationObserver(t=>{for(const e of t)if(e.type==="childList")for(const i of e.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&r(i)}).observe(document,{childList:!0,subtree:!0});function s(t){const e={};return t.integrity&&(e.integrity=t.integrity),t.referrerPolicy&&(e.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?e.credentials="include":t.crossOrigin==="anonymous"?e.credentials="omit":e.credentials="same-origin",e}function r(t){if(t.ep)return;t.ep=!0;const e=s(t);fetch(t.href,e)}})();function A(n){return n.replace(/[^a-zA-Z0-9]+(.)/g,(o,s)=>s.toUpperCase()).replace(/[^a-zA-Z0-9]/g,"")}function R(n){const o=A(n);return o?o.charAt(0).toUpperCase()+o.slice(1):""}function S(n,o){if(!o)return;if(!o.startsWith("#/"))throw new Error(`Unsupported ref: "${o}". Only local document references (starting with '#/') are supported.`);const s=o.split("/").slice(1);let r=n;for(const t of s){if(!r||typeof r!="object")return;const e=t.replace(/~1/g,"/").replace(/~0/g,"~");r=r[e]}return r}function P(n,o){if(!n)return{kind:"primitive",name:"any"};if(n.$ref){const t=n.$ref.split("/").pop()||"UnknownModel";return{kind:"model",name:R(t)}}const s=n.type;return s==="array"?{kind:"array",name:"array",itemType:P(n.items)}:s==="object"?n.additionalProperties?{kind:"map",name:"map",valueType:P(n.additionalProperties===!0?null:n.additionalProperties)}:{kind:"primitive",name:"any"}:s==="integer"||s==="number"?{kind:"primitive",name:"number"}:s==="boolean"?{kind:"primitive",name:"boolean"}:s==="string"?{kind:"primitive",name:"string"}:{kind:"primitive",name:"any"}}function Q(n){var r;const o=[],s=((r=n.components)==null?void 0:r.schemas)||n.definitions||{};for(const[t,e]of Object.entries(s)){const i=e,a=i.$ref?S(n,i.$ref):i;if(!a)continue;const c=[],l=a.properties||{},f=a.required||[];for(const[d,h]of Object.entries(l))c.push({name:d,type:P(h),required:f.includes(d),description:h.description});o.push({name:R(t),description:a.description,properties:c})}return o}function Y(n){var r;const o=[],s=n.paths||{};for(const[t,e]of Object.entries(s)){const i=["get","post","put","delete","patch"],a=e.$ref?S(n,e.$ref):e;for(const c of i){const l=a[c];if(!l)continue;let f=l.operationId;f?f=A(f):f=A(`${c}_${t.replace(/{/g,"").replace(/}/g,"_")}`);const d=[],p=(l.parameters||[]).map(m=>m.$ref?S(n,m.$ref):m),g=[...(a.parameters||[]).map(m=>m.$ref?S(n,m.$ref):m),...p],O=new Set;for(const m of g){if(!m)continue;const M=`${m.name}_${m.in}`;O.has(M)||(O.add(M),d.push({name:m.name,in:m.in,type:P(m.schema||m),required:!!m.required,description:m.description}))}let H;const C=(r=l.requestBody)!=null&&r.$ref?S(n,l.requestBody.$ref):l.requestBody;if(C!=null&&C.content){const m=C.content["application/json"];m!=null&&m.schema&&(H=P(m.schema))}let N={kind:"primitive",name:"any"};const k=l.responses||{},j=Object.keys(k).find(m=>m.startsWith("2")),_=j?k[j].$ref?S(n,k[j].$ref):k[j]:k.default;if(_!=null&&_.content){const m=_.content["application/json"];m!=null&&m.schema&&(N=P(m.schema))}o.push({path:t,method:c.toUpperCase(),operationId:f,summary:l.summary,description:l.description,parameters:d,requestBodyType:H,responseType:N})}}return o}function ee(n){var r;const o={},s=((r=n.components)==null?void 0:r.securitySchemes)||n.securityDefinitions||{};for(const[t,e]of Object.entries(s)){const i=e;i.type==="apiKey"?o[t]={type:"apiKey",name:i.name,in:i.in}:i.type==="http"&&(o[t]={type:"http",scheme:i.scheme})}return o}function te(n){var e,i,a;if(!n||typeof n!="object")throw new Error("OpenAPI specification must be a valid JSON object.");const o=((e=n.info)==null?void 0:e.title)||"APIClient",s=((i=n.info)==null?void 0:i.version)||"1.0.0",r=(a=n.info)==null?void 0:a.description,t=[];if(Array.isArray(n.servers))for(const c of n.servers)c.url&&t.push(c.url);else if(n.host){const c=Array.isArray(n.schemes)?n.schemes[0]:"https",l=n.basePath||"";t.push(`${c}://${n.host}${l}`)}return t.length===0&&t.push("https://api.example.com"),{title:R(o),version:s,description:r,servers:t,models:Q(n),endpoints:Y(n),securitySchemes:ee(n)}}function $(n){switch(n.kind){case"primitive":return n.name==="integer"||n.name==="number"?"number":n.name;case"model":return n.name;case"array":return`${$(n.itemType)}[]`;case"map":return`Record<string, ${$(n.valueType)}>`;default:return"any"}}function re(n){let o=`/**
 * Auto-generated models for the API client.
 */

`;for(const s of n){s.description&&(o+=`/**
 * ${s.description}
 */
`),o+=`export interface ${s.name} {
`;for(const r of s.properties){r.description&&(o+=`  /** ${r.description} */
`);const t=r.required?"":"?";o+=`  ${r.name}${t}: ${$(r.type)};
`}o+=`}

`}return o}function ne(n){const o=Object.keys(n.securitySchemes).length>0,s=n.servers[0]||"https://api.example.com";let r=`/**
 * Auto-generated client for ${n.title}
 */

`;if(r+=`import * as Models from './models.js';

`,r+=`export interface ClientConfig {
`,r+=`  baseUrl?: string;
`,r+=`  headers?: Record<string, string>;
`,o&&(r+=`  token?: string; // Bearer token or API key
`),r+=`}

`,r+=`export class ${n.title}Client {
`,r+=`  private baseUrl: string;
`,r+=`  private headers: Record<string, string>;
`,o&&(r+=`  private token?: string;
`),r+=`
`,r+=`  constructor(config: ClientConfig = {}) {
`,r+=`    this.baseUrl = config.baseUrl || '${s}';
`,r+=`    this.headers = {
`,r+=`      'Content-Type': 'application/json',
`,r+=`      ...config.headers
`,r+=`    };
`,o&&(r+=`    this.token = config.token;
`),r+=`  }

`,r+=`  private async request<T>(method: string, path: string, query?: Record<string, any>, body?: any, headers?: Record<string, string>): Promise<T> {
`,r+=`    const url = new URL(this.baseUrl + path);
`,r+=`    if (query) {
`,r+=`      Object.entries(query).forEach(([k, v]) => {
`,r+=`        if (v !== undefined && v !== null) url.searchParams.append(k, String(v));
`,r+=`      });
`,r+=`    }

`,r+=`    const reqHeaders = { ...this.headers, ...headers };
`,o){const t=Object.entries(n.securitySchemes).find(([i,a])=>a.type==="apiKey"),e=Object.entries(n.securitySchemes).find(([i,a])=>a.type==="http");if(r+=`    if (this.token) {
`,t){const i=t[1];i.in==="header"?r+=`      reqHeaders['${i.name||"X-API-Key"}'] = this.token;
`:i.in==="query"&&(r+=`      url.searchParams.append('${i.name||"api_key"}', this.token);
`)}else e&&e[1].scheme,r+="      reqHeaders['Authorization'] = `Bearer ${this.token}`;\n";r+=`    }
`}r+=`
`,r+=`    const response = await fetch(url.toString(), {
`,r+=`      method,
`,r+=`      headers: reqHeaders,
`,r+=`      body: body ? JSON.stringify(body) : undefined
`,r+=`    });

`,r+=`    if (!response.ok) {
`,r+=`      const errorText = await response.text();
`,r+="      throw new Error(`HTTP ${response.status}: ${errorText}`);\n",r+=`    }

`,r+=`    if (response.status === 204) return {} as T;
`,r+=`    return await response.json() as T;
`,r+=`  }

`;for(const t of n.endpoints){(t.summary||t.description)&&(r+=`  /**
`,t.summary&&(r+=`   * ${t.summary}
`),t.description&&(r+=`   * ${t.description}
`),r+=`   */
`);const e=[],i=t.parameters.filter(p=>p.in==="path");for(const p of i)e.push(`${p.name}: ${$(p.type)}`);const a=t.parameters.filter(p=>p.in==="query");if(a.length>0){const p=a.map(u=>`${u.name}${u.required?"":"?"}: ${$(u.type)}`).join("; ");e.push(`query?: { ${p} }`)}const c=t.parameters.filter(p=>p.in==="header");if(c.length>0){const p=c.map(u=>`${u.name}${u.required?"":"?"}: ${$(u.type)}`).join("; ");e.push(`headers?: { ${p} }`)}t.requestBodyType&&e.push(`body: ${$(t.requestBodyType)}`);const l=$(t.responseType),f=t.responseType.kind==="model"?`Models.${l}`:l;r+=`  async ${t.operationId}(${e.join(", ")}): Promise<${f}> {
`;let d=t.path;i.forEach(p=>{d=d.replace(`{${p.name}}`,`\${${p.name}}`)});const h=[];h.push(`'${t.method}'`),h.push(`\`${d}\``),h.push(a.length>0?"query":"undefined"),h.push(t.requestBodyType?"body":"undefined"),c.length>0&&h.push("headers"),r+=`    return this.request<${f}>(${h.join(", ")});
`,r+=`  }

`}return r+=`}
`,r}function se(n){const o=re(n.models),s=ne(n),r=`export * from './client.js';
export * from './models.js';
`,t=`{
  "name": "${n.title.toLowerCase()}-sdk",
  "version": "${n.version}",
  "description": "TypeScript SDK for ${n.title}",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc"
  },
  "devDependencies": {
    "typescript": "^5.4.5"
  }
}`;return[{path:"src/models.ts",content:o},{path:"src/client.ts",content:s},{path:"src/index.ts",content:r},{path:"package.json",content:t},{path:"tsconfig.json",content:`{
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
}`}]}function T(n){switch(n.kind){case"primitive":return n.name==="integer"?"int":n.name==="number"?"float":n.name==="boolean"?"bool":n.name==="string"?"str":"Any";case"model":return`"${n.name}"`;case"array":return`List[${T(n.itemType)}]`;case"map":return`Dict[str, ${T(n.valueType)}]`;default:return"Any"}}function oe(n){let o=`from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

`;for(const s of n){if(o+=`class ${s.name}(BaseModel):
`,s.description&&(o+=`    """
    ${s.description}
    """
`),s.properties.length===0){o+=`    pass

`;continue}for(const r of s.properties){const t=T(r.type),e=r.required,i=[];r.description&&i.push(`description="${r.description.replace(/"/g,'\\"')}"`);const a=i.length>0?` = Field(${i.join(", ")})`:"";e?o+=`    ${r.name}: ${t}${a}
`:o+=`    ${r.name}: Optional[${t}] = None
`}o+=`
`}return o}function ie(n){const o=Object.keys(n.securitySchemes).length>0,s=n.servers[0]||"https://api.example.com";let r=`import requests
from typing import List, Dict, Any, Optional
from . import models

`;if(r+=`class ${n.title}Client:
`,r+=`    def __init__(
`,r+=`        self,
`,r+=`        base_url: str = "${s}",
`,r+=`        headers: Optional[Dict[str, str]] = None,
`,o&&(r+=`        token: Optional[str] = None,
`),r+=`    ):
`,r+=`        self.base_url = base_url.rstrip("/")
`,r+=`        self.headers = {"Content-Type": "application/json"}
`,r+=`        if headers:
`,r+=`            self.headers.update(headers)
`,o&&(r+=`        self.token = token
`),r+=`
`,r+=`    def _request(
`,r+=`        self,
`,r+=`        method: str,
`,r+=`        path: str,
`,r+=`        params: Optional[Dict[str, Any]] = None,
`,r+=`        json: Optional[Any] = None,
`,r+=`        headers: Optional[Dict[str, str]] = None,
`,r+=`    ) -> Any:
`,r+=`        url = f"{self.base_url}{path}"
`,r+=`        req_headers = self.headers.copy()
`,r+=`        if headers:
`,r+=`            req_headers.update(headers)

`,o){const t=Object.entries(n.securitySchemes).find(([i,a])=>a.type==="apiKey"),e=Object.entries(n.securitySchemes).find(([i,a])=>a.type==="http");if(r+=`        if self.token:
`,t){const i=t[1];i.in==="header"?r+=`            req_headers["${i.name||"X-API-Key"}"] = self.token
`:i.in==="query"&&(r+=`            params = params or {}
`,r+=`            params["${i.name||"api_key"}"] = self.token
`)}else e&&e[1].scheme,r+=`            req_headers["Authorization"] = f"Bearer {self.token}"
`}r+=`
`,r+=`        response = requests.request(
`,r+=`            method=method,
`,r+=`            url=url,
`,r+=`            params=params,
`,r+=`            json=json,
`,r+=`            headers=req_headers,
`,r+=`        )

`,r+=`        if not response.ok:
`,r+=`            raise Exception(f"HTTP {response.status_code}: {response.text}")

`,r+=`        if response.status_code == 204:
`,r+=`            return {}
`,r+=`        return response.json()

`;for(const t of n.endpoints){let e="";(t.summary||t.description)&&(e+=`        """
`,t.summary&&(e+=`        ${t.summary}
`),t.description&&(e+=`        ${t.description}
`),e+=`        """
`);const i=t.operationId.replace(/([A-Z])/g,"_$1").toLowerCase().replace(/_+/g,"_"),a=["self"],c=t.parameters.filter(p=>p.in==="path");for(const p of c)a.push(`${p.name}: ${T(p.type).replace(/"/g,"")}`);const l=t.parameters.filter(p=>p.in==="query");l.length>0&&a.push("query: Optional[Dict[str, Any]] = None");const f=t.parameters.filter(p=>p.in==="header");if(f.length>0&&a.push("headers: Optional[Dict[str, str]] = None"),t.requestBodyType){const p=T(t.requestBodyType).replace(/"/g,""),u=t.requestBodyType.kind==="model"?`models.${p}`:p;a.push(`body: ${u}`)}r+=`    def ${i}(self, ${a.join(", ")}) -> Any:
`,e&&(r+=e);let d=t.path;c.forEach(p=>{d=d.replace(`{${p.name}}`,`{${p.name}}`)});const h=[];h.push(`method="${t.method}"`),h.push(`path=f"${d}"`),h.push(l.length>0?"params=query":"params=None"),t.requestBodyType?t.requestBodyType.kind==="model"?h.push("json=body.model_dump()"):h.push("json=body"):h.push("json=None"),f.length>0&&h.push("headers=headers"),r+=`        res = self._request(${h.join(", ")})
`,t.responseType.kind==="model"?r+=`        return models.${t.responseType.name}(**res)
`:r+=`        return res
`,r+=`
`}return r}function ae(n){const o=oe(n.models),s=ie(n),r=`from .client import ${n.title}Client
from .models import *
`,t=`[tool.poetry]
name = "${n.title.toLowerCase()}-sdk"
version = "${n.version}"
description = "Python SDK for ${n.title}"
authors = ["Frankstop <frank@example.com>"]

[tool.poetry.dependencies]
python = "^3.9"
requests = "^2.31.0"
pydantic = "^2.7.0"
`;return[{path:"src/__init__.py",content:r},{path:"src/models.py",content:o},{path:"src/client.py",content:s},{path:"pyproject.toml",content:t}]}function v(n){switch(n.kind){case"primitive":return n.name==="integer"?"int":n.name==="number"?"float64":n.name==="boolean"?"bool":n.name==="string"?"string":"any";case"model":return n.name;case"array":return`[]${v(n.itemType)}`;case"map":return`map[string]${v(n.valueType)}`;default:return"any"}}function w(n){return n?n.charAt(0).toUpperCase()+n.slice(1):""}function pe(n,o){let s=`package ${n}

`;for(const r of o){r.description&&(s+=`// ${r.name} - ${r.description}
`),s+=`type ${r.name} struct {
`;for(const t of r.properties){const e=w(t.name),i=v(t.type),a=t.required?t.name:`${t.name},omitempty`;t.description&&(s+=`	// ${t.description}
`),s+=`	${e} ${i} \`json:"${a}"\`
`}s+=`}

`}return s}function ce(n,o){const s=Object.keys(o.securitySchemes).length>0,r=o.servers[0]||"https://api.example.com",t=`${o.title}Client`;let e=`package ${n}

`;if(e+=`import (
`,e+=`	"bytes"
`,e+=`	"context"
`,e+=`	"encoding/json"
`,e+=`	"fmt"
`,e+=`	"io"
`,e+=`	"net/http"
`,e+=`	"net/url"
`,e+=`	"strings"
`,e+=`	"time"
`,e+=`)

`,e+=`type ClientConfig struct {
`,e+=`	BaseURL    string
`,e+=`	HTTPClient *http.Client
`,s&&(e+=`	Token      string
`),e+=`}

`,e+=`type ${t} struct {
`,e+=`	baseURL    string
`,e+=`	httpClient *http.Client
`,s&&(e+=`	token      string
`),e+=`}

`,e+=`func NewClient(config ClientConfig) *${t} {
`,e+=`	baseURL := config.BaseURL
`,e+=`	if baseURL == "" {
`,e+=`		baseURL = "${r}"
`,e+=`	}
`,e+=`	httpClient := config.HTTPClient
`,e+=`	if httpClient == nil {
`,e+=`		httpClient = &http.Client{
`,e+=`			Timeout: 30 * time.Second,
`,e+=`		}
`,e+=`	}
`,e+=`	return &${t}{
`,e+=`		baseURL:    strings.TrimSuffix(baseURL, "/"),
`,e+=`		httpClient: httpClient,
`,s&&(e+=`		token:      config.Token,
`),e+=`	}
`,e+=`}

`,e+=`func (c *${t}) doRequest(ctx context.Context, method, path string, query url.Values, body any, headers map[string]string) ([]byte, error) {
`,e+=`	fullURL := c.baseURL + path
`,e+=`	if len(query) > 0 {
`,e+=`		fullURL += "?" + query.Encode()
`,e+=`	}

`,e+=`	var bodyReader io.Reader
`,e+=`	if body != nil {
`,e+=`		jsonBytes, err := json.Marshal(body)
`,e+=`		if err != nil {
`,e+=`			return nil, fmt.Errorf("failed to marshal request body: %w", err)
`,e+=`		}
`,e+=`		bodyReader = bytes.NewReader(jsonBytes)
`,e+=`	}

`,e+=`	req, err := http.NewRequestWithContext(ctx, method, fullURL, bodyReader)
`,e+=`	if err != nil {
`,e+=`		return nil, fmt.Errorf("failed to create HTTP request: %w", err)
`,e+=`	}

`,e+=`	req.Header.Set("Content-Type", "application/json")
`,e+=`	for k, v := range headers {
`,e+=`		req.Header.Set(k, v)
`,e+=`	}

`,s){const i=Object.entries(o.securitySchemes).find(([c,l])=>l.type==="apiKey"),a=Object.entries(o.securitySchemes).find(([c,l])=>l.type==="http");if(e+=`	if c.token != "" {
`,i){const c=i[1];c.in==="header"?e+=`		req.Header.Set("${c.name||"X-API-Key"}", c.token)
`:c.in==="query"&&(e+=`		q := req.URL.Query()
`,e+=`		q.Set("${c.name||"api-key"}", c.token)
`,e+=`		req.URL.RawQuery = q.Encode()
`)}else a&&a[1].scheme,e+=`		req.Header.Set("Authorization", "Bearer "+c.token)
`;e+=`	}

`}e+=`	resp, err := c.httpClient.Do(req)
`,e+=`	if err != nil {
`,e+=`		return nil, fmt.Errorf("HTTP request failed: %w", err)
`,e+=`	}
`,e+=`	defer resp.Body.Close()

`,e+=`	respBody, err := io.ReadAll(resp.Body)
`,e+=`	if err != nil {
`,e+=`		return nil, fmt.Errorf("failed to read response body: %w", err)
`,e+=`	}

`,e+=`	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
`,e+=`		return nil, fmt.Errorf("HTTP error %d: %s", resp.StatusCode, string(respBody))
`,e+=`	}

`,e+=`	return respBody, nil
`,e+=`}

`;for(const i of o.endpoints){(i.summary||i.description)&&(e+=`// ${i.operationId} - `,i.summary?e+=`${i.summary}
`:i.description&&(e+=`${i.description}
`));const a=i.parameters.filter(y=>y.in==="path"),c=i.parameters.filter(y=>y.in==="query"),l=i.parameters.filter(y=>y.in==="header"),f=["ctx context.Context"];if(a.forEach(y=>{f.push(`${y.name} ${v(y.type)}`)}),c.length>0){const y=c.map(g=>`${w(g.name)} ${v(g.type)}`).join(`
		`);f.push(`query struct {
		${y}
	}`)}i.requestBodyType&&f.push(`body ${v(i.requestBodyType)}`);const d=v(i.responseType),h=d==="any"?"any":`*${d}`;e+=`func (c *${t}) ${w(i.operationId)}(${f.join(", ")}) (${h}, error) {
`;let p=i.path;if(a.forEach(y=>{p=p.replace(`{${y.name}}`,'"%v"')}),a.length>0){const y=a.map(g=>g.name).join(", ");e+=`	resolvedPath := fmt.Sprintf("${p}", ${y})
`}else e+=`	resolvedPath := "${p}"
`;c.length>0?(e+=`	queryParams := url.Values{}
`,c.forEach(y=>{const g=w(y.name);y.type.name==="string"?(e+=`	if query.${g} != "" {
`,e+=`		queryParams.Set("${y.name}", query.${g})
`,e+=`	}
`):y.type.name==="boolean"?e+=`	queryParams.Set("${y.name}", fmt.Sprintf("%t", query.${g}))
`:e+=`	queryParams.Set("${y.name}", fmt.Sprintf("%v", query.${g}))
`})):e+=`	var queryParams url.Values
`,l.length>0?e+=`	headerParams := make(map[string]string)
`:e+=`	var headerParams map[string]string
`;const u=i.requestBodyType?"body":"nil";e+=`	respBytes, err := c.doRequest(ctx, "${i.method}", resolvedPath, queryParams, ${u}, headerParams)
`,e+=`	if err != nil {
`,e+=`		return nil, err
`,e+=`	}

`,d==="any"?(e+=`	var result any
`,e+=`	if len(respBytes) > 0 {
`,e+=`		if err := json.Unmarshal(respBytes, &result); err != nil {
`,e+=`			return nil, fmt.Errorf("failed to unmarshal response: %w", err)
`,e+=`		}
`,e+=`	}
`,e+=`	return result, nil
`):(e+=`	var result ${d}
`,e+=`	if len(respBytes) > 0 {
`,e+=`		if err := json.Unmarshal(respBytes, &result); err != nil {
`,e+=`			return nil, fmt.Errorf("failed to unmarshal response: %w", err)
`,e+=`		}
`,e+=`	}
`,e+=`	return &result, nil
`),e+=`}

`}return e}function le(n){const o=n.title.toLowerCase(),s=pe(o,n.models),r=ce(o,n),t=`module github.com/frankstop/SDKGenerator/generated/go/${o}

go 1.21
`;return[{path:"models.go",content:s},{path:"client.go",content:r},{path:"go.mod",content:t}]}function ue(n){return n.charAt(0).toUpperCase()+n.slice(1)}function de(n,o){var r;let s=`module ${n}
`;s+=`  module Models

`;for(const t of o){s+=`    # ${t.description||"API Model"}
`,s+=`    class ${t.name}
`;const e=t.properties.map(i=>`:${i.name}`);s+=`      attr_accessor ${e.join(", ")}

`,s+=`      # @param params [Hash]
`,s+=`      def initialize(params = {})
`;for(const i of t.properties)s+=`        @${i.name} = params[:${i.name}] || params['${i.name}']
`;s+=`      end

`,s+=`      # @return [Hash]
`,s+=`      def to_h
`,s+=`        {
`;for(const i of t.properties)i.type.kind==="model"?s+=`          ${i.name}: @${i.name}&.to_h,
`:i.type.kind==="array"&&((r=i.type.itemType)==null?void 0:r.kind)==="model"?s+=`          ${i.name}: @${i.name}&.map(&:to_h),
`:s+=`          ${i.name}: @${i.name},
`;s+=`        }
`,s+=`      end
`,s+=`    end

`}return s+=`  end
`,s+=`end
`,s}function me(n,o){const s=Object.keys(o.securitySchemes).length>0,r=o.servers[0]||"https://api.example.com";`${o.title}`;let t=`require 'net/http'
`;if(t+=`require 'uri'
`,t+=`require 'json'
`,t+=`require_relative 'models'

`,t+=`module ${n}
`,t+=`  class Client
`,t+=`    # @param base_url [String]
`,s&&(t+=`    # @param token [String]
`),t+=`    def initialize(base_url: '${r}', token: nil)
`,t+=`      @base_uri = URI.parse(base_url.end_with?('/') ? base_url : "#{base_url}/")
`,s&&(t+=`      @token = token
`),t+=`    end

`,t+=`    private

`,t+=`    def make_request(method, path, query = nil, body = nil, headers = nil)
`,t+=`      uri = @base_uri.join(path.start_with?('/') ? path[1..-1] : path)
`,t+=`      uri.query = URI.encode_www_form(query) if query && !query.empty?

`,t+=`      http = Net::HTTP.new(uri.host, uri.port)
`,t+=`      http.use_ssl = (uri.scheme == 'https')

`,t+=`      req_headers = { 'Content-Type' => 'application/json' }
`,t+=`      req_headers.merge!(headers) if headers

`,s){const e=Object.entries(o.securitySchemes).find(([a,c])=>c.type==="apiKey"),i=Object.entries(o.securitySchemes).find(([a,c])=>c.type==="http");if(t+=`      if @token
`,e){const a=e[1];a.in==="header"?t+=`        req_headers['${a.name||"X-API-Key"}'] = @token
`:a.in==="query"&&(t+=`        uri.query = [uri.query, "${a.name||"api_key"}=#{@token}"].compact.join('&')
`)}else i&&i[1].scheme,t+=`        req_headers['Authorization'] = "Bearer #{@token}"
`;t+=`      end

`}t+=`      case method.to_s.upcase
`,t+=`      when 'GET'
`,t+=`        request = Net::HTTP::Get.new(uri.request_uri, req_headers)
`,t+=`      when 'POST'
`,t+=`        request = Net::HTTP::Post.new(uri.request_uri, req_headers)
`,t+=`        request.body = body.is_a?(Hash) ? body.to_json : body if body
`,t+=`      when 'PUT'
`,t+=`        request = Net::HTTP::Put.new(uri.request_uri, req_headers)
`,t+=`        request.body = body.is_a?(Hash) ? body.to_json : body if body
`,t+=`      when 'DELETE'
`,t+=`        request = Net::HTTP::Delete.new(uri.request_uri, req_headers)
`,t+=`      when 'PATCH'
`,t+=`        request = Net::HTTP::Patch.new(uri.request_uri, req_headers)
`,t+=`        request.body = body.is_a?(Hash) ? body.to_json : body if body
`,t+=`      else
`,t+=`        raise ArgumentError, "Unsupported method: #{method}"
`,t+=`      end

`,t+=`      response = http.request(request)

`,t+=`      unless response.is_a?(Net::HTTPSuccess)
`,t+=`        raise "HTTP Error #{response.code}: #{response.body}"
`,t+=`      end

`,t+=`      return {} if response.code == '204' || response.body.nil? || response.body.empty?
`,t+=`      JSON.parse(response.body)
`,t+=`    end

`,t+=`    public

`;for(const e of o.endpoints){(e.summary||e.description)&&(t+=`    # ${e.summary||""}
`,e.description&&(t+=`    # ${e.description}
`));const i=e.parameters.filter(u=>u.in==="path"),a=e.parameters.filter(u=>u.in==="query"),c=e.parameters.filter(u=>u.in==="header"),l=[];i.forEach(u=>{l.push(`${u.name}`)}),a.length>0&&l.push("query: nil"),e.requestBodyType&&l.push("body: nil"),c.length>0&&l.push("headers: nil");const f=l.length>0?`(${l.join(", ")})`:"",d=e.operationId.replace(/([A-Z])/g,"_$1").toLowerCase().replace(/_+/g,"_");t+=`    def ${d}${f}
`;let h=e.path;i.forEach(u=>{h=h.replace(`{${u.name}}`,`#{${u.name}}`)});const p=[];p.push(`'${e.method}'`),p.push(`"${h}"`),p.push(a.length>0?"query":"nil"),e.requestBodyType?e.requestBodyType.kind==="model"?p.push("body.to_h"):p.push("body"):p.push("nil"),c.length>0&&p.push("headers"),t+=`      res = make_request(${p.join(", ")})
`,e.responseType.kind==="model"?t+=`      Models::${e.responseType.name}.new(res)
`:t+=`      res
`,t+=`    end

`}return t+=`  end
`,t+=`end
`,t}function he(n){const o=ue(n.title),s=de(o,n.models),r=me(o,n),t=`require_relative '${n.title.toLowerCase()}/client'
require_relative '${n.title.toLowerCase()}/models'
`,e=`Gem::Specification.new do |s|
  s.name        = '${n.title.toLowerCase()}_sdk'
  s.version     = '${n.version}'
  s.summary     = "Ruby SDK for ${n.title}"
  s.authors     = ["Frankstop"]
  s.files       = ["lib/${n.title.toLowerCase()}.rb", "lib/${n.title.toLowerCase()}/client.rb", "lib/${n.title.toLowerCase()}/models.rb"]
  s.require_paths = ["lib"]
  s.add_runtime_dependency "json"
end
`;return[{path:`lib/${n.title.toLowerCase()}.rb`,content:t},{path:`lib/${n.title.toLowerCase()}/models.rb`,content:s},{path:`lib/${n.title.toLowerCase()}/client.rb`,content:r},{path:`${n.title.toLowerCase()}_sdk.gemspec`,content:e}]}function b(n){switch(n.kind){case"primitive":return n.name==="integer"?"Integer":n.name==="number"?"Double":n.name==="boolean"?"Boolean":n.name==="string"?"String":"Object";case"model":return n.name;case"array":return`List<${b(n.itemType)}>`;case"map":return`Map<String, ${b(n.valueType)}>`;default:return"Object"}}function fe(n,o){let s=`package ${n}.models;

`;s+=`import java.util.List;
`,s+=`import java.util.Map;

`,o.description&&(s+=`/**
 * ${o.description}
 */
`),s+=`public class ${o.name} {
`;for(const r of o.properties)s+=`    private ${b(r.type)} ${r.name};
`;if(s+=`
`,s+=`    public ${o.name}() {}

`,o.properties.length>0){const r=o.properties.map(t=>`${b(t.type)} ${t.name}`).join(", ");s+=`    public ${o.name}(${r}) {
`;for(const t of o.properties)s+=`        this.${t.name} = ${t.name};
`;s+=`    }

`}for(const r of o.properties){const t=r.name.charAt(0).toUpperCase()+r.name.slice(1),e=b(r.type);s+=`    public ${e} get${t}() {
`,s+=`        return this.${r.name};
`,s+=`    }

`,s+=`    public void set${t}(${e} ${r.name}) {
`,s+=`        this.${r.name} = ${r.name};
`,s+=`    }

`}s+=`    public static Builder builder() {
`,s+=`        return new Builder();
`,s+=`    }

`,s+=`    public static class Builder {
`,s+=`        private final ${o.name} instance = new ${o.name}();

`;for(const r of o.properties){const t=b(r.type);s+=`        public Builder ${r.name}(${t} ${r.name}) {
`,s+=`            instance.set${r.name.charAt(0).toUpperCase()+r.name.slice(1)}(${r.name});
`,s+=`            return this;
`,s+=`        }

`}return s+=`        public ${o.name} build() {
`,s+=`            return instance;
`,s+=`        }
`,s+=`    }
`,s+=`}
`,s}function ye(n,o){const s=Object.keys(o.securitySchemes).length>0,r=o.servers[0]||"https://api.example.com",t=`${o.title}Client`;let e=`package ${n};

`;if(e+=`import java.net.URI;
`,e+=`import java.net.URLEncoder;
`,e+=`import java.net.http.HttpClient;
`,e+=`import java.net.http.HttpRequest;
`,e+=`import java.net.http.HttpResponse;
`,e+=`import java.nio.charset.StandardCharsets;
`,e+=`import java.time.Duration;
`,e+=`import java.util.HashMap;
`,e+=`import java.util.List;
`,e+=`import java.util.Map;
`,e+=`import java.util.stream.Collectors;
`,e+=`import ${n}.models.*;

`,e+=`public class ${t} {
`,e+=`    private final String baseUrl;
`,e+=`    private final HttpClient httpClient;
`,s&&(e+=`    private final String token;
`),e+=`
`,e+=`    public ${t}(String baseUrl, String token) {
`,e+=`        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
`,e+=`        this.httpClient = HttpClient.newBuilder()
`,e+=`                .connectTimeout(Duration.ofSeconds(30))
`,e+=`                .build();
`,s&&(e+=`        this.token = token;
`),e+=`    }

`,e+=`    public ${t}(String baseUrl) {
`,e+=`        this(baseUrl, null);
`,e+=`    }

`,e+=`    public ${t}() {
`,e+=`        this("${r}", null);
`,e+=`    }

`,e+=`    private String sendRequest(String method, String path, Map<String, String> query, String body, Map<String, String> headers) throws Exception {
`,e+=`        StringBuilder urlBuilder = new StringBuilder(this.baseUrl + path);
`,e+=`        if (query != null && !query.isEmpty()) {
`,e+=`            String queryParams = query.entrySet().stream()
`,e+=`                    .map(e -> URLEncoder.encode(e.getKey(), StandardCharsets.UTF_8) + "=" + URLEncoder.encode(e.getValue(), StandardCharsets.UTF_8))
`,e+=`                    .collect(Collectors.joining("&"));
`,e+=`            urlBuilder.append("?").append(queryParams);
`,e+=`        }

`,e+=`        HttpRequest.Builder reqBuilder = HttpRequest.newBuilder()
`,e+=`                .uri(URI.create(urlBuilder.toString()))
`,e+=`                .header("Content-Type", "application/json");

`,e+=`        if (headers != null) {
`,e+=`            headers.forEach(reqBuilder::header);
`,e+=`        }

`,s){const i=Object.entries(o.securitySchemes).find(([c,l])=>l.type==="apiKey"),a=Object.entries(o.securitySchemes).find(([c,l])=>l.type==="http");if(e+=`        if (this.token != null && !this.token.isEmpty()) {
`,i){const c=i[1];c.in==="header"?e+=`            reqBuilder.header("${c.name||"X-API-Key"}", this.token);
`:c.in==="query"&&(e+=`            reqBuilder.header("${c.name||"X-API-Key"}", this.token);
`)}else a&&a[1].scheme,e+=`            reqBuilder.header("Authorization", "Bearer " + this.token);
`;e+=`        }

`}e+=`        HttpRequest.BodyPublisher bodyPublisher = (body != null) ? HttpRequest.BodyPublishers.ofString(body) : HttpRequest.BodyPublishers.noBody();
`,e+=`        reqBuilder.method(method, bodyPublisher);

`,e+=`        HttpResponse<String> response = this.httpClient.send(reqBuilder.build(), HttpResponse.BodyHandlers.ofString());

`,e+=`        if (response.statusCode() < 200 || response.statusCode() >= 300) {
`,e+=`            throw new RuntimeException("HTTP Error " + response.statusCode() + ": " + response.body());
`,e+=`        }

`,e+=`        return response.body();
`,e+=`    }

`;for(const i of o.endpoints){(i.summary||i.description)&&(e+=`    /**
`,i.summary&&(e+=`     * ${i.summary}
`),i.description&&(e+=`     * ${i.description}
`),e+=`     */
`);const a=i.parameters.filter(u=>u.in==="path"),c=i.parameters.filter(u=>u.in==="query"),l=[];a.forEach(u=>{l.push(`${b(u.type)} ${u.name}`)}),c.length>0&&l.push("Map<String, String> query"),i.requestBodyType&&l.push(`${b(i.requestBodyType)} body`),e+=`    public String ${i.operationId}(${l.join(", ")}) throws Exception {
`;let f=i.path;a.forEach(u=>{f=f.replace(`{${u.name}}`,`" + ${u.name} + "`)});let d=`"${f}"`;d.endsWith(' + ""')&&(d=d.substring(0,d.length-5)),d.startsWith('"" + ')&&(d=d.substring(5)),e+=`        String resolvedPath = ${d};
`;const h=c.length>0?"query":"null",p=i.requestBodyType?"body.toString()":"null";e+=`        return sendRequest("${i.method}", resolvedPath, ${h}, ${p}, null);
`,e+=`    }

`}return e+=`}
`,e}function ge(n){const o="com.frankstop",s=n.title.toLowerCase(),r=[];for(const i of n.models){const a=fe(`${o}.${s}`,i);r.push({path:`src/main/java/com/frankstop/${s}/models/${i.name}.java`,content:a})}const t=ye(`${o}.${s}`,n);r.push({path:`src/main/java/com/frankstop/${s}/${n.title}Client.java`,content:t});const e=`<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.frankstop</groupId>
    <artifactId>${n.title.toLowerCase()}-sdk</artifactId>
    <version>${n.version}</version>
    <properties>
        <maven.compiler.source>11</maven.compiler.source>
        <maven.compiler.target>11</maven.compiler.target>
    </properties>
</project>
`;return r.push({path:"pom.xml",content:e}),r}function $e(n,o){const s=o.toLowerCase().trim();switch(s){case"typescript":case"ts":return se(n);case"python":case"py":return ae(n);case"go":case"golang":return le(n);case"ruby":case"rb":return he(n);case"java":return ge(n);default:throw new Error(`Unsupported target language: "${s}". Supported: ts, python, go, ruby, java.`)}}const L={petstore:`{
  "openapi": "3.0.0",
  "info": {
    "title": "PetstoreAPI",
    "version": "1.0.0",
    "description": "A beautiful JSON specification representing a Petstore management catalog."
  },
  "servers": [
    { "url": "https://petstore.swagger.io/v2" }
  ],
  "components": {
    "securitySchemes": {
      "ApiKeyAuth": {
        "type": "apiKey",
        "in": "header",
        "name": "X-API-KEY"
      }
    },
    "schemas": {
      "Pet": {
        "type": "object",
        "required": ["id", "name"],
        "properties": {
          "id": { "type": "integer", "description": "Unique identifier of the pet" },
          "name": { "type": "string", "description": "Display name of the pet" },
          "category": { "type": "string", "description": "Species category group" },
          "status": { "type": "string", "description": "Availability state" }
        }
      },
      "Error": {
        "type": "object",
        "required": ["code", "message"],
        "properties": {
          "code": { "type": "integer" },
          "message": { "type": "string" }
        }
      }
    }
  },
  "paths": {
    "/pets": {
      "get": {
        "summary": "List all pets",
        "operationId": "listPets",
        "parameters": [
          { "name": "limit", "in": "query", "required": false, "schema": { "type": "integer" } }
        ],
        "responses": {
          "200": {
            "description": "A successful list of pets",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": { "$ref": "#/components/schemas/Pet" }
                }
              }
            }
          }
        }
      },
      "post": {
        "summary": "Create a new pet",
        "operationId": "createPet",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": { "$ref": "#/components/schemas/Pet" }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Pet created successfully",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/Pet" }
              }
            }
          }
        }
      }
    },
    "/pets/{id}": {
      "get": {
        "summary": "Get pet by ID",
        "operationId": "getPetById",
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": {
            "description": "Successful retrieval of pet details",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/Pet" }
              }
            }
          }
        }
      }
    }
  }
}`,"user-api":`{
  "openapi": "3.0.1",
  "info": {
    "title": "UserManagementAPI",
    "version": "2.1.0",
    "description": "An administrative client directory for profile records, access levels, and logs."
  },
  "servers": [
    { "url": "https://api.frankstop.com/v1" }
  ],
  "components": {
    "securitySchemes": {
      "BearerAuth": {
        "type": "http",
        "scheme": "bearer"
      }
    },
    "schemas": {
      "UserProfile": {
        "type": "object",
        "required": ["uid", "email", "role"],
        "properties": {
          "uid": { "type": "string", "description": "Globally unique ID of the system user" },
          "email": { "type": "string" },
          "role": { "type": "string", "description": "Authorized role e.g. admin, manager" },
          "avatarUrl": { "type": "string", "description": "Custom user profile picture" }
        }
      }
    }
  },
  "paths": {
    "/profiles/me": {
      "get": {
        "summary": "Get current session profile",
        "operationId": "getCurrentUser",
        "responses": {
          "200": {
            "description": "Your current profile schema",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/UserProfile" }
              }
            }
          }
        }
      }
    },
    "/profiles/{uid}": {
      "put": {
        "summary": "Update specific profile settings",
        "operationId": "updateProfile",
        "parameters": [
          { "name": "uid", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": { "$ref": "#/components/schemas/UserProfile" }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Updated profile successfully",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/UserProfile" }
              }
            }
          }
        }
      }
    }
  }
}`,minimal:`{
  "openapi": "3.0.0",
  "info": {
    "title": "AuthService",
    "version": "1.0.0",
    "description": "Minimal auth microservice providing JWT token authorization exchange."
  },
  "servers": [
    { "url": "https://auth.internal.net" }
  ],
  "components": {
    "schemas": {
      "AuthRequest": {
        "type": "object",
        "required": ["username", "password"],
        "properties": {
          "username": { "type": "string" },
          "password": { "type": "string" }
        }
      },
      "AuthResponse": {
        "type": "object",
        "required": ["token", "expiresIn"],
        "properties": {
          "token": { "type": "string" },
          "expiresIn": { "type": "integer" }
        }
      }
    }
  },
  "paths": {
    "/auth/token": {
      "post": {
        "summary": "Exchange credentials for JWT token",
        "operationId": "exchangeToken",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": { "$ref": "#/components/schemas/AuthRequest" }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Token granted successfully",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/AuthResponse" }
              }
            }
          }
        }
      }
    }
  }
}`};let V="ts",E=null,W=[],q="";const B=document.getElementById("spec-editor"),K=document.getElementById("sample-spec-select"),U=document.getElementById("parse-status-bar"),D=U.querySelector(".status-icon"),z=document.getElementById("status-message"),F=document.querySelectorAll(".tab-btn"),be=document.querySelector(".tabs-nav"),G=document.getElementById("generated-files-list"),x=document.getElementById("code-viewer"),qe=document.getElementById("copy-code-btn"),J=document.getElementById("copy-toast");K.addEventListener("change",()=>{const n=K.value;L[n]&&(B.value=L[n],I())});B.addEventListener("input",()=>{I()});B.value=L.petstore;I();function I(){const n=B.value;try{const o=JSON.parse(n),s=te(o);E=s,U.className="status-bar status-success",D.textContent="✔",z.textContent=`Parsed successfully! "${s.title}" v${s.version} (${s.models.length} Models, ${s.endpoints.length} Endpoints)`,Z()}catch(o){U.className="status-bar status-error",D.textContent="✖",z.textContent=`Parsing Error: ${o.message}`}}F.forEach((n,o)=>{n.addEventListener("click",()=>{F.forEach(s=>s.classList.remove("active")),n.classList.add("active"),be.setAttribute("data-active-tab",String(o)),V=n.getAttribute("data-lang")||"ts",Z()})});function Z(){if(E)try{const n=$e(E,V);if(W=n,G.innerHTML="",n.length===0){x.textContent="No files generated.";return}n.forEach((s,r)=>{const t=document.createElement("li");t.className="file-item",r===0&&(!q||!n.find(e=>e.path===q))&&(q=s.path),s.path===q&&t.classList.add("active"),t.innerHTML=`
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
        <span>${s.path.split("/").pop()}</span>
      `,t.addEventListener("click",()=>{document.querySelectorAll(".file-item").forEach(e=>e.classList.remove("active")),t.classList.add("active"),q=s.path,X(s.content)}),G.appendChild(t)});const o=n.find(s=>s.path===q)||n[0];o&&X(o.content)}catch(n){x.textContent=`Generator Error: ${n.message}`}}function X(n){const o=n.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");x.innerHTML=o}qe.addEventListener("click",()=>{const n=W.find(o=>o.path===q);n&&navigator.clipboard.writeText(n.content).then(()=>{J.classList.add("show"),setTimeout(()=>{J.classList.remove("show")},2500)}).catch(o=>{console.error("Failed to copy code: ",o)})});
