import { createWorkerManager } from './worker/workerManager.js';
import { createReaderFactory } from './reader.js';
import { WASM_SRI } from '@contentauth/c2pa-wasm';

interface CreateC2paConfig {
  /**
   * URL to fetch the WASM module from or an instantiated module to be used
   */
  wasmSrc: string | WebAssembly.Module;
}

export async function createC2pa({ wasmSrc }: CreateC2paConfig) {
  const wasm =
    typeof wasmSrc === 'string' ? await fetchAndCompileWasm(wasmSrc) : wasmSrc;

  const worker = await createWorkerManager({ wasm });

  const blob = new Blob([]);

  const readable = blob.stream();
  const reader = readable.getReader();
  reader.read();

  return {
    reader: createReaderFactory(worker),
  };
}

async function fetchAndCompileWasm(src: string) {
  const response = await fetch(src, { integrity: WASM_SRI });
  const wasm = await WebAssembly.compileStreaming(response);

  return wasm;
}
