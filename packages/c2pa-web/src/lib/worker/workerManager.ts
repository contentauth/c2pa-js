/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { CredentialHolder, Signer } from '../signer.js';
import {
  createTx,
  MAX_CACHED_CONTEXTS,
  workerRx,
  type WorkerContext
} from './rpc.js';
import InlineWorker from '../worker?worker&inline';
import { transfer } from 'highgain';

export interface WorkerManager {
  tx: ReturnType<typeof createTx>;
  context: (settingsJson: string) => WorkerContext;
  registerSignReceiver: (signFn: Signer['sign']) => number;
  registerCredentialHolderReceiver: (
    signFn: CredentialHolder['sign']
  ) => number;
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
  let contextRequestId = 0;

  const worker = workerSrc
    ? new Worker(validateWorkerSrc(workerSrc), { type: 'module' })
    : new InlineWorker();

  const tx = createTx(worker);

  const contextIds = new Map<string, number>();
  const signingRequestMap = new Map<number, Signer['sign']>();
  const credentialHolderRequestMap = new Map<number, CredentialHolder['sign']>();

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

  function context(settingsJson: string): WorkerContext {
    const existingId = contextIds.get(settingsJson);
    if (existingId !== undefined) {
      return { id: existingId };
    }

    if (contextIds.size === MAX_CACHED_CONTEXTS) {
      const oldestSettings = contextIds.keys().next().value;
      if (oldestSettings !== undefined) {
        contextIds.delete(oldestSettings);
      }
    }

    const id = contextRequestId++;
    contextIds.set(settingsJson, id);
    return { id, json: settingsJson };
  }

  await tx.initWorker(wasm);

  return {
    tx,
    context,
    registerSignReceiver,
    registerCredentialHolderReceiver,
    terminate: () => {
      contextIds.clear();
      worker.terminate();
    }
  };
}
