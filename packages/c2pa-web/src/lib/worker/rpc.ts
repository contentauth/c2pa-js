/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { Action, BuilderIntent, C2paReason } from '@contentauth/c2pa-types';
import { ManifestAndAssetBytes } from '../builder.js';
import type {
  SerializableIdentityAssertion,
  SerializableSigningPayload,
  SignerPayload
} from '../signer.js';

import { channel } from 'highgain';

/**
 * Per-operation options for the `*WithOptions` constructors. Excludes the context,
 * which travels as its own mandatory parameter: options configure an operation a
 * `Context` already defines, so a signature carrying options without one would
 * describe a state that cannot exist. Must stay structured-cloneable — a callback is
 * represented by the id the main thread registered it under, not the callback itself.
 */
export interface OperationOptions {
  /** Identifies this operation on the main thread and in the worker's cancellation
   * set. Present when the caller supplied `onProgress`, a `signal`, or both. */
  operationId?: number;

  /** Whether the caller supplied `onProgress`. When false, the worker still installs
   * a progress closure for a cancellable operation, but posts no events. */
  reportsProgress?: boolean;

  /** Whether the caller supplied an `AbortSignal`. That closure is the only place
   * cancellation can be observed, so it is installed even with no `onProgress`. */
  cancellable?: boolean;
}

// Define browser-to-worker RPC interface
const { createTx, rx } = channel<{
  initWorker: (module: WebAssembly.Module) => void;

  // Reader construction methods
  reader_fromBlob: (
    format: string,
    blob: Blob,
    contextJson?: string
  ) => Promise<number>;
  reader_fromBlobFragment: (
    format: string,
    init: Blob,
    fragment: Blob,
    contextJson?: string
  ) => Promise<number>;

  // Separate methods, not extra parameters, so the originals keep their exact
  // contract; an options object rather than positional flags so a later capability
  // extends OperationOptions instead of adding another method pair.
  reader_fromBlobWithOptions: (
    format: string,
    blob: Blob,
    contextJson: string,
    options: OperationOptions
  ) => Promise<number>;
  reader_fromBlobFragmentWithOptions: (
    format: string,
    init: Blob,
    fragment: Blob,
    contextJson: string,
    options: OperationOptions
  ) => Promise<number>;

  // Requests cancellation of an in-flight operation. The progress closure observes
  // it at the engine's next checkpoint, so cancellation is never immediate.
  operation_cancel: (operationId: number) => void;

  // Reader methods
  reader_activeLabel: (readerId: number) => string | null;
  reader_manifestStore: (readerId: number) => any;
  reader_activeManifest: (readerId: number) => any;
  reader_json: (readerId: number) => string;
  reader_crJson: (readerId: number) => string;
  reader_resourceToBytes: (
    readerId: number,
    uri: string
  ) => Uint8Array<ArrayBuffer>;
  reader_free: (readerId: number) => void;

  // Builder construction methods
  builder_new: (contextJson?: string) => number;
  builder_fromJson: (json: string, contextJson?: string) => number;
  builder_fromArchive: (archive: Blob, contextJson?: string) => number;

  // Mirrors the reader pair. A builder reports progress during signing.
  builder_newWithOptions: (
    contextJson: string,
    options: OperationOptions
  ) => number;
  builder_fromJsonWithOptions: (
    json: string,
    contextJson: string,
    options: OperationOptions
  ) => number;
  builder_fromArchiveWithOptions: (
    archive: Blob,
    contextJson: string,
    options: OperationOptions
  ) => number;

  // Builder methods
  builder_setIntent: (builderId: number, intent: BuilderIntent) => void;
  builder_addAction: (builderId: number, action: Action) => void;
  builder_addAssertion: (
    builderId: number,
    label: string,
    data: unknown,
  ) => void;
  builder_addRedaction: (builderId: number, uri: string, reason: C2paReason) => void;
  builder_filterActionsAt: (builderId: number, indices: number[]) => void;
  builder_updateActionsAt: (builderId: number, actionGroups: Action[][]) => void;
  builder_filterIngredientsAt: (builderId: number, indices: number[]) => void;
  builder_filterActionsAndIngredientsAt: (
    builderId: number,
    actionIndices: number[],
    ingredientIndices: number[],
  ) => void;
  builder_setRemoteUrl: (builderId: number, url: string) => void;
  builder_setNoEmbed: (builderId: number, noEmbed: boolean) => void;
  builder_setThumbnailFromBlob: (
    builderId: number,
    format: string,
    blob: Blob
  ) => void;
  builder_addIngredient: (builderId: number, json: string) => void;
  builder_addIngredientFromBlob: (
    builderId: number,
    json: string,
    format: string,
    blob: Blob
  ) => Promise<void>;
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
    identityAssertions: SerializableIdentityAssertion[],
    format: string,
    blob: Blob
  ) => Promise<Uint8Array<ArrayBuffer>>;
  builder_signAndGetManifestBytes: (
    builderId: number,
    requestId: number,
    payload: SerializableSigningPayload,
    identityAssertions: SerializableIdentityAssertion[],
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
  // Reverse-RPC for a CAWG credential holder's `sign`, mirroring `sign` above.
  // The credential-holder callback lives on the main thread (it's supplied by
  // the caller of `Builder.sign`/`signAndGetManifestBytes`), so the worker
  // calls back into the browser instead of invoking it directly.
  cawgSign: (
    requestId: number,
    payload: SignerPayload
  ) => Promise<Uint8Array<ArrayBuffer>>;
}>('worker');

/** Discriminator for progress messages, posted raw rather than through highgain's RPC
 * channels since highgain allocates a `{resolve, reject}` pair per call — the wrong
 * shape for a one-way stream of many events. */
export const PROGRESS_MESSAGE_TYPE = 'c2pa:progress';

/** A single progress report travelling worker -> main thread. */
export interface ProgressMessage {
  type: typeof PROGRESS_MESSAGE_TYPE;
  operationId: number;
  phase: string;
  step: number;
  total: number;
}

export function isProgressMessage(data: unknown): data is ProgressMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { type?: unknown }).type === PROGRESS_MESSAGE_TYPE
  );
}

export { createTx, rx, createWorkerTx, workerRx };
