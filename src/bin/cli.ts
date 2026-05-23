#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import pc from 'picocolors';
import { parseOpenAPI } from '../core/parser.js';
import { generateSDK } from '../core/generator.js';

const USAGE = `
${pc.bold(pc.cyan('SDKGenerator'))} - Cast typed SDKs from OpenAPI specifications.

${pc.bold('Usage:')}
  npx sdk-generator <spec-path-json> [language] [options]

${pc.bold('Languages:')}
  ts, python, go, ruby, java ${pc.dim('(Omit to generate ALL)')}

${pc.bold('Options:')}
  -o, --out <dir>   Output directory (default: ./sdk)
  -h, --help        Show help details
`;

function printBanner() {
  console.log(pc.cyan(`
   ███████╗██████╗ ██╗  ██╗ ██████╗ ███████╗███╗   ██╗
   ██╔════╝██╔══██╗██║ ██╔╝██╔════╝ ██╔════╝████╗  ██║
   ███████╗██║  ██║█████╔╝ ██║     █████╗  ██╔██╗ ██║
   ╚════██║██║  ██║██╔═██╗ ██║     ██╔══╝  ██║╚██╗██║
   ███████║██████╔╝██║  ██╗╚██████╗███████╗██║ ╚████║
   ╚══════╝╚═════╝ ╚═╝  ╚═╝ ╚═════╝╚══════╝╚═╝  ╚═══╝
   ${pc.bold(pc.magenta('The Polyglot OpenAPI Client SDK Generator'))}
  `));
}

function parseArgs() {
  const args = process.argv.slice(2);
  
  if (args.includes('-h') || args.includes('--help') || args.length === 0) {
    printBanner();
    console.log(USAGE);
    process.exit(0);
  }

  const specPath = args[0];
  let language: string | null = null;
  let outDir = './sdk';

  // Extract custom out directory if specified
  const outIndex = args.findIndex(arg => arg === '-o' || arg === '--out');
  if (outIndex !== -1 && outIndex + 1 < args.length) {
    outDir = args[outIndex + 1];
    args.splice(outIndex, 2);
  }

  // Next argument if it's not an option is the language
  if (args[1] && !args[1].startsWith('-')) {
    language = args[1];
  }

  return { specPath, language, outDir };
}

async function main() {
  printBanner();
  
  const { specPath, language, outDir } = parseArgs();

  // Validate spec file
  if (!fs.existsSync(specPath)) {
    console.error(pc.red(`❌ Error: Specification file not found at "${specPath}"`));
    process.exit(1);
  }

  let rawSpec: string;
  try {
    rawSpec = fs.readFileSync(specPath, 'utf8');
  } catch (err: any) {
    console.error(pc.red(`❌ Error: Failed to read specification file. ${err.message}`));
    process.exit(1);
  }

  console.log(pc.blue(`\n📖 Parsing OpenAPI specification: ${pc.bold(specPath)}...`));

  let ir;
  try {
    ir = parseOpenAPI(rawSpec);
  } catch (err: any) {
    console.error(pc.red(`❌ Parsing Failed: ${err.message}`));
    process.exit(1);
  }

  console.log(pc.green(`✔ Parsed successfully! Title: "${pc.bold(ir.title)}", Version: "${ir.version}"`));
  console.log(pc.dim(`  Found ${ir.models.length} Models and ${ir.endpoints.length} Endpoints\n`));

  const targetLanguages = language 
    ? [language] 
    : ['ts', 'python', 'go', 'ruby', 'java'];

  console.log(pc.magenta(`⚙ Generating SDKs into directory: "${pc.bold(outDir)}"...`));

  for (const lang of targetLanguages) {
    const langLabel = lang.toUpperCase();
    console.log(pc.yellow(`\n🔨 Casting ${pc.bold(langLabel)} Client...`));

    try {
      const generatedFiles = generateSDK(ir, lang);
      let writtenCount = 0;

      for (const file of generatedFiles) {
        // Namespace each language if generating multiple
        const langSubfolder = language ? '' : lang;
        const targetPath = path.join(outDir, langSubfolder, file.path);
        const parentDir = path.dirname(targetPath);

        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }

        fs.writeFileSync(targetPath, file.content, 'utf8');
        writtenCount++;
        
        const sizeKb = (Buffer.byteLength(file.content, 'utf8') / 1024).toFixed(2);
        console.log(pc.dim(`  └─ [Created] `) + pc.green(file.path) + pc.dim(` (${sizeKb} KB)`));
      }

      console.log(pc.green(`✔ Generated ${writtenCount} files for ${pc.bold(langLabel)}!`));
    } catch (err: any) {
      console.error(pc.red(`❌ Failed to generate SDK for ${langLabel}: ${err.message}`));
    }
  }

  console.log(pc.bold(pc.cyan(`\n✨ SDK casting process completed! Beautiful client libraries are ready.`)));
}

main().catch(err => {
  console.error(pc.red(`Fatal Error: ${err.message}`));
  process.exit(1);
});
