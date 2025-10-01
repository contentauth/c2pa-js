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
import { pipeline } from 'node:stream/promises';
import got from 'got';
import { extract } from 'tar';

const WASM_OPT_VERSION = '124';

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

    const wasmOpt = getWasmOptPath(context.root);
    await $$`node ${wasmOpt} ${wasmOptInput} -o ${wasmOptInput} -Oz`;

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

// Install wasm-opt's node wrapper if necessary and return a path to it.
async function getWasmOptPath(rootDir: string) {
  const basePath = path.join(rootDir, 'tools/nx-wasm-bindgen');
  const downloadUrl = `https://github.com/WebAssembly/binaryen/releases/download/version_${WASM_OPT_VERSION}/binaryen-version_${WASM_OPT_VERSION}-node.tar.gz`;
  const downloadDir = path.join(basePath, 'download/');
  const downloadFilePath = path.join(downloadDir, 'wasm_opt.tar.gz');
  const outDir = path.join(downloadDir, `binaryen-version_${WASM_OPT_VERSION}`);
  const outFileCjsName = path.join(outDir, 'wasm-opt.cjs');

  if (await fs.exists(outFileCjsName)) {
    console.log('wasm-opt is already installed');
    return outFileCjsName;
  }

  console.log(`downloading wasm-opt version ${WASM_OPT_VERSION}`);

  await fs.remove(downloadDir);

  await fs.ensureDir(downloadDir);

  await pipeline(
    got.stream(downloadUrl),
    fs.createWriteStream(downloadFilePath)
  );

  await extract({
    f: downloadFilePath,
    cwd: downloadDir,
  });

  const outFileJsName = path.join(outDir, 'wasm-opt.js');

  // Force node to run as commonJS
  await fs.rename(outFileJsName, outFileCjsName);

  return outFileCjsName;
}
