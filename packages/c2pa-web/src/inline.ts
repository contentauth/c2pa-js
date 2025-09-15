/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { createC2pa as createC2paBase, Config } from './lib/c2pa.js';
import wasmB64 from '@contentauth/c2pa-wasm/c2pa.wasm?url&inline';

export type InlineConfig = Omit<Config, 'wasmSrc'>;

/**
 * Creates a new instance of c2pa-web by setting up a web worker and preparing a WASM binary.
 *
 * This is the "inline" version which compiles the WASM binary from an inlined, base64-encoded string.
 *
 * @param config - SDK configuration object.
 * @returns An object providing access to factory methods for creating new reader objects.
 *
 * @example Creating a new SDK instance and reader:
 * ```
 * const c2pa = await createC2pa();
 *
 * const reader = await c2pa.reader.fromBlob(imageBlob.type, imageBlob);
 * ```
 */
export async function createC2pa(config?: InlineConfig) {
  const wasm = await WebAssembly.compile(dataUrlToArrayBuffer(wasmB64));

  return createC2paBase({
    ...config,
    wasmSrc: wasm,
  });
}

export * from './common.js';

function dataUrlToArrayBuffer(dataUrl: string) {
  const base64StartIndex = dataUrl.indexOf('base64,');
  if (base64StartIndex >= 0) {
    const base64 = dataUrl.slice(base64StartIndex + 'base64,'.length);
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
  const str = decodeURIComponent(dataUrl.slice(dataUrl.indexOf(',') + 1));
  const enc = new TextEncoder();
  const bytes = enc.encode(str);
  return bytes.buffer;
}
