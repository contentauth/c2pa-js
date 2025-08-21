
/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */
import { describe, expect, test } from 'vitest';
import { createC2pa } from './c2pa.js';
import wasmSrc from '@contentauth/c2pa-wasm/assets/c2pa_bg.wasm?url';

import C_with_CAWG_data from '../../test/fixtures/C_with_CAWG_data.jpg';
import C_with_CAWG_data_thumbnail from '../../test/fixtures/C_with_CAWG_data_thumbnail.jpg';
import C_with_CAWG_data_ManifestStore from '../../test/fixtures/C_with_CAWG_data.json' with { type: "json" };;
import no_alg from '../../test/fixtures/no_alg.jpg';

describe('c2pa', () => {
  describe('reader', () => {
    test('should work when created from a blob', async () => {
      const c2pa = await createC2pa({ wasmSrc });

      const blob = await getBlobForImage(C_with_CAWG_data);

      const reader = await c2pa.reader.fromBlob(blob.type, blob)
      
      const manifestStore = await reader?.manifestStore();

      expect(manifestStore).toEqual(C_with_CAWG_data_ManifestStore);

      await reader?.free();
    });

    test('should return an embedded thumbnail', async () => {
      const c2pa = await createC2pa({ wasmSrc });

      const blob = await getBlobForImage(C_with_CAWG_data);

      const reader = await c2pa.reader.fromBlob(blob.type, blob)

      const manifestStore = await reader?.manifestStore();

      const activeManifest =
        manifestStore.manifests[manifestStore.active_manifest];
      const thumbnailId = activeManifest.thumbnail.identifier;

      const thumbnailBuffer = await reader?.resourceToBuffer(thumbnailId);
      const thumbnail = new Uint8Array(thumbnailBuffer!);

      const thumbnailBlob = await getBlobForImage(
        C_with_CAWG_data_thumbnail
      );

      const expectedThumbnailBuffer = await thumbnailBlob.arrayBuffer();

      const expectedThumbnail = new Uint8Array(expectedThumbnailBuffer);

      expect(thumbnail).toEqual(expectedThumbnail);

      await reader?.free();
    });

    test('should report c2pa-rs errors correctly', async () => {
      const c2pa = await createC2pa({ wasmSrc });

      const blob = await getBlobForImage(no_alg);

      const readerPromise = c2pa.reader.fromBlob(blob.type, blob);

      await expect(readerPromise).rejects.toThrowError('C2pa(UnknownAlgorithm)');
    });

    // TODO: can this test be written to track the status of the underlying object instead of checking for an error?
    test('should be freeable', async () => {
      const c2pa = await createC2pa({ wasmSrc });

      const blob = await getBlobForImage(C_with_CAWG_data);

      const reader = await c2pa.reader.fromBlob(blob.type, blob);

      await reader?.free();

      await expect(reader?.manifestStore()).rejects.toThrowError();
    });
  });
});


async function getBlobForImage(src: string): Promise<Blob> {
  const response = await fetch(src);
  const blob = await response.blob();

  return blob;
}
