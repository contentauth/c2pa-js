/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

/// <reference lib="webworker" />

import { WasmReader, initSync, loadSettings } from '@contentauth/c2pa-wasm';
import { createWorkerObjectMap } from './worker/workerObjectMap.js';
import { rx } from './worker/rpc.js';
import { transfer } from 'highgain';

const readerMap = createWorkerObjectMap<WasmReader>();

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
});
