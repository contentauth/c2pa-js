/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */


export { createC2pa } from './lib/c2pa.js';
export { Reader } from './lib/reader.js';
export {
  Builder,
  type ClaimVersion,
  type ManifestProperty
} from './lib/builder.js';
export * from './common.js';
export * from '@contentauth/c2pa-utilities';
