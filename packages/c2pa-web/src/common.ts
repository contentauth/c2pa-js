/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

export type { Config, C2pa } from './lib/c2pa.js';

export type { ManifestAndAssetBytes, BuilderFactory } from './lib/builder.js';

export type { ReaderFactory } from './lib/reader.js';

export type { Signer, SigningAlg } from './lib/signer.js';

export {
  isSupportedReaderFormat,
  READER_SUPPORTED_FORMATS
} from './lib/supportedFormats.js';

// Re-export types from c2pa-types for convenience.
export type * from '@contentauth/c2pa-types';
