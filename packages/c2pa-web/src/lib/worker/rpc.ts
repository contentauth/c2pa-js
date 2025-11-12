/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { Action, BuilderIntent } from '@contentauth/c2pa-types';
import { ManifestAndAssetBytes } from '../builder.js';
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
  reader_resourceToBuffer: (
    readerId: number,
    uri: string
  ) => Uint8Array<ArrayBuffer>;
  reader_free: (readerId: number) => void;

  // Builder construction methods
  builder_new: () => number;
  builder_fromJson: (json: string) => number;
  builder_fromArchive: (archive: Blob) => number;

  // Builder methods
  builder_setIntent: (builderId: number, intent: BuilderIntent) => void;
  builder_addAction: (builderId: number, action: Action) => void;
  builder_setRemoteUrl: (builderId: number, url: string) => void;
  builder_setNoEmbed: (builderId: number, noEmbed: boolean) => void;
  builder_setThumbnailFromBlob: (
    builderId: number,
    format: string,
    blob: Blob
  ) => void;
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
  builder_toArchive: (builderId: number) => Uint8Array<ArrayBuffer>;
  builder_sign: (
    builderId: number,
    requestId: number,
    payload: SerializableSigningPayload,
    format: string,
    blob: Blob
  ) => Promise<Uint8Array<ArrayBuffer>>;
  builder_signAndGetManifestBytes: (
    builderId: number,
    requestId: number,
    payload: SerializableSigningPayload,
    format: string,
    blob: Blob
  ) => Promise<ManifestAndAssetBytes>;
  builder_free: (builderId: number) => void;
}>();

// Define worker-to-browser RPC interface
const { createTx: createWorkerTx, rx: workerRx } = channel<{
  sign: (
    requestId: number,
    bytes: Uint8Array<ArrayBuffer>,
    reserveSize: number
  ) => Promise<Uint8Array<ArrayBuffer>>;
}>('worker');

export { createTx, rx, createWorkerTx, workerRx };
