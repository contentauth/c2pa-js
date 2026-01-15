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
import { BuilderFactory, createBuilderFactory } from './builder.js';
import { createIngredientFactory, IngredientFactory } from './ingredient.js';

export interface Config {
  /**
   * URL to fetch the WASM binary or an already-instantiated WASM module.
   */
  wasmSrc: string | WebAssembly.Module;

  /**
   * Settings for the SDK.
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
   * Contains methods for creating Ingredient objects.
   */
  ingredient: IngredientFactory;

  /**
   * Terminates the SDK's underlying web worker.
   */
  dispose: () => void;
}

export async function createC2pa(config: Config): Promise<C2paSdk> {
  const { wasmSrc, settings } = config;

  const wasm =
    typeof wasmSrc === 'string' ? await fetchAndCompileWasm(wasmSrc) : wasmSrc;

  const settingsString = settings
    ? await settingsToWasmJson(settings)
    : undefined;
  const worker = await createWorkerManager({ wasm, settingsString });

  return {
    reader: createReaderFactory(worker),
    builder: createBuilderFactory(worker),
    ingredient: createIngredientFactory(worker),
    dispose: worker.terminate,
  };
}

async function fetchAndCompileWasm(src: string) {
  const response = await fetch(src, { integrity: WASM_SRI });
  const wasm = await WebAssembly.compileStreaming(response);

  return wasm;
}
