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
 */

/**
 * Default maximum asset size, in bytes.
 */
export const DEFAULT_MAX_SIZE_IN_BYTES = 10 ** 9; // 1 GB

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
 * The limit `maxSizeInBytes` is always supplied by the caller, since what's an
 * acceptable maximum asset size is a platform-specific decision.
 * Pass `0` for `maxSizeInBytes` to fall back to the default {@link DEFAULT_MAX_SIZE_IN_BYTES}.
 *
 * @param sizeInBytes Size of the asset, in bytes.
 * @param maxSizeInBytes Maximum allowed size, in bytes, or `0` to use the default.
 * @throws {RangeError} If `sizeInBytes` or `maxSizeInBytes` isn't a finite, non-negative number.
 * @throws {AssetTooLargeError} If `sizeInBytes` exceeds the resolved limit.
 */
export function validateAssetSize(
  sizeInBytes: number,
  maxSizeInBytes: number
): void {
  if (!Number.isFinite(sizeInBytes) || sizeInBytes < 0) {
    throw new RangeError(
      `sizeInBytes must be a finite, non-negative number. Received: ${sizeInBytes}.`
    );
  }

  if (!Number.isFinite(maxSizeInBytes) || maxSizeInBytes < 0) {
    throw new RangeError(
      `maxSizeInBytes must be a finite, non-negative number. Received: ${maxSizeInBytes}.`
    );
  }

  const resolvedMaxSizeInBytes =
    maxSizeInBytes === 0 ? DEFAULT_MAX_SIZE_IN_BYTES : maxSizeInBytes;

  if (sizeInBytes > resolvedMaxSizeInBytes) {
    throw new AssetTooLargeError(sizeInBytes, resolvedMaxSizeInBytes);
  }
}
