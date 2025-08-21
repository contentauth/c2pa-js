/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

export const READER_SUPPORTED_FORMATS = [
  'jpg',
  'video/mp4',
  'image/heif',
  'video/x-msvideo',
  'pdf',
  'image/png',
  'application/c2pa',
  'video/quicktime',
  'video/avi',
  'image/gif',
  'application/xml',
  'text/xml',
  'application/xhtml+xml',
  'tiff',
  'audio/wave',
  'mp4',
  'image/avif',
  'image/dng',
  'png',
  'dng',
  'image/svg+xml',
  'image/heic',
  'application/mp4',
  'image/x-nikon-nef',
  'video/msvideo',
  'tif',
  'wav',
  'xml',
  'audio/vnd.wave',
  'xhtml',
  'gif',
  'application/x-troff-msvideo',
  'webp',
  'heic',
  'application/pdf',
  'audio/mpeg',
  'application/x-c2pa-manifest-store',
  'jpeg',
  'image/x-adobe-dng',
  'audio/wav',
  'mp3',
  'mov',
  'image/tiff',
  'audio/mp4',
  'application/svg+xml',
  'arw',
  'c2pa',
  'svg',
  'avi',
  'audio/x-wav',
  'm4a',
  'image/x-sony-arw',
  'image/jpeg',
  'avif',
  'image/webp',
  'nef',
  'heif',
];

export function isSupportedReaderFormat(format: string): boolean {
  console.log('testing', format);
  return READER_SUPPORTED_FORMATS.includes(format);
}
