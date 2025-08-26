
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
import { Settings } from './settings.js';
import wasmSrc from '@contentauth/c2pa-wasm/assets/c2pa_bg.wasm?url';

import C_with_CAWG_data from '../../test/fixtures/assets/C_with_CAWG_data.jpg';
import C_with_CAWG_data_thumbnail from '../../test/fixtures/assets/C_with_CAWG_data_thumbnail.jpg';
import C_with_CAWG_data_ManifestStore from '../../test/fixtures/assets/C_with_CAWG_data.json' with { type: "json" };
import C_with_CAWG_data_trusted_ManifestStore from '../../test/fixtures/assets/C_with_CAWG_data_trusted.json' with { type: "json" };
import C_with_CAWG_data_untrusted_ManifestStore from '../../test/fixtures/assets/C_with_CAWG_data_untrusted.json' with { type: "json" };
import no_alg from '../../test/fixtures/assets/no_alg.jpg';
import dashinit from '../../test/fixtures/assets/dashinit.mp4';
import dash1 from '../../test/fixtures/assets/dash1.m4s?url';
import dashinit_ManifestStore from '../../test/fixtures/assets/dashinit.json' with { type: "json" };

import anchor_correct from '../../test/fixtures/trust/anchor-correct.pem?raw';
import anchor_incorrect from '../../test/fixtures/trust/anchor-incorrect.pem?raw';

describe('c2pa', () => {
  describe('reader', () => {
    test('should work when created from a blob', async () => {
      const c2pa = await createC2pa({ wasmSrc });

      const blob = await getBlobForAsset(C_with_CAWG_data);

      const reader = await c2pa.reader.fromBlob(blob.type, blob)
      
      const manifestStore = await reader.manifestStore();

      expect(manifestStore).toEqual(C_with_CAWG_data_ManifestStore);

      await reader.free();
    });

    test('should return an embedded thumbnail', async () => {
      const c2pa = await createC2pa({ wasmSrc });

      const blob = await getBlobForAsset(C_with_CAWG_data);

      const reader = await c2pa.reader.fromBlob(blob.type, blob)

      const manifestStore = await reader.manifestStore();

      const activeManifest =
        manifestStore.manifests[manifestStore.active_manifest];
      const thumbnailId = activeManifest.thumbnail.identifier;

      const thumbnailBuffer = await reader.resourceToBuffer(thumbnailId);
      const thumbnail = new Uint8Array(thumbnailBuffer!);

      const thumbnailBlob = await getBlobForAsset(
        C_with_CAWG_data_thumbnail
      );

      const expectedThumbnailBuffer = await thumbnailBlob.arrayBuffer();

      const expectedThumbnail = new Uint8Array(expectedThumbnailBuffer);

      expect(thumbnail).toEqual(expectedThumbnail);

      await reader.free();
    });

    test('should report c2pa-rs errors correctly', async () => {
      const c2pa = await createC2pa({ wasmSrc });

      const blob = await getBlobForAsset(no_alg);

      const readerPromise = c2pa.reader.fromBlob(blob.type, blob);

      await expect(readerPromise).rejects.toThrowError('C2pa(UnknownAlgorithm)');
    });

    test('should report a trusted asset when when configured to verify trust', async () => {
      const sdkSettings: Settings = {
        trust: {
          trustAnchors: anchor_correct,
        },
        verify: {
          verifyTrust: true
        }
      }

      const c2pa = await createC2pa({ wasmSrc, sdkSettings });

      const blob = await getBlobForAsset(C_with_CAWG_data);

      const reader = await c2pa.reader.fromBlob(blob.type, blob);

      const manifestStore = await reader.manifestStore();

      expect(manifestStore).toEqual(C_with_CAWG_data_trusted_ManifestStore);

      await reader.free();
    });

    test('should report an untrusted asset when configured to verify trust', async () => {
      const sdkSettings: Settings = {
        trust: {
          trustAnchors: anchor_incorrect,
        },
        verify: {
          verifyTrust: true
        }
      }

      const c2pa = await createC2pa({ wasmSrc, sdkSettings });

      const blob = await getBlobForAsset(C_with_CAWG_data);

      const reader = await c2pa.reader.fromBlob(blob.type, blob);

      const manifestStore = await reader.manifestStore();

      expect(manifestStore).toEqual(C_with_CAWG_data_untrusted_ManifestStore);

      await reader.free();
    });

    test('should work when created from an initial segment and fragment', async () => {
      const c2pa = await createC2pa({ wasmSrc });

      const initBlob = await getBlobForAsset(dashinit);
      const fragmentBlob = await getBlobForAsset(dash1);

      const reader = await c2pa.reader.fromBlobFragment(initBlob.type, initBlob, fragmentBlob);

      const manifestStore = await reader.manifestStore();

      expect(manifestStore).toEqual(dashinit_ManifestStore);

      await reader.free();
    });

    // TODO: can this test be written to track the status of the underlying object instead of checking for an error?
    test('should be freeable', async () => {
      const c2pa = await createC2pa({ wasmSrc });

      const blob = await getBlobForAsset(C_with_CAWG_data);

      const reader = await c2pa.reader.fromBlob(blob.type, blob);

      await reader.free();

      await expect(reader.manifestStore()).rejects.toThrowError();
    });
  });
});


async function getBlobForAsset(src: string): Promise<Blob> {
  const response = await fetch(src);
  const blob = await response.blob();

  return blob;
}
