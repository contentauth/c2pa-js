/**
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

/**
 * This file implements the shared Reader asset size check.
 * 
 * The size threshold is always supplied by the caller, since each platform
 * (`c2pa-web` or `c2pa-node`) decides its own limit explicitly rather than
 * inheriting a hardcoded default from here.
 */

export class AssetTooLargeError extends Error {
  constructor(sizeInBytes: number, maxSizeInBytes: number) {
    super(
      `The provided asset was too large. Size: ${sizeInBytes} bytes. Maximum: ${maxSizeInBytes}.`
    );
    this.name = 'AssetTooLargeError';
  }
}

/**
 * Validates that `sizeInBytes` doesn't exceed `maxSizeInBytes`.
 * 
 * The limit is always supplied by the caller, since what's an acceptable
 * asset size is a platform-specific decision.
 *
 * @param sizeInBytes Size of the asset, in bytes.
 * @param maxSizeInBytes Maximum allowed size, in bytes.
 * @throws {AssetTooLargeError} If `sizeInBytes` exceeds `maxSizeInBytes`.
 */
export function validateAssetSize(
  sizeInBytes: number,
  maxSizeInBytes: number
): void {
  if (sizeInBytes > maxSizeInBytes) {
    throw new AssetTooLargeError(sizeInBytes, maxSizeInBytes);
  }
}
