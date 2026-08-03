/**
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { describe, expect, test } from 'vitest';
import { AssetTooLargeError, validateAssetSize } from './assetSize.js';

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
});
