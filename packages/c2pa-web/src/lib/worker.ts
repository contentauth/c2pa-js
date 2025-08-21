/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

/// <reference lib="webworker" />

import { WasmReader, initSync } from '@contentauth/c2pa-wasm';
import {
  setupWorker,
  WorkerFunctions,
  WorkerResponse,
} from './worker/setupWorker.js';
import { createWorkerObjectMap } from './worker/workerObjectMap.js';

const readerMap = createWorkerObjectMap<WasmReader>();

const workerFunctions = {
  async initWasm(module: WebAssembly.Module) {
    initSync(module);
  },

  // Reader creation methods
  async reader_fromBlob(
    format: string,
    blob: Blob
  ): Promise<WorkerResponse<number>> {
    const reader = await WasmReader.fromBlob(format, blob);
    const readerId = readerMap.add(reader);
    return { data: readerId };
  },

  // Reader object methods
  reader_json(readerId: number): WorkerResponse<string> {
    const reader = readerMap.get(readerId);
    return { data: reader.json() };
  },
  reader_activeLabel(readerId: number): WorkerResponse<string | null> {
    const reader = readerMap.get(readerId);
    return { data: reader.activeLabel() ?? null };
  },
  reader_resourceToBuffer(
    readerId: number,
    uri: string
  ): WorkerResponse<ArrayBuffer> {
    const reader = readerMap.get(readerId);
    const buffer = reader.resourceToBuffer(uri);
    return { data: buffer, transfer: [buffer] };
  },
  reader_free(readerId: number) {
    const reader = readerMap.get(readerId);
    reader.free();
    readerMap.remove(readerId);
  },
} satisfies WorkerFunctions;

export type WorkerDefinition = typeof workerFunctions;

setupWorker(workerFunctions);
