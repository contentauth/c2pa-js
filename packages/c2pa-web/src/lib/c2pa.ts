/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */
import { createWorkerManager, WorkerManager } from './worker/workerManager.js';
import { WASM_SRI } from '@contentauth/c2pa-wasm';

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
}

export interface C2pa {
  /**
   * @internal Not part of the public API. Reader/Builder's static methods take this whole `C2pa`
   * object and read the worker off of it themselves — there's no need to touch this directly.
   */
  worker: WorkerManager;

  /**
   * Terminates this instance's underlying web worker.
   */
  dispose: () => void;
}

/**
 * Creates a new instance of c2pa-web by setting up a web worker and preparing a WASM binary.
 *
 * The returned handle carries no `Settings`/`Context` of its own — it's purely the worker/wasm
 * runtime. Create as many `Reader`s/`Builder`s from it as you like, each with its own `Context`;
 * they all share this one worker rather than needing a new `createC2pa()` call per `Context`.
 *
 * @param config - SDK configuration object.
 * @returns A handle to the running worker, to be passed to `Reader`/`Builder`'s static methods.
 *
 * @example Creating a new SDK instance and reader:
 * ```
 * const c2pa = await createC2pa({ wasmSrc: 'url/hosting/wasm/binary' });
 *
 * const reader = await Reader.fromBlob(c2pa, imageBlob.type, imageBlob);
 * ```
 */
export async function createC2pa(config: Config): Promise<C2pa> {
  const { wasmSrc, workerSrc } = config;

  const wasm =
    typeof wasmSrc === 'string' ? await fetchAndCompileWasm(wasmSrc) : wasmSrc;

  const worker = await createWorkerManager({ wasm, workerSrc });

  return {
    worker,
    dispose: worker.terminate
  };
}

async function fetchAndCompileWasm(src: string) {
  const response = await fetch(src, { integrity: WASM_SRI });
  const wasm = await WebAssembly.compileStreaming(response);

  return wasm;
}
