/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { test, describe, expect } from 'test/methods.js';
import { createC2pa } from './c2pa.js';
import { Settings } from './settings.js';
import { getBlobForAsset } from 'test/utils.js';

import wasmSrc from '@contentauth/c2pa-web/resources/c2pa.wasm?url';

import C_with_CAWG_data from 'test/assets/C_with_CAWG_data.jpg';
import C_with_CAWG_data_thumbnail from 'test/assets/C_with_CAWG_data_thumbnail.jpg';
import C_with_CAWG_data_ManifestStore from 'test/manifests/C_with_CAWG_data.js';

import C_with_CAWG_data_trusted_ManifestStore from 'test/manifests/C_with_CAWG_data_trusted.js';
import C_with_CAWG_data_untrusted_ManifestStore from 'test/manifests/C_with_CAWG_data_untrusted.js';
import no_alg from 'test/assets/no_alg.jpg';
import dashinit from 'test/assets/dashinit.mp4';
import dash1 from 'test/assets/dash1.m4s?url';
import dashinit_ManifestStore from 'test/manifests/dashinit.js';

import anchor_correct from 'test/trust/anchor-correct.pem?raw';
import anchor_cawg from 'test/trust/anchor-cawg.pem?raw';
import anchor_incorrect from 'test/trust/anchor-incorrect.pem?raw';
import { ManifestStore } from '@contentauth/c2pa-types';

describe('reader', () => {
  describe('creation', () => {
    describe('fromBlob', () => {
      test('should return c2pa data when created from a blob', async ({
        c2pa
      }) => {
        const blob = await getBlobForAsset(C_with_CAWG_data);

        const reader = await c2pa.reader.fromBlob(blob.type, blob);

        expect(reader).not.toBeNull();

        const manifestStore = await reader!.manifestStore();

        expect(manifestStore).toEqual(C_with_CAWG_data_untrusted_ManifestStore);
      });

      test('should return null when reading an asset with no C2PA data', async ({
        c2pa
      }) => {
        const blob = await getBlobForAsset(C_with_CAWG_data_thumbnail);

        const reader = await c2pa.reader.fromBlob(blob.type, blob);

        expect(reader).toBeNull();
      });

      test('should use local "context" settings when provided', async () => {
        const settings: Settings = {
          verify: {
            verifyTrust: false
          },
          cawgTrust: {
            verifyTrustList: false
          }
        };

        const overrideSettings: Settings = {
          trust: {
            trustAnchors: anchor_correct
          },
          cawgTrust: {
            trustAnchors: anchor_cawg
          },
          verify: {
            verifyTrust: true
          }
        };

        const c2pa = await createC2pa({ wasmSrc, settings });

        const blob = await getBlobForAsset(C_with_CAWG_data);

        const reader = await c2pa.reader.fromBlob(
          blob.type,
          blob,
          overrideSettings
        );

        expect(reader).not.toBeNull();

        const manifestStore = await reader!.manifestStore();

        expect(manifestStore).toEqual(C_with_CAWG_data_trusted_ManifestStore);

        c2pa.dispose();
      });
    });

    describe('fromBlobFragment', () => {
      test('should return c2pa data from an initial segment and fragment', async ({
        c2pa
      }) => {
        const initBlob = await getBlobForAsset(dashinit);
        const fragmentBlob = await getBlobForAsset(dash1);

        const reader = await c2pa.reader.fromBlobFragment(
          initBlob.type,
          initBlob,
          fragmentBlob
        );

        expect(reader).not.toBeNull();

        const manifestStore = await reader!.manifestStore();

        expect(manifestStore).toEqual(dashinit_ManifestStore);
      });

      test('should return null when reading an initial fragment with no C2PA data', async ({
        c2pa
      }) => {
        const initBlob = await getBlobForAsset(C_with_CAWG_data_thumbnail);
        const fragmentBlob = await getBlobForAsset(dash1);

        const reader = await c2pa.reader.fromBlobFragment(
          initBlob.type,
          initBlob,
          fragmentBlob
        );

        expect(reader).toBeNull();
      });
    });
  });

  describe('methods', () => {
    describe('resourceToBytes', () => {
      test('should return an embedded thumbnail', async ({ c2pa }) => {
        const blob = await getBlobForAsset(C_with_CAWG_data);

        const reader = await c2pa.reader.fromBlob(blob.type, blob);

        expect(reader).not.toBeNull();

        const manifestStore = await reader!.manifestStore();

        const activeManifest =
          manifestStore.manifests![manifestStore.active_manifest!];
        const thumbnailId = activeManifest.thumbnail!.identifier;

        const thumbnailBuffer = await reader!.resourceToBytes(thumbnailId);
        const thumbnail = new Uint8Array(thumbnailBuffer!);

        const thumbnailBlob = await getBlobForAsset(C_with_CAWG_data_thumbnail);

        const expectedThumbnailBuffer = await thumbnailBlob.arrayBuffer();

        const expectedThumbnail = new Uint8Array(expectedThumbnailBuffer);

        expect(thumbnail).toEqual(expectedThumbnail);
      });
    });

    describe('activeManifest', () => {
      test("should return the asset's active manifest", async ({ c2pa }) => {
        const blob = await getBlobForAsset(C_with_CAWG_data);

        const reader = await c2pa.reader.fromBlob(blob.type, blob);

        expect(reader).not.toBeNull();

        const activeManifest = await reader!.activeManifest();

        const expectedManifestStore =
          C_with_CAWG_data_untrusted_ManifestStore as ManifestStore;
        const expectedActiveManifest =
          expectedManifestStore.manifests?.[
            expectedManifestStore.active_manifest!
          ];

        expect(activeManifest).toEqual(expectedActiveManifest);
      });
    });
  });

  describe('errors', () => {
    test('should report c2pa-rs errors correctly', async ({ c2pa }) => {
      const blob = await getBlobForAsset(no_alg);

      const readerPromise = c2pa.reader.fromBlob(blob.type, blob);

      await expect(readerPromise).rejects.toThrowError(
        'C2pa(UnknownAlgorithm)'
      );
    });
  });

  test('should report a trusted asset when when configured to verify trust', async () => {
    const settings: Settings = {
      trust: {
        trustAnchors: anchor_correct
      },
      cawgTrust: {
        trustAnchors: anchor_cawg
      },
      verify: {
        verifyTrust: true
      }
    };

    const c2pa = await createC2pa({ wasmSrc, settings });

    const blob = await getBlobForAsset(C_with_CAWG_data);

    const reader = await c2pa.reader.fromBlob(blob.type, blob);

    expect(reader).not.toBeNull();

    const manifestStore = await reader!.manifestStore();

    expect(manifestStore).toEqual(C_with_CAWG_data_trusted_ManifestStore);

    c2pa.dispose();
  });

  test('should report an untrusted asset when configured to verify trust', async () => {
    const settings: Settings = {
      trust: {
        trustAnchors: anchor_incorrect
      },
      verify: {
        verifyTrust: true
      }
    };

    const c2pa = await createC2pa({ wasmSrc, settings });

    const blob = await getBlobForAsset(C_with_CAWG_data);

    const reader = await c2pa.reader.fromBlob(blob.type, blob);

    expect(reader).not.toBeNull();

    const manifestStore = await reader!.manifestStore();

    expect(manifestStore).toEqual(C_with_CAWG_data_untrusted_ManifestStore);

    c2pa.dispose();
  });

  test('should report a "valid" (not "trusted") asset when trust settings are disabled', async () => {
    const settings: Settings = {
      verify: {
        verifyTrust: false
      },
      cawgTrust: {
        verifyTrustList: false
      }
    };

    const c2pa = await createC2pa({ wasmSrc, settings });

    const blob = await getBlobForAsset(C_with_CAWG_data);

    const reader = await c2pa.reader.fromBlob(blob.type, blob);

    expect(reader).not.toBeNull();

    const manifestStore = await reader!.manifestStore();

    expect(manifestStore).toEqual(C_with_CAWG_data_ManifestStore);

    c2pa.dispose();
  });

  // TODO: can this test be written to track the status of the underlying object instead of checking for an error?
  test('should be freeable', async ({ c2pa }) => {
    const blob = await getBlobForAsset(C_with_CAWG_data);

    const reader = await c2pa.reader.fromBlob(blob.type, blob);

    expect(reader).not.toBeNull();

    await reader!.free();

    await expect(reader!.manifestStore()).rejects.toThrowError();
  });
});
