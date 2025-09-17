/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

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
export { createC2pa } from './lib/c2pa.js';

export * from './common.js';
