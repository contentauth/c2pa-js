import { execSync } from 'node:child_process';
import { PromiseExecutor } from '@nx/devkit';
import { BuildExecutorSchema } from './schema.js';
import { rimrafSync } from 'rimraf';
import { join } from 'path';
import { readFileSync } from 'fs';
import { fromData } from 'ssri';
import { appendFileSync } from 'node:fs';

const runExecutor: PromiseExecutor<BuildExecutorSchema> = async (
  options,
  context
) => {
  const projectPath = join(context.root, options['project-dir']);
  const outputWasmName = 'c2pa';

  const cargoOutDir = join(
    context.root,
    'dist',
    'target',
    'wasm32-unknown-unknown'
  );

  rimrafSync(cargoOutDir);

  try {
    // Run cargo build
    execSync('cargo build --release --target wasm32-unknown-unknown', {
      cwd: projectPath,
    });

    const formattedProjectName = context.projectName?.replace('-', '_');

    const cargoOutput = join(
      context.root,
      `dist/target/wasm32-unknown-unknown/release/${formattedProjectName}.wasm`
    );

    const outDir = join(projectPath, 'pkg');

    // Clean output directory
    rimrafSync(outDir);

    // Run wasm-bindgen on cargo build output
    execSync(
      `wasm-bindgen ${cargoOutput} --out-dir ${outDir} --out-name ${outputWasmName} --target web --omit-default-module-path`,
      {
        cwd: projectPath,
      }
    );

    // Run wasm-opt on wasm-bindgen output, optimizing for size
    const wasmOptInput = join(outDir, `${outputWasmName}_bg.wasm`);

    execSync(`wasm-opt ${wasmOptInput} -o ${wasmOptInput} -Oz`, {
      cwd: projectPath,
    });

    // Compute SRI integrity and append it to wasm-bindgen's JS output and .d.ts as an exported const
    const wasmFile = readFileSync(wasmOptInput);
    const integrity = JSON.stringify(fromData(wasmFile).toString());

    const javascriptOutput = join(outDir, `${outputWasmName}.js`);

    appendFileSync(javascriptOutput, `export const WASM_SRI = ${integrity};`);

    const dtsOutput = join(outDir, `${outputWasmName}.d.ts`);

    appendFileSync(dtsOutput, 'export const WASM_SRI: string;');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error building release:', error);

    return {
      success: false,
    };
  }
};

export default runExecutor;
