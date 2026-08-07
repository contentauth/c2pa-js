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
  DEFAULT_MAX_SIZE_IN_BYTES,
  validateAssetSize
} from './assetSize.js';

describe('validateAssetSize', () => {
  test('does not throw when the size is within the max', () => {
    expect(() => validateAssetSize(100, 1000)).not.toThrow();
  });

  test('does not throw when the size equals the max', () => {
    expect(() => validateAssetSize(1000, 1000)).not.toThrow();
  });

  test('throws AssetTooLargeError with a message including the size and the max when the size exceeds the max', () => {
    expect(() => validateAssetSize(1001, 1000)).toThrow(AssetTooLargeError);
    expect(() => validateAssetSize(1001, 1000)).toThrow(
      'Size: 1001 bytes. Maximum: 1000.'
    );
  });

  test('treats a maxSizeInBytes of 0 as a request to use the default', () => {
    expect(() =>
      validateAssetSize(DEFAULT_MAX_SIZE_IN_BYTES, 0)
    ).not.toThrow();

    expect(() =>
      validateAssetSize(DEFAULT_MAX_SIZE_IN_BYTES + 1, 0)
    ).toThrow(`Maximum: ${DEFAULT_MAX_SIZE_IN_BYTES}.`);
  });

  test.each([NaN, Infinity, -Infinity, -1])(
    'throws RangeError for a sizeInBytes of %s',
    (sizeInBytes) => {
      expect(() => validateAssetSize(sizeInBytes, 1000)).toThrow(RangeError);
    }
  );

  test.each([NaN, Infinity, -Infinity, -1])(
    'throws RangeError for a maxSizeInBytes of %s',
    (maxSizeInBytes) => {
      expect(() => validateAssetSize(100, maxSizeInBytes)).toThrow(
        RangeError
      );
    }
  );
});
