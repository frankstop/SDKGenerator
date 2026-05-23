import { APIClientIR } from './types.js';
import { generateTypeScriptSDK } from './generators/typescript.js';
import { generatePythonSDK } from './generators/python.js';
import { generateGoSDK } from './generators/go.js';
import { generateRubySDK } from './generators/ruby.js';
import { generateJavaSDK } from './generators/java.js';

export interface GeneratedFile {
  path: string;
  content: string;
}

export function generateSDK(ir: APIClientIR, language: string): GeneratedFile[] {
  const lang = language.toLowerCase().trim();
  switch (lang) {
    case 'typescript':
    case 'ts':
      return generateTypeScriptSDK(ir);
    case 'python':
    case 'py':
      return generatePythonSDK(ir);
    case 'go':
    case 'golang':
      return generateGoSDK(ir);
    case 'ruby':
    case 'rb':
      return generateRubySDK(ir);
    case 'java':
      return generateJavaSDK(ir);
    default:
      throw new Error(`Unsupported target language: "${lang}". Supported: ts, python, go, ruby, java.`);
  }
}
export * from './types.js';
export * from './parser.js';
