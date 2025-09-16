/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

export type * from './lib/c2pa.js';

export type { Reader, ReaderFactory } from './lib/reader.js';

export {
  isSupportedReaderFormat,
  READER_SUPPORTED_FORMATS,
} from './lib/supportedFormats.js';

export type {
  Settings,
  VerifySettings,
  TrustSettings,
} from './lib/settings.js';

// Re-export types from c2pa-types for convenience.
export type * from '@contentauth/c2pa-types';
