/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import type { SerializableSigningPayload } from '../signer.js';

import { channel } from 'highgain';

// Define browser-to-worker RPC interface
const { createTx, rx } = channel<{
  initWorker: (module: WebAssembly.Module, settings?: string) => void;

  // Reader construction methods
  reader_fromBlob: (format: string, blob: Blob) => Promise<number>;
  reader_fromBlobFragment: (
    format: string,
    init: Blob,
    fragment: Blob
  ) => Promise<number>;

  // Reader methods
  reader_activeLabel: (readerId: number) => string | null;
  reader_manifestStore: (readerId: number) => any;
  reader_activeManifest: (readerId: number) => any;
  reader_json: (readerId: number) => string;
  reader_resourceToBuffer: (readerId: number, uri: string) => ArrayBuffer;
  reader_free: (readerId: number) => void;

  // Builder construction methods
  builder_fromJson: (json: string) => number;

  // Builder methods
  builder_addIngredientFromBlob: (
    builderId: number,
    json: string,
    format: string,
    blob: Blob
  ) => void;
  builder_addResourceFromBlob: (
    builderId: number,
    id: string,
    blob: Blob
  ) => void;
  builder_getDefinition: (builderId: number) => any;
  builder_sign: (
    builderId: number,
    requestId: number,
    payload: SerializableSigningPayload,
    format: string,
    blob: Blob
  ) => Promise<Uint8Array>;
  builder_free: (builderId: number) => void;
}>();

// Define worker-to-browser RPC interface
const { createTx: createWorkerTx, rx: workerRx } = channel<{
  sign: (
    requestId: number,
    bytes: Uint8Array,
    reserveSize: number
  ) => Promise<Uint8Array>;
}>('worker');

export { createTx, rx, createWorkerTx, workerRx };
