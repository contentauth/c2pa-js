/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

export * from './lib/c2pa.js';

export {
  isSupportedReaderFormat,
  READER_SUPPORTED_FORMATS,
} from './lib/supportedFormats.js';

export { type Settings } from './lib/settings.js';

// Re-export types from c2pa-types for convenience.
export type * from '@contentauth/c2pa-types';
