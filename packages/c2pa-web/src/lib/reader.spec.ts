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
import { Builder } from './builder.js';
import { MAX_CACHED_CONTEXTS } from './worker/rpc.js';
import {
  AssetTooLargeError,
  Context,
  Settings,
  mergeSettings
} from '@contentauth/c2pa-utilities';
import { getBlobForAsset } from 'test/utils.js';
import { MAX_SIZE_IN_BYTES } from './reader.js';

import wasmSrc from '@contentauth/c2pa-web/resources/c2pa.wasm?url';

import C_with_CAWG_data from 'test/assets/C_with_CAWG_data.jpg';
import C_with_CAWG_data_thumbnail from 'test/assets/C_with_CAWG_data_thumbnail.jpg';
import C_JPG from 'test/assets/C.jpg';
import C_with_CAWG_data_ManifestStore from 'test/manifests/C_with_CAWG_data.js';

import C_with_CAWG_data_manifest_trusted_ManifestStore from 'test/manifests/C_with_CAWG_data_manifest_trusted.js';
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

      test('should detect the format from the blob bytes when format is omitted', async ({
        c2pa
      }) => {
        const blob = await getBlobForAsset(C_with_CAWG_data);

        const reader = await Reader.fromBlob(c2pa, undefined, blob);

        expect(reader).not.toBeNull();

        const manifestStore = await reader!.manifestStore();

        expect(manifestStore).toEqual(C_with_CAWG_data_untrusted_ManifestStore);
      });

      test('should honor a lower max size from the given Context', async ({
        c2pa
      }) => {
        const blob = await getBlobForAsset(C_with_CAWG_data);
        const context = new Context(undefined, { maxSizeInBytes: 1 });

        await expect(
          Reader.fromBlob(c2pa, blob.type, blob, context)
        ).rejects.toThrow(AssetTooLargeError);
      });

      test('should honor a higher max size from the given Context', async ({
        c2pa
      }) => {
        const blob = await getBlobForAsset(C_with_CAWG_data);
        Object.defineProperty(blob, 'size', {
          value: MAX_SIZE_IN_BYTES + 1
        });
        const context = new Context(undefined, {
          maxSizeInBytes: MAX_SIZE_IN_BYTES + 2
        });

        // The blob is over this package's default limit so it only resolves if the
        // Context's larger limit is being honored.
        await expect(
          Reader.fromBlob(c2pa, blob.type, blob, context)
        ).resolves.not.toBeNull();
      });

      test('should reject an invalid max size from the given Context', async ({
        c2pa
      }) => {
        const blob = await getBlobForAsset(C_with_CAWG_data);
        const context = new Context(undefined, { maxSizeInBytes: 0 });

        await expect(
          Reader.fromBlob(c2pa, blob.type, blob, context)
        ).rejects.toThrow(RangeError);
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

        expect(manifestStore).toEqual(
          C_with_CAWG_data_manifest_trusted_ManifestStore
        );

        c2pa.dispose();
      });

      test('supports different Contexts for Readers created from the same c2pa instance', async () => {
        // One worker/wasm instance (one createC2pa() call), two Readers with opposite trust configurations
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
          C_with_CAWG_data_manifest_trusted_ManifestStore
        );
        expect(await untrustedReader!.manifestStore()).toEqual(
          C_with_CAWG_data_untrusted_ManifestStore
        );

        c2pa.dispose();
      });

      test('shares matching Contexts across concurrent Readers and Builders', async () => {
        const c2pa = await createC2pa({ wasmSrc });
        const trustedContext = new Context({ verify: { verifyTrust: false } });
        const untrustedContext = new Context({ verify: { verifyTrust: true } });
        const blob = await getBlobForAsset(C_JPG);
        const readers: (Reader | null)[] = [];
        const builders: Builder[] = [];
        const contextSpy = vi.spyOn(c2pa.worker, 'context');

        try {
          const [
            trustedReader,
            untrustedReader,
            trustedBuilder,
            untrustedBuilder
          ] = await Promise.all([
            Reader.fromBlob(c2pa, blob.type, blob, trustedContext),
            Reader.fromBlob(c2pa, blob.type, blob, untrustedContext),
            Builder.new(c2pa, trustedContext),
            Builder.new(c2pa, untrustedContext)
          ]);
          readers.push(trustedReader, untrustedReader);
          builders.push(trustedBuilder, untrustedBuilder);

          expect(trustedReader).not.toBeNull();
          expect(untrustedReader).not.toBeNull();
          expect(await trustedReader!.activeManifest()).toBeDefined();
          expect(await untrustedReader!.activeManifest()).toBeDefined();

          await Promise.all([
            trustedBuilder.addIngredientFromBlob({}, blob.type, blob),
            untrustedBuilder.addIngredientFromBlob({}, blob.type, blob)
          ]);
          const [trustedDefinition, untrustedDefinition] = await Promise.all([
            trustedBuilder.getDefinition(),
            untrustedBuilder.getDefinition()
          ]);
          const trustedFailures =
            trustedDefinition.ingredients?.[0].validation_results?.activeManifest?.failure.map(
              (entry) => entry.code
            ) ?? [];
          const untrustedFailures =
            untrustedDefinition.ingredients?.[0].validation_results?.activeManifest?.failure.map(
              (entry) => entry.code
            ) ?? [];

          expect(trustedFailures).not.toContain('signingCredential.untrusted');
          expect(untrustedFailures).toContain('signingCredential.untrusted');

          const contextMessages = contextSpy.mock.results.map(
            (result) => result.value
          );
          expect(contextMessages).toHaveLength(4);
          const firstMessageBySettings = new Map<string, number>();
          for (const contextMessage of contextMessages) {
            if (contextMessage.json === undefined) {
              expect([...firstMessageBySettings.values()]).toContain(
                contextMessage.id
              );
            } else {
              expect(firstMessageBySettings.has(contextMessage.json)).toBe(
                false
              );
              firstMessageBySettings.set(
                contextMessage.json,
                contextMessage.id
              );
            }
          }
          expect(firstMessageBySettings.size).toBe(2);
          for (const contextId of firstMessageBySettings.values()) {
            expect(
              contextMessages.filter((message) => message.id === contextId)
            ).toHaveLength(2);
          }
        } finally {
          await Promise.all(readers.map((reader) => reader?.free()));
          await Promise.all(builders.map((builder) => builder.free()));
          c2pa.dispose();
        }
      });

      test('resolves updated trust settings only for a new Context and preserves existing Readers', async () => {
        const pemResponses = [anchor_correct, anchor_incorrect];
        const fetchedPemResponses: string[] = [];
        const fetchTrustAnchor = vi.fn(async () => {
          const pem = pemResponses.shift();
          if (!pem) {
            throw new Error('No trust-anchor response remains');
          }
          fetchedPemResponses.push(pem);
          return new Response(pem);
        });
        const createContext = () =>
          new Context(
            {
              trust: { trustAnchors: 'https://trust.test/anchor.pem' },
              verify: { verifyTrust: true }
            },
            undefined,
            { trustFetch: { fetch: fetchTrustAnchor } }
          );
        const context = createContext();
        const c2pa = await createC2pa({ wasmSrc });
        const blob = await getBlobForAsset(C_with_CAWG_data);
        const contextSpy = vi.spyOn(c2pa.worker, 'context');
        let firstReader: Reader | null = null;
        let secondReader: Reader | null = null;
        let freshReader: Reader | null = null;

        try {
          const firstSettingsJson = await context.toJson();
          firstReader = await Reader.fromBlob(c2pa, blob.type, blob, context);
          expect(firstReader).not.toBeNull();
          const firstManifestStore = await firstReader!.manifestStore();
          expect(await context.toJson()).toBe(firstSettingsJson);
          expect(fetchTrustAnchor).toHaveBeenCalledOnce();

          const updatedContext = createContext();
          const updatedSettingsJson = await updatedContext.toJson();
          expect(updatedSettingsJson).not.toBe(firstSettingsJson);
          expect(fetchTrustAnchor).toHaveBeenCalledTimes(2);
          expect(fetchedPemResponses).toEqual([
            anchor_correct,
            anchor_incorrect
          ]);
          const resolvedTrustAnchors = (
            JSON.parse(updatedSettingsJson) as {
              trust?: { anchors?: { trust_anchors?: string }[] };
            }
          ).trust?.anchors?.map(({ trust_anchors }) => trust_anchors);
          expect(resolvedTrustAnchors).toContain(anchor_incorrect);
          expect(resolvedTrustAnchors).not.toContain(anchor_correct);

          secondReader = await Reader.fromBlob(
            c2pa,
            blob.type,
            blob,
            updatedContext
          );
          const freshContext = new Context({
            trust: { trustAnchors: anchor_incorrect },
            verify: { verifyTrust: true }
          });
          freshReader = await Reader.fromBlob(
            c2pa,
            blob.type,
            blob,
            freshContext
          );
          expect(secondReader).not.toBeNull();
          expect(freshReader).not.toBeNull();
          const updatedManifestStore = await secondReader!.manifestStore();
          expect(updatedManifestStore).toEqual(
            await freshReader!.manifestStore()
          );
          expect(updatedManifestStore).not.toEqual(firstManifestStore);
          expect(await firstReader!.manifestStore()).toEqual(
            firstManifestStore
          );
          expect(await context.toJson()).toBe(firstSettingsJson);
          expect(fetchTrustAnchor).toHaveBeenCalledTimes(2);

          const workerContexts = contextSpy.mock.results.map(
            (result) => result.value
          );
          expect(workerContexts).toHaveLength(3);
          expect(workerContexts[0].json).toBe(firstSettingsJson);
          expect(workerContexts[1].json).toBe(updatedSettingsJson);
          expect(workerContexts[1].id).not.toBe(workerContexts[0].id);
          expect(workerContexts[2].id).toBe(workerContexts[1].id);
          expect(workerContexts[2].json).toBeUndefined();
        } finally {
          await Promise.all([
            firstReader?.free(),
            secondReader?.free(),
            freshReader?.free()
          ]);
          c2pa.dispose();
        }
      });

      test('re-registers evicted worker settings and rejects unknown context IDs', async () => {
        const c2pa = await createC2pa({ wasmSrc });
        const builders: number[] = [];
        const firstSettings = '{"builder":{"generate_c2pa_archive":true}}';

        try {
          const firstContext = c2pa.worker.context(firstSettings);
          const firstBuilder = await c2pa.worker.tx.builder_new(firstContext);
          builders.push(firstBuilder);

          for (
            let generation = 1;
            generation <= MAX_CACHED_CONTEXTS;
            generation++
          ) {
            const settings = `${firstSettings}${' '.repeat(generation)}`;
            const builderId = await c2pa.worker.tx.builder_new(
              c2pa.worker.context(settings)
            );
            builders.push(builderId);
          }

          const reRegisteredContext = c2pa.worker.context(firstSettings);
          expect(reRegisteredContext.id).not.toBe(firstContext.id);
          expect(reRegisteredContext.json).toBe(firstSettings);
          const reRegisteredBuilder = await c2pa.worker.tx.builder_new(
            reRegisteredContext
          );
          builders.push(reRegisteredBuilder);
          await expect(
            c2pa.worker.tx.builder_getDefinition(firstBuilder)
          ).resolves.toBeDefined();

          await expect(
            c2pa.worker.tx.builder_new({ id: Number.MAX_SAFE_INTEGER })
          ).rejects.toThrow('Worker context settings have not been registered');
        } finally {
          await Promise.all(
            builders.map((builderId) => c2pa.worker.tx.builder_free(builderId))
          );
          c2pa.dispose();
        }
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

      test('should honor a max size from the given Context', async ({
        c2pa
      }) => {
        const initBlob = await getBlobForAsset(dashinit);
        const fragmentBlob = await getBlobForAsset(dash1);
        const context = new Context(undefined, { maxSizeInBytes: 1 });

        await expect(
          Reader.fromBlobFragment(
            c2pa,
            initBlob.type,
            initBlob,
            fragmentBlob,
            context
          )
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

  test('keeps manifest trust separate from legacy CAWG identity trust', async ({
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

    expect(manifestStore).toEqual(
      C_with_CAWG_data_manifest_trusted_ManifestStore
    );
    expect(manifestStore.validation_results?.activeManifest?.success).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'signingCredential.trusted' })
      ])
    );
    expect(manifestStore.validation_results?.activeManifest?.failure).toEqual([
      expect.objectContaining({ code: 'cawg.x509.credential.untrusted' })
    ]);
    expect(manifestStore.validation_state).toBe('Valid');
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

  test('does not expose its internal worker/id via enumeration or serialization', async ({
    c2pa
  }) => {
    const blob = await getBlobForAsset(C_with_CAWG_data);

    const reader = await Reader.fromBlob(c2pa, blob.type, blob);

    expect(reader).not.toBeNull();

    // Native #private fields are not own enumerable properties, so none of these should
    // reveal the underlying WorkerManager/reader id.
    expect(Object.keys(reader!)).toEqual([]);
    expect(JSON.stringify(reader)).toEqual('{}');
  });

  describe('Context composition', () => {
    test('accepts a Context subclass with explicitly merged settings', async ({
      c2pa
    }) => {
      class CustomContext extends Context {}
      const context = new CustomContext(
        mergeSettings(
          {
            trust: { trustAnchors: anchor_incorrect },
            verify: { verifyTrust: true }
          },
          {
            trust: { trustAnchors: anchor_correct },
            cawgTrust: { trustAnchors: anchor_cawg }
          }
        )
      );

      const blob = await getBlobForAsset(C_with_CAWG_data);

      const reader = await Reader.fromBlob(c2pa, blob.type, blob, context);

      expect(reader).not.toBeNull();

      const manifestStore = await reader!.manifestStore();

      expect(manifestStore).toEqual(
        C_with_CAWG_data_manifest_trusted_ManifestStore
      );

      await reader!.free();
    });
  });
});
