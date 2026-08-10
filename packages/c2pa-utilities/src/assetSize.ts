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

/**
 * Resolves `maxSizeInBytes` to {@link DEFAULT_MAX_SIZE_IN_BYTES} when it's `0` or
 * otherwise not a usable limit (non-finite or negative). Invalid input is treated
 * the same as "no limit given". Otherwise, the limit is returned as-is.
 */
function resolveMaxSizeInBytes(maxSizeInBytes: number): number {
  return Number.isFinite(maxSizeInBytes) && maxSizeInBytes > 0
    ? maxSizeInBytes
    : DEFAULT_MAX_SIZE_IN_BYTES;
}

/**
 * Error type for handling asset validation issues.
 * 
 * DO NOT construct an `AssetTooLargeError` directly; instead, use the {@link validateAssetSize}
 * function to validate a given asset's size against a maximum limit.
 */

export class AssetTooLargeError extends Error {
  /**
   * @param sizeInBytes Size of the asset, in bytes.
   * @param maxSizeInBytes Maximum allowed size, in bytes. `0` (or any other
   * non-finite/negative value) resolves to {@link DEFAULT_MAX_SIZE_IN_BYTES}.
   */
  constructor(sizeInBytes: number, maxSizeInBytes: number) {
    const resolvedMaxSizeInBytes = resolveMaxSizeInBytes(maxSizeInBytes);

    super(
      `The provided asset was too large. Size: ${sizeInBytes} bytes. Maximum: ${resolvedMaxSizeInBytes}.`
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

  const resolvedMaxSizeInBytes = resolveMaxSizeInBytes(maxSizeInBytes);

  if (sizeInBytes > resolvedMaxSizeInBytes) {
    throw new AssetTooLargeError(sizeInBytes, resolvedMaxSizeInBytes);
  }
}
