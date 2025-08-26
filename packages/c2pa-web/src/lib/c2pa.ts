/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */
import { createWorkerManager } from './worker/workerManager.js';
import { createReaderFactory, ReaderFactory } from './reader.js';
import { WASM_SRI } from '@contentauth/c2pa-wasm';
import { Settings, settingsToWasmJson } from './settings.js';

export interface Config {
  /**
   * URL to fetch the WASM binary or an already-instantiated WASM module.
   */
  wasmSrc: string | WebAssembly.Module;

  /**
   * c2pa-rs settings
   */
  sdkSettings?: Settings;
}

interface C2paSdk {
  reader: ReaderFactory;
  dispose: () => void;
}

/**
 * Creates a new instance of c2pa-web by setting up a web worker and preparing a WASM binary.
 *
 * @param config - SDK configuration object.
 * @returns An object providing access to factory methods for creating new reader objects.
 *
 * @example Creating a new SDK instance and reader:
 * ```
 * const c2pa = await createC2pa({ wasmSrc: 'url/hosting/wasm/binary' });
 *
 * const reader = await c2pa.reader.fromBlob(imageBlob.type, imageBlob);
 * ```
 */
export async function createC2pa(config: Config): Promise<C2paSdk> {
  const { wasmSrc, sdkSettings } = config;

  const wasm =
    typeof wasmSrc === 'string' ? await fetchAndCompileWasm(wasmSrc) : wasmSrc;

  const settings = sdkSettings ? settingsToWasmJson(sdkSettings) : undefined;

  const worker = await createWorkerManager({ wasm, settingsString: settings });

  return {
    reader: createReaderFactory(worker),
    dispose: worker.terminate,
  };
}

async function fetchAndCompileWasm(src: string) {
  const response = await fetch(src, { integrity: WASM_SRI });
  const wasm = await WebAssembly.compileStreaming(response);

  return wasm;
}
