/**
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

/**
 * This file implements shared Reader input validation: the format allowlist and the
 * asset-too-large check. The size threshold is always supplied by the caller — each
 * platform (`c2pa-web`, `c2pa-node`) decides its own limit explicitly rather than
 * inheriting a hardcoded default from here.
 */

// =============================================================================
// Format allowlist
// =============================================================================

export const READER_SUPPORTED_FORMATS = [
  'jpg', 'video/mp4', 'image/heif', 'video/x-msvideo', 'pdf', 'image/png',
  'application/c2pa', 'video/quicktime', 'video/avi', 'image/gif',
  'application/xml', 'text/xml', 'application/xhtml+xml', 'tiff',
  'audio/wave', 'mp4', 'image/avif', 'image/dng', 'png', 'dng',
  'image/svg+xml', 'image/heic', 'application/mp4', 'image/x-nikon-nef',
  'video/msvideo', 'tif', 'wav', 'xml', 'audio/vnd.wave', 'xhtml', 'gif',
  'application/x-troff-msvideo', 'webp', 'heic', 'application/pdf',
  'audio/mpeg', 'application/x-c2pa-manifest-store', 'jpeg',
  'image/x-adobe-dng', 'audio/wav', 'mp3', 'mov', 'image/tiff',
  'audio/mp4', 'application/svg+xml', 'arw', 'c2pa', 'svg', 'avi',
  'audio/x-wav', 'm4a', 'image/x-sony-arw', 'image/jpeg', 'avif',
  'image/webp', 'nef', 'heif', 'jxl', 'image/jxl'
];

export function isSupportedReaderFormat(format: string): boolean {
  return READER_SUPPORTED_FORMATS.includes(format);
}

// =============================================================================
// Errors
// =============================================================================

export class UnsupportedFormatError extends Error {
  constructor(format: string) {
    super(`Unsupported format: ${format}.`);
    this.name = 'UnsupportedFormatError';
  }
}

export class AssetTooLargeError extends Error {
  constructor(sizeInBytes: number, maxSizeInBytes: number) {
    super(
      `The provided asset was too large. Size: ${sizeInBytes} bytes. Maximum: ${maxSizeInBytes}.`
    );
    this.name = 'AssetTooLargeError';
  }
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Validates that `format` is supported and `sizeInBytes` doesn't exceed `maxSizeInBytes`.
 * The allowlist itself is shared and not configurable; the size limit is always supplied
 * by the caller, since what's an acceptable asset size is a platform-specific decision.
 *
 * @param format Asset format (MIME type or bare extension) to check against the allowlist.
 * @param sizeInBytes Size of the asset, in bytes.
 * @param maxSizeInBytes Maximum allowed size, in bytes, for the calling platform.
 * @throws {UnsupportedFormatError} If `format` isn't in {@link READER_SUPPORTED_FORMATS}.
 * @throws {AssetTooLargeError} If `sizeInBytes` exceeds `maxSizeInBytes`.
 */
export function validateAssetFormatAndSize(
  format: string,
  sizeInBytes: number,
  maxSizeInBytes: number
): void {
  if (!isSupportedReaderFormat(format)) {
    throw new UnsupportedFormatError(format);
  }

  if (sizeInBytes > maxSizeInBytes) {
    throw new AssetTooLargeError(sizeInBytes, maxSizeInBytes);
  }
}
