/**
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { describe, expect, test } from 'vitest';
import {
  AssetTooLargeError,
  READER_SUPPORTED_FORMATS,
  UnsupportedFormatError,
  isSupportedReaderFormat,
  validateAssetFormatAndSize
} from './assetValidation.js';

describe('isSupportedReaderFormat', () => {
  test('returns true for every entry in the allowlist', () => {
    for (const format of READER_SUPPORTED_FORMATS) {
      expect(isSupportedReaderFormat(format)).toBe(true);
    }
  });

  test('returns false for an unsupported format', () => {
    expect(isSupportedReaderFormat('application/x-not-real')).toBe(false);
  });
});

describe('validateAssetFormatAndSize', () => {
  test('does not throw for a supported format within the size limit', () => {
    expect(() =>
      validateAssetFormatAndSize('image/jpeg', 100, 1000)
    ).not.toThrow();
  });

  test('throws UnsupportedFormatError for an unsupported format', () => {
    expect(() =>
      validateAssetFormatAndSize('application/x-not-real', 100, 1000)
    ).toThrow(UnsupportedFormatError);
  });

  test('throws AssetTooLargeError when the size exceeds the max', () => {
    expect(() =>
      validateAssetFormatAndSize('image/jpeg', 1001, 1000)
    ).toThrow(AssetTooLargeError);
  });

  test('checks format before size', () => {
    expect(() =>
      validateAssetFormatAndSize('application/x-not-real', 1001, 1000)
    ).toThrow(UnsupportedFormatError);
  });

  test('AssetTooLargeError message includes the size and the max', () => {
    expect(() => validateAssetFormatAndSize('image/jpeg', 1001, 1000)).toThrow(
      'Size: 1001 bytes. Maximum: 1000.'
    );
  });
});
