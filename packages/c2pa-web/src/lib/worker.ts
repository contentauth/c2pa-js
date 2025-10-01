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
  WasmBuilder,
} from '@contentauth/c2pa-wasm';
import { createWorkerObjectMap } from './worker/workerObjectMap.js';
import { createWorkerTx, rx } from './worker/rpc.js';
import { transfer } from 'highgain';

const readerMap = createWorkerObjectMap<WasmReader>();
const builderMap = createWorkerObjectMap<WasmBuilder>();

const tx = createWorkerTx();

rx({
  async initWorker(module, settings) {
    initSync(module);
    if (settings) {
      loadSettings(settings);
    }
  },
  async reader_fromBlob(format, blob) {
    const reader = await WasmReader.fromBlob(format, blob);
    const readerId = readerMap.add(reader);
    return readerId;
  },
  async reader_fromBlobFragment(format, init, fragment) {
    const reader = await WasmReader.fromBlobFragment(format, init, fragment);
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
  reader_resourceToBuffer(readerId, uri) {
    const reader = readerMap.get(readerId);
    const buffer = reader.resourceToBuffer(uri);
    return transfer(buffer);
  },
  reader_free(readerId) {
    const reader = readerMap.get(readerId);
    reader.free();
    readerMap.remove(readerId);
  },
  builder_fromJson(json: string) {
    const builder = WasmBuilder.fromJson(json);
    const builderId = builderMap.add(builder);
    return builderId;
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
  async builder_sign(builderId, requestId, payload, format, blob) {
    const builder = builderMap.get(builderId);
    const signedBytes = await builder.sign(
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
        },
      },
      format,
      blob
    );
    return transfer(signedBytes, signedBytes.buffer);
  },
  builder_free(builderId) {
    const builder = builderMap.get(builderId);
    builder.free();
    builderMap.remove(builderId);
  },
});
