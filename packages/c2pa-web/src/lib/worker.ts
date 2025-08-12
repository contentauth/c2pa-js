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
  async reader_fromBuffer(
    format: string,
    buffer: ArrayBuffer
  ): Promise<WorkerResponse<number>> {
    const reader = await WasmReader.fromBuffer(format, new Uint8Array(buffer));
    const readerId = readerMap.add(reader);
    return { data: readerId };
  },
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
