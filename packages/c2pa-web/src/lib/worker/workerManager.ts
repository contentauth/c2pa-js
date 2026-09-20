/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import type {
  ProgressReportEvent,
  ProgressPhase
} from '@contentauth/c2pa-utilities';
import { CredentialHolder, Signer } from '../signer.js';
import { createTx, workerRx, isProgressMessage } from './rpc.js';
import InlineWorker from '../worker?worker&inline';
import { transfer } from 'highgain';

export interface WorkerManager {
  tx: ReturnType<typeof createTx>;
  registerSignReceiver: (signFn: Signer['sign']) => number;
  registerCredentialHolderReceiver: (
    signFn: CredentialHolder['sign']
  ) => number;
  /**
   * Registers a progress handler and returns the id identifying this operation.
   * Must be unregistered once the operation has settled.
   */
  registerProgressReceiver: (
    onProgress: (event: ProgressReportEvent) => void
  ) => {
    operationId: number;
    unregister: () => void;
  };
  /**
   * Registers a progress handler against an operation id reserved earlier.
   * Returns the function that unregisters it.
   */
  registerProgressHandler: (
    operationId: number,
    onProgress: (event: ProgressReportEvent) => void
  ) => () => void;
  /**
   * Reserves an operation id without registering a progress handler.
   * Only operations with ids can be cancelled.
   */
  nextOperationId: () => number;
  terminate: () => void;
}

export interface CreateWorkerManagerConfig {
  wasm: WebAssembly.Module;
  workerSrc?: URL;
}

/**
 * Validates a worker source URL before it is loaded into a Worker. The value
 * must be a structurally valid URL served over https, since arbitrary or
 * insecure sources would let untrusted code run in the worker context.
 *
 * @param workerSrc - the worker source URL to validate
 * @returns the normalized URL string, safe to pass to `new Worker`
 * @throws if the value is not a valid URL or does not use https
 */
export function validateWorkerSrc(workerSrc: URL): string {
  if (workerSrc.protocol !== 'https:') {
    throw new Error(
      `Worker source URL must use https, but got ${workerSrc.protocol}`
    );
  }

  return workerSrc.toString();
}

/**
 * Creates a new web worker and performs initialization steps:
 * - Compile WASM
 *
 * @param config - configuration object
 * @returns Facade providing convenient control over worker functions
 */
export async function createWorkerManager(
  config: CreateWorkerManagerConfig
): Promise<WorkerManager> {
  const { wasm, workerSrc } = config;
  let signerRequestId = 0;

  const worker = workerSrc
    ? new Worker(validateWorkerSrc(workerSrc), { type: 'module' })
    : new InlineWorker();

  const tx = createTx(worker);

  const signingRequestMap = new Map<number, Signer['sign']>();
  const credentialHolderRequestMap = new Map<number, CredentialHolder['sign']>();

  // A progress handler must stick around for multiple operations, so gets own map.
  let progressOperationId = 0;
  const progressHandlers = new Map<
    number,
    (event: ProgressReportEvent) => void
  >();

  // Progress arrives as a raw message rather than over the RPC channel
  // (see PROGRESS_MESSAGE_TYPE), so it needs its own listener.
  worker.addEventListener('message', (event: MessageEvent) => {
    const message = event.data;
    if (!isProgressMessage(message)) {
      return;
    }

    const handler = progressHandlers.get(message.operationId);
    // A late event for a settled operation has no handler: dropping it is intended.
    if (!handler) {
      return;
    }

    try {
      handler({
        phase: message.phase as ProgressPhase,
        step: message.step,
        total: message.total === 0 ? null : message.total
      });
    } catch (e) {
      // Reporting is advisory: a caller's broken handler must not fail their read.
      console.error('c2pa: onProgress callback threw', e);
    }
  });

  workerRx(
    {
      sign: async (id, bytes, reserveSize) => {
        const signFn = signingRequestMap.get(id);
        signingRequestMap.delete(id);
        if (!signFn) {
          throw new Error('No signer registered for request');
        }
        const result = await signFn(bytes, reserveSize);
        return transfer(result, result.buffer);
      },
      // Reverse-RPC handler for a CAWG credential holder's `sign`, mirroring
      // `sign` above: the callback was registered on the main thread by
      // `Builder.sign`/`signAndGetManifestBytes` (see
      // `registerCredentialHolderReceiver`) and is looked up and run here,
      // never inside the worker.
      cawgSign: async (id, payload) => {
        const signFn = credentialHolderRequestMap.get(id);
        credentialHolderRequestMap.delete(id);
        if (!signFn) {
          throw new Error('No credential holder registered for request');
        }
        const result = await signFn(payload);
        return transfer(result, result.buffer);
      }
    },
    worker
  );

  function registerSignReceiver(signFn: Signer['sign']) {
    const id = signerRequestId++;
    signingRequestMap.set(id, signFn);
    return id;
  }

  function registerCredentialHolderReceiver(signFn: CredentialHolder['sign']) {
    const id = signerRequestId++;
    credentialHolderRequestMap.set(id, signFn);
    return id;
  }

  function nextOperationId() {
    return progressOperationId++;
  }

  function registerProgressHandler(
    operationId: number,
    onProgress: (event: ProgressReportEvent) => void
  ) {
    progressHandlers.set(operationId, onProgress);
    return () => {
      progressHandlers.delete(operationId);
    };
  }

  function registerProgressReceiver(
    onProgress: (event: ProgressReportEvent) => void
  ) {
    const operationId = nextOperationId();
    return {
      operationId,
      unregister: registerProgressHandler(operationId, onProgress)
    };
  }

  await tx.initWorker(wasm);

  return {
    tx,
    registerSignReceiver,
    registerCredentialHolderReceiver,
    registerProgressReceiver,
    registerProgressHandler,
    nextOperationId,
    terminate: () => worker.terminate()
  };
}
