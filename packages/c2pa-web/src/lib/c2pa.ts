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
import { Settings, resolveSettings } from '@contentauth/c2pa-utilities';
import { BuilderFactory, createBuilderFactory } from './builder.js';

export interface Config {
  /**
   * URL to fetch the WASM binary or an already-instantiated WASM module.
   */
  wasmSrc: string | WebAssembly.Module;

  /**
   * HTTPS URL to the worker script. When provided the worker is loaded from this
   * URL instead of an inline blob URL, which is required in environments
   * with a strict Content Security Policy that disallows blob: worker sources.
   *
   * Host the file exported as `@contentauth/c2pa-web/c2pa_worker` alongside your
   * application and pass its URL here.
   */
  workerSrc?: URL;

  /**
   * Settings for the SDK. Will be inherited by created builders and readers.
   */
  settings?: Settings;
}

export interface C2paSdk {
  /**
   * Contains methods for creating Reader objects.
   */
  reader: ReaderFactory;

  /**
   * Contains methods for creating Builder objects.
   */
  builder: BuilderFactory;

  /**
   * Terminates the SDK's underlying web worker.
   */
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
  const { wasmSrc, workerSrc, settings } = config;

  const wasm =
    typeof wasmSrc === 'string' ? await fetchAndCompileWasm(wasmSrc) : wasmSrc;

  const settingsString = await resolveSettings(settings, undefined);
  const worker = await createWorkerManager({ wasm, workerSrc, settingsString });

  return {
    reader: createReaderFactory(worker, settings, wasm),
    builder: createBuilderFactory(worker, settings),
    dispose: worker.terminate
  };
}

async function fetchAndCompileWasm(src: string) {
  const response = await fetch(src, { integrity: WASM_SRI });
  const wasm = await WebAssembly.compileStreaming(response);

  return wasm;
}
