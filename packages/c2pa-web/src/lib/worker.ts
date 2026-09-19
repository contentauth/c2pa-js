/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

/// <reference lib="webworker" />

import { WasmReader, initSync, WasmBuilder } from '@contentauth/c2pa-wasm';
import { createWorkerObjectMap } from './worker/workerObjectMap.js';
import {
  createWorkerTx,
  rx,
  PROGRESS_MESSAGE_TYPE,
  type OperationOptions,
  type ProgressMessage
} from './worker/rpc.js';
import { sanitizeManifestStore } from './worker/sanitizeManifestStore.js';
import type { SerializableIdentityAssertion, SignerPayload } from './signer.js';
import { transfer } from 'highgain';

const readerMap = createWorkerObjectMap<WasmReader>();
const builderMap = createWorkerObjectMap<WasmBuilder>();

const tx = createWorkerTx();

/**
 * Maps the serializable `identityAssertions` payload (browser->worker) to the
 * WASM identity-assertion definitions `WasmBuilder.sign`/
 * `signAndGetManifestBytes` expect: each entry's `sign` closure reverse-RPCs
 * into the main thread via `cawgSign`, exactly like the plain signer's `sign`
 * closure above reverse-RPCs via `tx.sign`. The credential holder callback
 * itself never runs in the worker.
 */
function buildWasmIdentityAssertions(
  identityAssertions: SerializableIdentityAssertion[]
) {
  return identityAssertions.map((ia) => ({
    sigType: ia.sigType,
    reserveSize: ia.reserveSize,
    referencedAssertions: ia.referencedAssertions,
    roles: ia.roles,
    sign: async (payload: SignerPayload) => {
      // Transfer the hash buffers nested in referencedAssertions, mirroring
      // how the plain signer's `sign` closure transfers its `bytes` argument.
      const buffers = payload.referencedAssertions.map((ra) => ra.hash.buffer);
      const result = await tx.cawgSign(ia.requestId, transfer(payload, buffers));
      return result;
    }
  }));
}

/**
 * Turns the options received over RPC into the object the WASM entry points read.
 *
 * The wire form carries a `progressOperationId` because a function cannot be cloned
 * across `postMessage`; here that id becomes an actual callback that posts one message
 * per report. Posted raw rather than over the RPC channel: the worker is blocked inside
 * a synchronous operation while these fire, so nothing can be awaited, and a channel
 * call would retain a pending promise per event for a reply no one reads.
 *
 * The settings JSON is not part of this: it travels as its own mandatory argument to
 * each entry point, so a context is always present wherever options are.
 */
function toWasmOptions(options: OperationOptions) {
  const { progressOperationId } = options;

  if (progressOperationId === undefined) {
    return {};
  }

  return {
    progress: (phase: string, step: number, total: number) => {
      const message: ProgressMessage = {
        type: PROGRESS_MESSAGE_TYPE,
        operationId: progressOperationId,
        phase,
        step,
        total
      };
      self.postMessage(message);
    }
  };
}

rx(
  wrapFunctionsForErrorHandling({
    async initWorker(module) {
      initSync({ module });
    },
    async reader_fromBlob(format, blob, contextJson) {
      const reader = await WasmReader.fromBlob(format, blob, contextJson);
      const readerId = readerMap.add(reader);
      return readerId;
    },
    async reader_fromBlobFragment(format, init, fragment, contextJson) {
      const reader = await WasmReader.fromBlobFragment(
        format,
        init,
        fragment,
        contextJson
      );
      const readerId = readerMap.add(reader);
      return readerId;
    },
    async reader_fromBlobWithOptions(format, blob, contextJson, options) {
      const reader = await WasmReader.fromBlobWithOptions(
        format,
        blob,
        contextJson,
        toWasmOptions(options)
      );
      const readerId = readerMap.add(reader);
      return readerId;
    },
    async reader_fromBlobFragmentWithOptions(
      format,
      init,
      fragment,
      contextJson,
      options
    ) {
      const reader = await WasmReader.fromBlobFragmentWithOptions(
        format,
        init,
        fragment,
        contextJson,
        toWasmOptions(options)
      );
      const readerId = readerMap.add(reader);
      return readerId;
    },
    reader_activeLabel(readerId) {
      const reader = readerMap.get(readerId);
      return reader.activeLabel() ?? null;
    },
    reader_manifestStore(readerId) {
      const reader = readerMap.get(readerId);
      return sanitizeManifestStore(reader.manifestStore());
    },
    reader_activeManifest(readerId) {
      const reader = readerMap.get(readerId);
      return reader.activeManifest();
    },
    reader_json(readerId) {
      const reader = readerMap.get(readerId);
      return reader.json();
    },
    reader_crJson(readerId) {
      const reader = readerMap.get(readerId);
      return reader.crJson();
    },
    reader_resourceToBytes(readerId, uri) {
      const reader = readerMap.get(readerId);
      const buffer = reader.resourceToBytes(uri) as Uint8Array<ArrayBuffer>;
      return transfer(buffer, buffer.buffer);
    },
    reader_free(readerId) {
      const reader = readerMap.get(readerId);
      reader.free();
      readerMap.remove(readerId);
    },
    builder_new(contextJson) {
      const builder = WasmBuilder.new(contextJson);
      const builderId = builderMap.add(builder);
      return builderId;
    },
    builder_fromJson(json: string, contextJson) {
      const builder = WasmBuilder.fromJson(json, contextJson);
      const builderId = builderMap.add(builder);
      return builderId;
    },
    builder_fromArchive(archive, contextJson) {
      const builder = WasmBuilder.fromArchive(archive, contextJson);
      const builderId = builderMap.add(builder);
      return builderId;
    },
    builder_newWithOptions(contextJson, options) {
      const builder = WasmBuilder.newWithOptions(
        contextJson,
        toWasmOptions(options)
      );
      const builderId = builderMap.add(builder);
      return builderId;
    },
    builder_fromJsonWithOptions(json: string, contextJson, options) {
      const builder = WasmBuilder.fromJsonWithOptions(
        json,
        contextJson,
        toWasmOptions(options)
      );
      const builderId = builderMap.add(builder);
      return builderId;
    },
    builder_fromArchiveWithOptions(archive, contextJson, options) {
      const builder = WasmBuilder.fromArchiveWithOptions(
        archive,
        contextJson,
        toWasmOptions(options)
      );
      const builderId = builderMap.add(builder);
      return builderId;
    },
    builder_setIntent(builderId, intent) {
      const builder = builderMap.get(builderId);
      builder.setIntent(intent);
    },
    builder_addAction(builderId, action) {
      const builder = builderMap.get(builderId);
      builder.addAction(action);
    },
    builder_addAssertion(builderId, label, data) {
      const builder = builderMap.get(builderId);
      builder.addAssertion(label, data);
    },
    builder_addRedaction(builderId, uri, reason) {
      const builder = builderMap.get(builderId);
      builder.addRedaction(uri, reason);
    },
    builder_filterActionsAt(builderId, indices) {
      const builder = builderMap.get(builderId);
      builder.filterActionsAt(Uint32Array.from(indices));
    },
    builder_updateActionsAt(builderId, actionGroups) {
      const builder = builderMap.get(builderId);
      builder.updateActionsAt(actionGroups);
    },
    builder_filterIngredientsAt(builderId, indices) {
      const builder = builderMap.get(builderId);
      builder.filterIngredientsAt(Uint32Array.from(indices));
    },
    builder_filterActionsAndIngredientsAt(
      builderId,
      actionIndices,
      ingredientIndices
    ) {
      const builder = builderMap.get(builderId);
      builder.filterActionsAndIngredientsAt(
        Uint32Array.from(actionIndices),
        Uint32Array.from(ingredientIndices)
      );
    },
    builder_setRemoteUrl(builderId, url) {
      const builder = builderMap.get(builderId);
      builder.setRemoteUrl(url);
    },
    builder_setNoEmbed(builderId, noEmbed) {
      const builder = builderMap.get(builderId);
      builder.setNoEmbed(noEmbed);
    },
    builder_setThumbnailFromBlob(builderId, format, blob) {
      const builder = builderMap.get(builderId);
      builder.setThumbnailFromBlob(format, blob);
    },
    builder_addIngredient(builderId, json) {
      const builder = builderMap.get(builderId);
      builder.addIngredient(json);
    },
    async builder_addIngredientFromBlob(builderId, json, format, blob) {
      const builder = builderMap.get(builderId);
      await builder.addIngredientFromBlob(json, format, blob);
    },
    builder_addResourceFromBlob(builderId, id, blob) {
      const builder = builderMap.get(builderId);
      builder.addResourceFromBlob(id, blob);
    },
    builder_getDefinition(builderId) {
      const builder = builderMap.get(builderId);
      return builder.getDefinition();
    },
    builder_toArchive(builderId) {
      const builder = builderMap.get(builderId);
      const archive = builder.toArchive() as Uint8Array<ArrayBuffer>;
      return transfer(archive, archive.buffer);
    },
    async builder_sign(
      builderId,
      requestId,
      payload,
      identityAssertions,
      format,
      blob
    ) {
      const builder = builderMap.get(builderId);
      const signedBytes = (await builder.sign(
        {
          reserveSize: payload.reserveSize,
          alg: payload.alg,
          sign: async (bytes) => {
            const result = await tx.sign(
              requestId,
              transfer(bytes, bytes.buffer),
              payload.reserveSize
            );
            return result;
          }
        },
        buildWasmIdentityAssertions(identityAssertions),
        format,
        blob
      )) as Uint8Array<ArrayBuffer>;
      return transfer(signedBytes, signedBytes.buffer);
    },
    async builder_signAndGetManifestBytes(
      builderId,
      requestId,
      payload,
      identityAssertions,
      format,
      blob
    ) {
      const builder = builderMap.get(builderId);
      const { manifest, asset } = await builder.signAndGetManifestBytes(
        {
          reserveSize: payload.reserveSize,
          alg: payload.alg,
          sign: async (bytes) => {
            const result = await tx.sign(
              requestId,
              transfer(bytes, bytes.buffer),
              payload.reserveSize
            );
            return result;
          }
        },
        buildWasmIdentityAssertions(identityAssertions),
        format,
        blob
      );

      return transfer(
        {
          manifest,
          asset
        },
        [manifest.buffer, asset.buffer]
      );
    },
    builder_free(builderId) {
      const builder = builderMap.get(builderId);
      builder.free();
      builderMap.remove(builderId);
    }
  })
);

/**
 * Wraps all functions with additional error-handling code that converts any thrown strings into Error objects.
 * This is only necessary because a bug (likely in wasm-bindgen, see https://github.com/wasm-bindgen/wasm-bindgen/issues/4961)
 * prevents the proper handling of Error objects. As a workaround, we "throw" strings from our wasm-bindgen
 * functions and convert them into errors here.
 */
function wrapFunctionsForErrorHandling<
  T extends Record<string, (...args: any[]) => any>
>(functions: T): T {
  const wrappedFunctions = {} as Record<string, (...args: any[]) => any>;

  for (const [fnName, fn] of Object.entries(functions)) {
    wrappedFunctions[fnName] = async (...args: any[]) => {
      try {
        return await fn(...args);
      } catch (e) {
        if (typeof e === 'string') {
          throw new Error(e);
        }

        throw e;
      }
    };
  }

  return wrappedFunctions as T;
}
