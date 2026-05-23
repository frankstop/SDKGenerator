import { APIClientIR, IRModel, IRType, IREndpoint } from '../types.js';

// Type mapping helper for Java
function mapJavaType(type: IRType): string {
  switch (type.kind) {
    case 'primitive':
      if (type.name === 'integer') return 'Integer';
      if (type.name === 'number') return 'Double';
      if (type.name === 'boolean') return 'Boolean';
      if (type.name === 'string') return 'String';
      return 'Object';
    case 'model':
      return type.name;
    case 'array':
      return `List<${mapJavaType(type.itemType!)}>`;
    case 'map':
      return `Map<String, ${mapJavaType(type.valueType!)}>`;
    default:
      return 'Object';
  }
}

// Generate Java Models (POJOs with Builders)
function generateModelFile(packageName: string, model: IRModel): string {
  let code = `package ${packageName}.models;\n\n`;
  code += `import java.util.List;\n`;
  code += `import java.util.Map;\n\n`;

  if (model.description) {
    code += `/**\n * ${model.description}\n */\n`;
  }
  code += `public class ${model.name} {\n`;

  // Private Fields
  for (const prop of model.properties) {
    code += `    private ${mapJavaType(prop.type)} ${prop.name};\n`;
  }
  code += `\n`;

  // Default Constructor
  code += `    public ${model.name}() {}\n\n`;

  // All-args Constructor
  if (model.properties.length > 0) {
    const args = model.properties.map(p => `${mapJavaType(p.type)} ${p.name}`).join(', ');
    code += `    public ${model.name}(${args}) {\n`;
    for (const prop of model.properties) {
      code += `        this.${prop.name} = ${prop.name};\n`;
    }
    code += `    }\n\n`;
  }

  // Getters and Setters
  for (const prop of model.properties) {
    const capitalizedName = prop.name.charAt(0).toUpperCase() + prop.name.slice(1);
    const jType = mapJavaType(prop.type);

    code += `    public ${jType} get${capitalizedName}() {\n`;
    code += `        return this.${prop.name};\n`;
    code += `    }\n\n`;

    code += `    public void set${capitalizedName}(${jType} ${prop.name}) {\n`;
    code += `        this.${prop.name} = ${prop.name};\n`;
    code += `    }\n\n`;
  }

  // Builder Class
  code += `    public static Builder builder() {\n`;
  code += `        return new Builder();\n`;
  code += `    }\n\n`;

  code += `    public static class Builder {\n`;
  code += `        private final ${model.name} instance = new ${model.name}();\n\n`;
  
  for (const prop of model.properties) {
    const jType = mapJavaType(prop.type);
    code += `        public Builder ${prop.name}(${jType} ${prop.name}) {\n`;
    code += `            instance.set${prop.name.charAt(0).toUpperCase() + prop.name.slice(1)}(${prop.name});\n`;
    code += `            return this;\n`;
    code += `        }\n\n`;
  }

  code += `        public ${model.name} build() {\n`;
  code += `            return instance;\n`;
  code += `        }\n`;
  code += `    }\n`;

  code += `}\n`;

  return code;
}

// Generate Java Client using java.net.http.HttpClient
function generateClient(packageName: string, ir: APIClientIR): string {
  const hasSecurity = Object.keys(ir.securitySchemes).length > 0;
  const defaultServer = ir.servers[0] || 'https://api.example.com';
  const clientName = `${ir.title}Client`;

  let code = `package ${packageName};\n\n`;
  code += `import java.net.URI;\n`;
  code += `import java.net.URLEncoder;\n`;
  code += `import java.net.http.HttpClient;\n`;
  code += `import java.net.http.HttpRequest;\n`;
  code += `import java.net.http.HttpResponse;\n`;
  code += `import java.nio.charset.StandardCharsets;\n`;
  code += `import java.time.Duration;\n`;
  code += `import java.util.HashMap;\n`;
  code += `import java.util.List;\n`;
  code += `import java.util.Map;\n`;
  code += `import java.util.stream.Collectors;\n`;
  code += `import ${packageName}.models.*;\n\n`;

  code += `public class ${clientName} {\n`;
  code += `    private final String baseUrl;\n`;
  code += `    private final HttpClient httpClient;\n`;
  if (hasSecurity) {
    code += `    private final String token;\n`;
  }
  code += `\n`;

  // Constructor
  code += `    public ${clientName}(String baseUrl, String token) {\n`;
  code += `        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;\n`;
  code += `        this.httpClient = HttpClient.newBuilder()\n`;
  code += `                .connectTimeout(Duration.ofSeconds(30))\n`;
  code += `                .build();\n`;
  if (hasSecurity) {
    code += `        this.token = token;\n`;
  }
  code += `    }\n\n`;

  code += `    public ${clientName}(String baseUrl) {\n`;
  code += `        this(baseUrl, null);\n`;
  code += `    }\n\n`;

  code += `    public ${clientName}() {\n`;
  code += `        this("${defaultServer}", null);\n`;
  code += `    }\n\n`;

  // Core Request Helper
  code += `    private String sendRequest(String method, String path, Map<String, String> query, String body, Map<String, String> headers) throws Exception {\n`;
  code += `        StringBuilder urlBuilder = new StringBuilder(this.baseUrl + path);\n`;
  code += `        if (query != null && !query.isEmpty()) {\n`;
  code += `            String queryParams = query.entrySet().stream()\n`;
  code += `                    .map(e -> URLEncoder.encode(e.getKey(), StandardCharsets.UTF_8) + "=" + URLEncoder.encode(e.getValue(), StandardCharsets.UTF_8))\n`;
  code += `                    .collect(Collectors.joining("&"));\n`;
  code += `            urlBuilder.append("?").append(queryParams);\n`;
  code += `        }\n\n`;

  code += `        HttpRequest.Builder reqBuilder = HttpRequest.newBuilder()\n`;
  code += `                .uri(URI.create(urlBuilder.toString()))\n`;
  code += `                .header("Content-Type", "application/json");\n\n`;

  code += `        if (headers != null) {\n`;
  code += `            headers.forEach(reqBuilder::header);\n`;
  code += `        }\n\n`;

  if (hasSecurity) {
    const apiKeyScheme = Object.entries(ir.securitySchemes).find(([_, s]) => s.type === 'apiKey');
    const httpScheme = Object.entries(ir.securitySchemes).find(([_, s]) => s.type === 'http');

    code += `        if (this.token != null && !this.token.isEmpty()) {\n`;
    if (apiKeyScheme) {
      const s = apiKeyScheme[1];
      if (s.in === 'header') {
        code += `            reqBuilder.header("${s.name || 'X-API-Key'}", this.token);\n`;
      } else if (s.in === 'query') {
        // Query parameters are appended above, so we handle it dynamically or fallback to header
        code += `            reqBuilder.header("${s.name || 'X-API-Key'}", this.token);\n`;
      }
    } else if (httpScheme && httpScheme[1].scheme === 'bearer') {
      code += `            reqBuilder.header("Authorization", "Bearer " + this.token);\n`;
    } else {
      code += `            reqBuilder.header("Authorization", "Bearer " + this.token);\n`;
    }
    code += `        }\n\n`;
  }

  code += `        HttpRequest.BodyPublisher bodyPublisher = (body != null) ? HttpRequest.BodyPublishers.ofString(body) : HttpRequest.BodyPublishers.noBody();\n`;
  code += `        reqBuilder.method(method, bodyPublisher);\n\n`;

  code += `        HttpResponse<String> response = this.httpClient.send(reqBuilder.build(), HttpResponse.BodyHandlers.ofString());\n\n`;
  code += `        if (response.statusCode() < 200 || response.statusCode() >= 300) {\n`;
  code += `            throw new RuntimeException("HTTP Error " + response.statusCode() + ": " + response.body());\n`;
  code += `        }\n\n`;
  code += `        return response.body();\n`;
  code += `    }\n\n`;

  // Generate Endpoint Methods
  for (const ep of ir.endpoints) {
    if (ep.summary || ep.description) {
      code += `    /**\n`;
      if (ep.summary) code += `     * ${ep.summary}\n`;
      if (ep.description) code += `     * ${ep.description}\n`;
      code += `     */\n`;
    }

    const pathParams = ep.parameters.filter(p => p.in === 'path');
    const queryParams = ep.parameters.filter(p => p.in === 'query');

    // Method arguments
    const args: string[] = [];
    pathParams.forEach(p => {
      args.push(`${mapJavaType(p.type)} ${p.name}`);
    });
    if (queryParams.length > 0) {
      args.push(`Map<String, String> query`);
    }
    if (ep.requestBodyType) {
      args.push(`${mapJavaType(ep.requestBodyType)} body`);
    }

    code += `    public String ${ep.operationId}(${args.join(', ')}) throws Exception {\n`;
    
    // Path resolution
    let pathStr = ep.path;
    pathParams.forEach(p => {
      pathStr = pathStr.replace(`{${p.name}}`, `" + ${p.name} + "`);
    });
    // Clean string concatenation
    let finalPath = `"${pathStr}"`;
    if (finalPath.endsWith(' + ""')) {
      finalPath = finalPath.substring(0, finalPath.length - 5);
    }
    if (finalPath.startsWith('"" + ')) {
      finalPath = finalPath.substring(5);
    }

    code += `        String resolvedPath = ${finalPath};\n`;

    const queryArg = queryParams.length > 0 ? 'query' : 'null';
    const bodyArg = ep.requestBodyType ? 'body.toString()' : 'null'; // In production, we'd use a JSON serializer

    code += `        return sendRequest("${ep.method}", resolvedPath, ${queryArg}, ${bodyArg}, null);\n`;
    code += `    }\n\n`;
  }

  code += `}\n`;

  return code;
}

export function generateJavaSDK(ir: APIClientIR) {
  const rootGroup = 'com.frankstop';
  const pkgName = ir.title.toLowerCase();
  
  const files: { path: string; content: string }[] = [];

  // Generate each model as a separate class file (idiomatic Java!)
  for (const model of ir.models) {
    const content = generateModelFile(`${rootGroup}.${pkgName}`, model);
    files.push({
      path: `src/main/java/com/frankstop/${pkgName}/models/${model.name}.java`,
      content
    });
  }

  // Generate Client
  const clientContent = generateClient(`${rootGroup}.${pkgName}`, ir);
  files.push({
    path: `src/main/java/com/frankstop/${pkgName}/${ir.title}Client.java`,
    content: clientContent
  });

  const pomXml = `<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.frankstop</groupId>
    <artifactId>${ir.title.toLowerCase()}-sdk</artifactId>
    <version>${ir.version}</version>
    <properties>
        <maven.compiler.source>11</maven.compiler.source>
        <maven.compiler.target>11</maven.compiler.target>
    </properties>
</project>
`;

  files.push({ path: 'pom.xml', content: pomXml });

  return files;
}
