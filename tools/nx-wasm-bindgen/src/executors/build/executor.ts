/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { PromiseExecutor } from '@nx/devkit';
import { BuildExecutorSchema } from './schema.js';
import { fromStream } from 'ssri';
import { $, path, fs } from 'zx';

const runExecutor: PromiseExecutor<BuildExecutorSchema> = async (
  options,
  context
) => {
  const projectPath = path.join(context.root, options['project-dir']);
  const outputWasmName = 'c2pa';
  const $$ = $({ cwd: projectPath });

  const cargoOutDir = path.join(
    context.root,
    'dist',
    'target',
    'wasm32-unknown-unknown'
  );

  await fs.remove(cargoOutDir);

  try {
    // Run cargo build
    await $$`cargo build --release --target wasm32-unknown-unknown`;

    const formattedProjectName = context.projectName?.replace('-', '_');

    const cargoOutput = path.join(
      context.root,
      `dist/target/wasm32-unknown-unknown/release/${formattedProjectName}.wasm`
    );

    const outDir = path.join(projectPath, 'pkg');

    // Clean output directory
    await fs.remove(outDir);

    // Run wasm-bindgen on cargo build output
    await $$`wasm-bindgen ${cargoOutput} --out-dir ${outDir} --out-name ${outputWasmName} --target web --omit-default-module-path`;

    // Run wasm-opt on wasm-bindgen output, optimizing for size
    const wasmOptInput = path.join(outDir, `${outputWasmName}_bg.wasm`);

    await $$`wasm-opt ${wasmOptInput} -o ${wasmOptInput} -Oz`;

    // Compute SRI integrity and append it to wasm-bindgen's JS output and .d.ts as an exported const
    const wasmFileStream = fs.createReadStream(wasmOptInput);
    const integrityData = await fromStream(wasmFileStream);
    const integrityString = JSON.stringify(integrityData.toString());

    const javascriptOutput = path.join(outDir, `${outputWasmName}.js`);

    await fs.appendFile(
      javascriptOutput,
      `export const WASM_SRI = ${integrityString};`
    );

    const dtsOutput = path.join(outDir, `${outputWasmName}.d.ts`);

    await fs.appendFile(dtsOutput, 'export declare const WASM_SRI: string;');

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
