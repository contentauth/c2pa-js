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
import { AssetTooLargeError, Settings } from '@contentauth/c2pa-utilities';
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
import { http, HttpResponse } from 'msw';
import type { SetupWorker } from 'msw/browser';

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

      test('should throw UnsupportedFormatError for an unsupported format', async ({
        c2pa
      }) => {
        const blob = await getBlobForAsset(C_with_CAWG_data);

        await expect(
          c2pa.reader.fromBlob('application/x-not-real', blob)
        ).rejects.toThrow(UnsupportedFormatError);
      });

      test('should throw AssetTooLargeError when the blob exceeds the max size', async ({
        c2pa
      }) => {
        const blob = await getBlobForAsset(C_with_CAWG_data);
        Object.defineProperty(blob, 'size', {
          value: MAX_SIZE_IN_BYTES + 1
        });

        await expect(c2pa.reader.fromBlob(blob.type, blob)).rejects.toThrow(
          AssetTooLargeError
        );
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

        // Using the overrideSettings, the asset is trusted.
        expect(manifestStore).toEqual(C_with_CAWG_data_trusted_ManifestStore);

        c2pa.dispose();
      });

      test('should inherit global settings when per-call settings are provided', async () => {
        // Global settings contain trust anchors and enable trust verification.
        const globalSettings: Settings = {
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

        // Per-call settings touch an unrelated key and do NOT specify trust anchors.
        const perCallSettings: Settings = {
          verify: {
            verifyAfterReading: true
          }
        };

        const c2pa = await createC2pa({ wasmSrc, settings: globalSettings });

        const blob = await getBlobForAsset(C_with_CAWG_data);

        const reader = await c2pa.reader.fromBlob(blob.type, blob, perCallSettings);

        expect(reader).not.toBeNull();

        const manifestStore = await reader!.manifestStore();

        // Trust anchors from globalSettings should still be in effect, so the asset is trusted.
        expect(manifestStore).toEqual(C_with_CAWG_data_trusted_ManifestStore);

        c2pa.dispose();
      });

      test('should allow per-call settings to override conflicting global settings', async () => {
        // Global settings contain trust anchors and enable trust verification.
        const globalSettings: Settings = {
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

        // Per-call settings replace trustAnchors with an incorrect anchor, so the
        // asset should come back untrusted despite the correct anchor in globalSettings.
        const perCallSettings: Settings = {
          trust: {
            trustAnchors: anchor_incorrect
          }
        };

        const c2pa = await createC2pa({ wasmSrc, settings: globalSettings });

        const blob = await getBlobForAsset(C_with_CAWG_data);

        const reader = await c2pa.reader.fromBlob(blob.type, blob, perCallSettings);

        expect(reader).not.toBeNull();

        const manifestStore = await reader!.manifestStore();

        // Per-call anchor wins over the global one, so the result is untrusted.
        expect(manifestStore).toEqual(C_with_CAWG_data_untrusted_ManifestStore);

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

      test('should throw UnsupportedFormatError for an unsupported format', async ({
        c2pa
      }) => {
        const initBlob = await getBlobForAsset(dashinit);
        const fragmentBlob = await getBlobForAsset(dash1);

        await expect(
          c2pa.reader.fromBlobFragment(
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
          c2pa.reader.fromBlobFragment(initBlob.type, initBlob, fragmentBlob)
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
          c2pa.reader.fromBlobFragment(initBlob.type, initBlob, fragmentBlob)
        ).rejects.toThrow(AssetTooLargeError);
      });

      test('should inherit global settings when per-call settings are provided', async () => {
        // Enable trust verification globally.
        const globalSettings: Settings = {
          verify: {
            verifyTrust: true
          }
        };

        // Per-call settings touch an unrelated key only.
        const perCallSettings: Settings = {
          verify: {
            verifyAfterReading: true
          }
        };

        const c2pa = await createC2pa({ wasmSrc, settings: globalSettings });

        const initBlob = await getBlobForAsset(dashinit);
        const fragmentBlob = await getBlobForAsset(dash1);

        const reader = await c2pa.reader.fromBlobFragment(
          initBlob.type,
          initBlob,
          fragmentBlob,
          perCallSettings
        );

        expect(reader).not.toBeNull();

        const manifestStore = await reader!.manifestStore();

        // Trust verification from globalSettings should still be in effect, so the
        // result should match the manifest store produced with trust verification on.
        expect(manifestStore).toEqual(dashinit_ManifestStore);

        c2pa.dispose();
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

  test('should fetch the remote manifest', async ({ c2pa }) => {
    const blob = await getBlobForAsset(PirateShip_cloud);

    const reader = await c2pa.reader.fromBlob(blob.type, blob);

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

    const reader = await c2pa.reader.fromBlob(blob.type, blob);

    expect(reader).not.toBeNull();

    await reader!.free();

    await expect(reader!.manifestStore()).rejects.toThrowError();
  });
});

describe('fromUrl range modes', () => {
  // Serves an in-memory asset over HTTP Range so a test controls the exact bytes
  // the reader sees. Records every range served so a test can assert how much was
  // fetched and in what size pieces.
  function serveRanges(
    requestMock: SetupWorker,
    url: string,
    bytes: Uint8Array
  ): { lengths: number[] } {
    const served = { lengths: [] as number[] };

    requestMock.use(
      http.get(url, ({ request }) => {
        const range = request.headers.get('Range');
        const match = range?.match(/bytes=(\d+)-(\d+)/);
        if (!match) {
          return new HttpResponse(bytes, {
            status: 200,
            headers: { 'Content-Length': String(bytes.length) }
          });
        }

        const start = Number(match[1]);
        const endInclusive = Math.min(Number(match[2]), bytes.length - 1);
        const slice = bytes.slice(start, endInclusive + 1);
        served.lengths.push(slice.length);

        return new HttpResponse(slice, {
          status: 206,
          headers: {
            'Content-Range': `bytes ${start}-${endInclusive}/${bytes.length}`,
            'Content-Length': String(slice.length)
          }
        });
      })
    );

    return served;
  }

  async function assetBytes(src: string): Promise<Uint8Array> {
    const blob = await getBlobForAsset(src);
    return new Uint8Array(await blob.arrayBuffer());
  }

  test('verify-async reads a manifest with no worker', async ({
    c2pa,
    requestMock
  }) => {
    const url = 'https://range.test/clean.jpg';
    serveRanges(requestMock, url, await assetBytes(C_with_CAWG_data));

    const reader = await c2pa.reader.fromUrl('image/jpeg', url, {
      mode: 'verify-async'
    });

    expect(reader).not.toBeNull();
    const manifestStore = await reader!.manifestStore();
    expect(manifestStore.active_manifest).toBeDefined();
    expect(manifestStore.validation_state).not.toBe('Invalid');
  });

  // The decisive test: a verifier that always succeeds passes every other check
  // here. Corrupting a byte the manifest covers must be rejected under
  // verify-async and accepted under discover, which also proves the mode string
  // reaches the source it names.
  test('verify-async rejects tampered bytes that discover accepts', async ({
    c2pa,
    requestMock
  }) => {
    const clean = await assetBytes(C_with_CAWG_data);
    const tampered = new Uint8Array(clean);
    // well past the manifest, inside the hashed image data
    tampered[tampered.length - 64] ^= 0xff;

    const discoverUrl = 'https://range.test/tampered-discover.jpg';
    serveRanges(requestMock, discoverUrl, tampered);
    const discovered = await c2pa.reader.fromUrl('image/jpeg', discoverUrl, {
      mode: 'discover'
    });
    const discoveredStore = await discovered!.manifestStore();
    expect(discoveredStore.validation_state).not.toBe('Invalid');

    const verifyUrl = 'https://range.test/tampered-verify.jpg';
    serveRanges(requestMock, verifyUrl, tampered);
    const verified = await c2pa.reader.fromUrl('image/jpeg', verifyUrl, {
      mode: 'verify-async'
    });
    const verifiedStore = await verified!.manifestStore();

    expect(verifiedStore.validation_state).toBe('Invalid');
    const failureCodes = (
      verifiedStore.validation_results?.activeManifest?.failure ?? []
    ).map((s: { code: string }) => s.code);
    expect(failureCodes).toContain('assertion.dataHash.mismatch');
  });

  test('hashChunkBytes bounds how much is fetched at once', async ({
    c2pa,
    requestMock
  }) => {
    const url = 'https://range.test/chunked.jpg';
    const served = serveRanges(
      requestMock,
      url,
      await assetBytes(C_with_CAWG_data)
    );

    const hashChunkBytes = 8 * 1024;
    const reader = await c2pa.reader.fromUrl('image/jpeg', url, {
      mode: 'verify-async',
      hashChunkBytes
    });

    expect(reader).not.toBeNull();
    // Discovery uses the window/max_request knobs, which are larger; the hashing
    // pass is what this bounds. Nothing may exceed the larger of the two.
    expect(Math.max(...served.lengths)).toBeLessThanOrEqual(8 * 1024 * 1024);
    expect(served.lengths.length).toBeGreaterThan(1);
  });
});
