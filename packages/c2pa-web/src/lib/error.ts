/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { MAX_SIZE_IN_BYTES } from './reader.js';

export class AssetTooLargeError extends Error {
  constructor(size: number) {
    super(
      `The provided asset was too large. Size: ${size} bytes. Maximum: ${MAX_SIZE_IN_BYTES}.`
    );
    this.name = 'AssetTooLargeError';
  }
}

export class UnsupportedFormatError extends Error {
  constructor(format: string) {
    super(`Unsupported format: ${format}.`);
    this.name = 'UnsupportedFormatError';
  }
}
