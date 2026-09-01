/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { test, describe, expect } from 'test/methods.js';
import { vi } from 'vitest';
import { createC2pa } from './c2pa.js';
import { Reader } from './reader.js';
import { AssetTooLargeError, Context, Settings } from '@contentauth/c2pa-utilities';
import { UnsupportedFormatError } from './error.js';
import { getBlobForAsset } from 'test/utils.js';
import { MAX_SIZE_IN_BYTES } from './reader.js';

import wasmSrc from '@contentauth/c2pa-web/resources/c2pa.wasm?url';

import C_with_CAWG_data from 'test/assets/C_with_CAWG_data.jpg';
import C_with_CAWG_data_thumbnail from 'test/assets/C_with_CAWG_data_thumbnail.jpg';
import C_with_CAWG_data_ManifestStore from 'test/manifests/C_with_CAWG_data.js';

import C_with_CAWG_data_trusted_ManifestStore from 'test/manifests/C_with_CAWG_data_trusted.js';
import C_with_CAWG_data_untrusted_ManifestStore from 'test/manifests/C_with_CAWG_data_untrusted.js';
import no_alg from 'test/assets/no_alg.jpg';
import PirateShip_cloud from 'test/assets/PirateShip_save_credentials_to_cloud.jpg';
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

        const reader = await Reader.fromBlob(c2pa, blob.type, blob);

        expect(reader).not.toBeNull();

        const manifestStore = await reader!.manifestStore();

        expect(manifestStore).toEqual(C_with_CAWG_data_untrusted_ManifestStore);
      });

      test('should return null when reading an asset with no C2PA data', async ({
        c2pa
      }) => {
        const blob = await getBlobForAsset(C_with_CAWG_data_thumbnail);

        const reader = await Reader.fromBlob(c2pa, blob.type, blob);

        expect(reader).toBeNull();
      });

      test('should throw UnsupportedFormatError for an unsupported format', async ({
        c2pa
      }) => {
        const blob = await getBlobForAsset(C_with_CAWG_data);

        await expect(
          Reader.fromBlob(c2pa, 'application/x-not-real', blob)
        ).rejects.toThrow(UnsupportedFormatError);
      });

      test('should throw AssetTooLargeError when the blob exceeds the max size', async ({
        c2pa
      }) => {
        const blob = await getBlobForAsset(C_with_CAWG_data);
        Object.defineProperty(blob, 'size', {
          value: MAX_SIZE_IN_BYTES + 1
        });

        await expect(Reader.fromBlob(c2pa, blob.type, blob)).rejects.toThrow(
          AssetTooLargeError
        );
      });

      test('should apply the given Context', async () => {
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

        const c2pa = await createC2pa({ wasmSrc });

        const blob = await getBlobForAsset(C_with_CAWG_data);

        const reader = await Reader.fromBlob(
          c2pa,
          blob.type,
          blob,
          new Context(settings)
        );

        expect(reader).not.toBeNull();

        const manifestStore = await reader!.manifestStore();

        expect(manifestStore).toEqual(C_with_CAWG_data_trusted_ManifestStore);

        c2pa.dispose();
      });

      test('supports different Contexts for Readers created from the same c2pa instance', async () => {
        // One worker/wasm instance (one createC2pa() call), two Readers with opposite trust
        // configurations — the whole point of Context no longer being tied to the runtime handle.
        const c2pa = await createC2pa({ wasmSrc });

        const trustedContext = new Context({
          trust: { trustAnchors: anchor_correct },
          cawgTrust: { trustAnchors: anchor_cawg },
          verify: { verifyTrust: true }
        });
        const untrustedContext = new Context({
          trust: { trustAnchors: anchor_incorrect },
          verify: { verifyTrust: true }
        });

        const blobA = await getBlobForAsset(C_with_CAWG_data);
        const blobB = await getBlobForAsset(C_with_CAWG_data);

        const trustedReader = await Reader.fromBlob(
          c2pa,
          blobA.type,
          blobA,
          trustedContext
        );
        const untrustedReader = await Reader.fromBlob(
          c2pa,
          blobB.type,
          blobB,
          untrustedContext
        );

        expect(await trustedReader!.manifestStore()).toEqual(
          C_with_CAWG_data_trusted_ManifestStore
        );
        expect(await untrustedReader!.manifestStore()).toEqual(
          C_with_CAWG_data_untrusted_ManifestStore
        );

        c2pa.dispose();
      });

      test('does not re-resolve the same Context on repeated fromBlob calls', async () => {
        const context = new Context({ verify: { verifyTrust: false } });
        const toJsonSpy = vi.spyOn(context, 'toJson');

        const c2pa = await createC2pa({ wasmSrc });
        const blob = await getBlobForAsset(C_with_CAWG_data);

        await Reader.fromBlob(c2pa, blob.type, blob, context);
        await Reader.fromBlob(c2pa, blob.type, blob, context);

        // Both calls invoke Context.toJson(), but it memoizes internally: the exact same
        // Promise is returned both times, so settings are only ever resolved once.
        expect(toJsonSpy).toHaveBeenCalledTimes(2);
        const [firstCall, secondCall] = toJsonSpy.mock.results;
        expect(secondCall.value).toBe(firstCall.value);

        c2pa.dispose();
      });
    });

    describe('fromBlobFragment', () => {
      test('should return c2pa data from an initial segment and fragment', async ({
        c2pa
      }) => {
        const initBlob = await getBlobForAsset(dashinit);
        const fragmentBlob = await getBlobForAsset(dash1);

        const reader = await Reader.fromBlobFragment(
          c2pa,
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

        const reader = await Reader.fromBlobFragment(
          c2pa,
          initBlob.type,
          initBlob,
          fragmentBlob
        );

        expect(reader).toBeNull();
      });

      test('should throw UnsupportedFormatError for an unsupported format', async ({
        c2pa
      }) => {
        const initBlob = await getBlobForAsset(dashinit);
        const fragmentBlob = await getBlobForAsset(dash1);

        await expect(
          Reader.fromBlobFragment(
            c2pa,
            'application/x-not-real',
            initBlob,
            fragmentBlob
          )
        ).rejects.toThrow(UnsupportedFormatError);
      });

      test('should throw AssetTooLargeError when the init blob exceeds the max size', async ({
        c2pa
      }) => {
        const initBlob = await getBlobForAsset(dashinit);
        const fragmentBlob = await getBlobForAsset(dash1);
        Object.defineProperty(initBlob, 'size', {
          value: MAX_SIZE_IN_BYTES + 1
        });

        await expect(
          Reader.fromBlobFragment(c2pa, initBlob.type, initBlob, fragmentBlob)
        ).rejects.toThrow(AssetTooLargeError);
      });

      test('should throw AssetTooLargeError when the fragment blob exceeds the max size', async ({
        c2pa
      }) => {
        const initBlob = await getBlobForAsset(dashinit);
        const fragmentBlob = await getBlobForAsset(dash1);
        Object.defineProperty(fragmentBlob, 'size', {
          value: MAX_SIZE_IN_BYTES + 1
        });

        await expect(
          Reader.fromBlobFragment(c2pa, initBlob.type, initBlob, fragmentBlob)
        ).rejects.toThrow(AssetTooLargeError);
      });
    });
  });

  describe('methods', () => {
    describe('resourceToBytes', () => {
      test('should return an embedded thumbnail', async ({ c2pa }) => {
        const blob = await getBlobForAsset(C_with_CAWG_data);

        const reader = await Reader.fromBlob(c2pa, blob.type, blob);

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

        const reader = await Reader.fromBlob(c2pa, blob.type, blob);

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

      const readerPromise = Reader.fromBlob(c2pa, blob.type, blob);

      await expect(readerPromise).rejects.toThrowError(
        'C2pa(UnknownAlgorithm)'
      );
    });
  });

  test('should report a trusted asset when when configured to verify trust', async ({
    c2pa
  }) => {
    const context = new Context({
      trust: {
        trustAnchors: anchor_correct
      },
      cawgTrust: {
        trustAnchors: anchor_cawg
      },
      verify: {
        verifyTrust: true
      }
    });

    const blob = await getBlobForAsset(C_with_CAWG_data);

    const reader = await Reader.fromBlob(c2pa, blob.type, blob, context);

    expect(reader).not.toBeNull();

    const manifestStore = await reader!.manifestStore();

    expect(manifestStore).toEqual(C_with_CAWG_data_trusted_ManifestStore);
  });

  test('should report an untrusted asset when configured to verify trust', async ({
    c2pa
  }) => {
    const context = new Context({
      trust: {
        trustAnchors: anchor_incorrect
      },
      verify: {
        verifyTrust: true
      }
    });

    const blob = await getBlobForAsset(C_with_CAWG_data);

    const reader = await Reader.fromBlob(c2pa, blob.type, blob, context);

    expect(reader).not.toBeNull();

    const manifestStore = await reader!.manifestStore();

    expect(manifestStore).toEqual(C_with_CAWG_data_untrusted_ManifestStore);
  });

  test('should report a "valid" (not "trusted") asset when trust settings are disabled', async ({
    c2pa
  }) => {
    const context = new Context({
      verify: {
        verifyTrust: false
      },
      cawgTrust: {
        verifyTrustList: false
      }
    });

    const blob = await getBlobForAsset(C_with_CAWG_data);

    const reader = await Reader.fromBlob(c2pa, blob.type, blob, context);

    expect(reader).not.toBeNull();

    const manifestStore = await reader!.manifestStore();

    expect(manifestStore).toEqual(C_with_CAWG_data_ManifestStore);
  });

  test('should fetch the remote manifest', async ({ c2pa }) => {
    const blob = await getBlobForAsset(PirateShip_cloud);

    const reader = await Reader.fromBlob(c2pa, blob.type, blob);

    expect(reader).not.toBeNull();

    const manifestStore = await reader!.manifestStore();
    expect(manifestStore).toBeDefined();
    expect(manifestStore.manifests).toBeDefined();

    const activeManifestLabel = manifestStore.active_manifest!;
    const activeManifest = manifestStore.manifests![activeManifestLabel];
    expect(activeManifest).toBeDefined();

    const actionsAssertions = activeManifest.assertions?.filter(
      (a: { label: string }) =>
        a.label === 'c2pa.actions' || a.label === 'c2pa.actions.v2'
    );
    expect(actionsAssertions!.length).toBe(1);
  });

  // TODO: can this test be written to track the status of the underlying object instead of checking for an error?
  test('should be freeable', async ({ c2pa }) => {
    const blob = await getBlobForAsset(C_with_CAWG_data);

    const reader = await Reader.fromBlob(c2pa, blob.type, blob);

    expect(reader).not.toBeNull();

    await reader!.free();

    await expect(reader!.manifestStore()).rejects.toThrowError();
  });
});
