import { APIClientIR, IRModel, IRType, IREndpoint } from '../types.js';

// Capitalize helper for Ruby module/class names
function toRubyClassName(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Map types for Ruby documentation (Ruby is dynamic, so we just use standard doc strings)
function mapRubyTypeDoc(type: IRType): string {
  switch (type.kind) {
    case 'primitive':
      if (type.name === 'integer') return 'Integer';
      if (type.name === 'number') return 'Float';
      if (type.name === 'boolean') return 'Boolean';
      return 'String';
    case 'model':
      return type.name;
    case 'array':
      return `Array<${mapRubyTypeDoc(type.itemType!)}>`;
    case 'map':
      return `Hash{String => ${mapRubyTypeDoc(type.valueType!)}}`;
    default:
      return 'Object';
  }
}

// Generate Ruby models
function generateModels(moduleName: string, models: IRModel[]): string {
  let code = `module ${moduleName}\n`;
  code += `  module Models\n\n`;

  for (const model of models) {
    code += `    # ${model.description || 'API Model'}\n`;
    code += `    class ${model.name}\n`;
    
    // Accessors
    const attrs = model.properties.map(p => `:${p.name}`);
    code += `      attr_accessor ${attrs.join(', ')}\n\n`;

    // Initializer
    code += `      # @param params [Hash]\n`;
    code += `      def initialize(params = {})\n`;
    for (const prop of model.properties) {
      code += `        @${prop.name} = params[:${prop.name}] || params['${prop.name}']\n`;
    }
    code += `      end\n\n`;

    // Serialization to hash
    code += `      # @return [Hash]\n`;
    code += `      def to_h\n`;
    code += `        {\n`;
    for (const prop of model.properties) {
      if (prop.type.kind === 'model') {
        code += `          ${prop.name}: @${prop.name}&.to_h,\n`;
      } else if (prop.type.kind === 'array' && prop.type.itemType?.kind === 'model') {
        code += `          ${prop.name}: @${prop.name}&.map(&:to_h),\n`;
      } else {
        code += `          ${prop.name}: @${prop.name},\n`;
      }
    }
    code += `        }\n`;
    code += `      end\n`;
    code += `    end\n\n`;
  }

  code += `  end\n`;
  code += `end\n`;

  return code;
}

// Generate Ruby Client using Net::HTTP
function generateClient(moduleName: string, ir: APIClientIR): string {
  const hasSecurity = Object.keys(ir.securitySchemes).length > 0;
  const defaultServer = ir.servers[0] || 'https://api.example.com';
  const clientName = `${ir.title}Client`;

  let code = `require 'net/http'\n`;
  code += `require 'uri'\n`;
  code += `require 'json'\n`;
  code += `require_relative 'models'\n\n`;

  code += `module ${moduleName}\n`;
  code += `  class Client\n`;
  code += `    # @param base_url [String]\n`;
  if (hasSecurity) {
    code += `    # @param token [String]\n`;
  }
  code += `    def initialize(base_url: '${defaultServer}', token: nil)\n`;
  code += `      @base_uri = URI.parse(base_url.end_with?('/') ? base_url : "#{base_url}/")\n`;
  if (hasSecurity) {
    code += `      @token = token\n`;
  }
  code += `    end\n\n`;

  // Internal Request Helper
  code += `    private\n\n`;
  code += `    def make_request(method, path, query = nil, body = nil, headers = nil)\n`;
  code += `      uri = @base_uri.join(path.start_with?('/') ? path[1..-1] : path)\n`;
  code += `      uri.query = URI.encode_www_form(query) if query && !query.empty?\n\n`;
  
  code += `      http = Net::HTTP.new(uri.host, uri.port)\n`;
  code += `      http.use_ssl = (uri.scheme == 'https')\n\n`;

  code += `      req_headers = { 'Content-Type' => 'application/json' }\n`;
  code += `      req_headers.merge!(headers) if headers\n\n`;

  if (hasSecurity) {
    const apiKeyScheme = Object.entries(ir.securitySchemes).find(([_, s]) => s.type === 'apiKey');
    const httpScheme = Object.entries(ir.securitySchemes).find(([_, s]) => s.type === 'http');

    code += `      if @token\n`;
    if (apiKeyScheme) {
      const s = apiKeyScheme[1];
      if (s.in === 'header') {
        code += `        req_headers['${s.name || 'X-API-Key'}'] = @token\n`;
      } else if (s.in === 'query') {
        code += `        uri.query = [uri.query, "${s.name || 'api_key'}=#{@token}"].compact.join('&')\n`;
      }
    } else if (httpScheme && httpScheme[1].scheme === 'bearer') {
      code += `        req_headers['Authorization'] = "Bearer #{@token}"\n`;
    } else {
      code += `        req_headers['Authorization'] = "Bearer #{@token}"\n`;
    }
    code += `      end\n\n`;
  }

  code += `      case method.to_s.upcase\n`;
  code += `      when 'GET'\n`;
  code += `        request = Net::HTTP::Get.new(uri.request_uri, req_headers)\n`;
  code += `      when 'POST'\n`;
  code += `        request = Net::HTTP::Post.new(uri.request_uri, req_headers)\n`;
  code += `        request.body = body.is_a?(Hash) ? body.to_json : body if body\n`;
  code += `      when 'PUT'\n`;
  code += `        request = Net::HTTP::Put.new(uri.request_uri, req_headers)\n`;
  code += `        request.body = body.is_a?(Hash) ? body.to_json : body if body\n`;
  code += `      when 'DELETE'\n`;
  code += `        request = Net::HTTP::Delete.new(uri.request_uri, req_headers)\n`;
  code += `      when 'PATCH'\n`;
  code += `        request = Net::HTTP::Patch.new(uri.request_uri, req_headers)\n`;
  code += `        request.body = body.is_a?(Hash) ? body.to_json : body if body\n`;
  code += `      else\n`;
  code += `        raise ArgumentError, "Unsupported method: #{method}"\n`;
  code += `      end\n\n`;

  code += `      response = http.request(request)\n\n`;
  code += `      unless response.is_a?(Net::HTTPSuccess)\n`;
  code += `        raise "HTTP Error #{response.code}: #{response.body}"\n`;
  code += `      end\n\n`;
  code += `      return {} if response.code == '204' || response.body.nil? || response.body.empty?\n`;
  code += `      JSON.parse(response.body)\n`;
  code += `    end\n\n`;

  code += `    public\n\n`;

  // Generate Endpoint Methods
  for (const ep of ir.endpoints) {
    if (ep.summary || ep.description) {
      code += `    # ${ep.summary || ''}\n`;
      if (ep.description) code += `    # ${ep.description}\n`;
    }

    const pathParams = ep.parameters.filter(p => p.in === 'path');
    const queryParams = ep.parameters.filter(p => p.in === 'query');
    const headerParams = ep.parameters.filter(p => p.in === 'header');

    // Method arguments
    const argsList: string[] = [];
    pathParams.forEach(p => {
      argsList.push(`${p.name}`);
    });
    if (queryParams.length > 0) argsList.push(`query: nil`);
    if (ep.requestBodyType) argsList.push(`body: nil`);
    if (headerParams.length > 0) argsList.push(`headers: nil`);

    const argSig = argsList.length > 0 ? `(${argsList.join(', ')})` : '';

    const rubyMethod = ep.operationId.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/_+/g, '_');

    code += `    def ${rubyMethod}${argSig}\n`;
    
    // Path interpolation
    let pathStr = ep.path;
    pathParams.forEach(p => {
      pathStr = pathStr.replace(`{${p.name}}`, `#{${p.name}}`);
    });

    const callArgs: string[] = [];
    callArgs.push(`'${ep.method}'`);
    callArgs.push(`"${pathStr}"`);
    callArgs.push(queryParams.length > 0 ? 'query' : 'nil');
    
    if (ep.requestBodyType) {
      if (ep.requestBodyType.kind === 'model') {
        callArgs.push('body.to_h');
      } else {
        callArgs.push('body');
      }
    } else {
      callArgs.push('nil');
    }

    if (headerParams.length > 0) {
      callArgs.push('headers');
    }

    code += `      res = make_request(${callArgs.join(', ')})\n`;

    // Map response back to Model if applicable
    if (ep.responseType.kind === 'model') {
      code += `      Models::${ep.responseType.name}.new(res)\n`;
    } else {
      code += `      res\n`;
    }

    code += `    end\n\n`;
  }

  code += `  end\n`;
  code += `end\n`;

  return code;
}

export function generateRubySDK(ir: APIClientIR) {
  const modName = toRubyClassName(ir.title);
  
  const modelsContent = generateModels(modName, ir.models);
  const clientContent = generateClient(modName, ir);

  const sdkContent = `require_relative '${ir.title.toLowerCase()}/client'\nrequire_relative '${ir.title.toLowerCase()}/models'\n`;

  const gemspec = `Gem::Specification.new do |s|
  s.name        = '${ir.title.toLowerCase()}_sdk'
  s.version     = '${ir.version}'
  s.summary     = "Ruby SDK for ${ir.title}"
  s.authors     = ["Frankstop"]
  s.files       = ["lib/${ir.title.toLowerCase()}.rb", "lib/${ir.title.toLowerCase()}/client.rb", "lib/${ir.title.toLowerCase()}/models.rb"]
  s.require_paths = ["lib"]
  s.add_runtime_dependency "json"
end
`;

  return [
    { path: `lib/${ir.title.toLowerCase()}.rb`, content: sdkContent },
    { path: `lib/${ir.title.toLowerCase()}/models.rb`, content: modelsContent },
    { path: `lib/${ir.title.toLowerCase()}/client.rb`, content: clientContent },
    { path: `${ir.title.toLowerCase()}_sdk.gemspec`, content: gemspec }
  ];
}
