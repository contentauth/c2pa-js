/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

/// <reference lib="webworker" />

import {
  WasmReader,
  initSync,
  loadSettings,
  WasmBuilder
} from '@contentauth/c2pa-wasm';
import { createWorkerObjectMap } from './worker/workerObjectMap.js';
import { createWorkerTx, rx } from './worker/rpc.js';
import { transfer } from 'highgain';

const readerMap = createWorkerObjectMap<WasmReader>();
const builderMap = createWorkerObjectMap<WasmBuilder>();

const tx = createWorkerTx();

rx({
  async initWorker(module, settings) {
    initSync({ module });
    if (settings) {
      loadSettings(settings);
    }
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
  reader_activeLabel(readerId) {
    const reader = readerMap.get(readerId);
    return reader.activeLabel() ?? null;
  },
  reader_manifestStore(readerId) {
    const reader = readerMap.get(readerId);
    return reader.manifestStore();
  },
  reader_activeManifest(readerId) {
    const reader = readerMap.get(readerId);
    return reader.activeManifest();
  },
  reader_json(readerId) {
    const reader = readerMap.get(readerId);
    return reader.json();
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
  builder_setIntent(builderId, intent) {
    const builder = builderMap.get(builderId);
    builder.setIntent(intent);
  },
  builder_addAction(builderId, action) {
    const builder = builderMap.get(builderId);
    builder.addAction(action);
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
  builder_addIngredientFromBlob(builderId, json, format, blob) {
    const builder = builderMap.get(builderId);
    builder.addIngredientFromBlob(json, format, blob);
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
  async builder_sign(builderId, requestId, payload, format, blob) {
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
      format,
      blob
    )) as Uint8Array<ArrayBuffer>;
    return transfer(signedBytes, signedBytes.buffer);
  },
  async builder_signAndGetManifestBytes(
    builderId,
    requestId,
    payload,
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
});
