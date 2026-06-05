/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { Signer } from '../signer.js';
import { createTx, workerRx } from './rpc.js';
import InlineWorker from '../worker?worker&inline';
import { transfer } from 'highgain';

export interface WorkerManager {
  tx: ReturnType<typeof createTx>;
  registerSignReceiver: (signFn: Signer['sign']) => number;
  terminate: () => void;
}

export interface CreateWorkerManagerConfig {
  wasm: WebAssembly.Module;
  settingsString?: string;
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
 * - Load settings (if provided)
 *
 * @param config - configuration object
 * @returns Facade providing convenient control over worker functions
 */
export async function createWorkerManager(
  config: CreateWorkerManagerConfig
): Promise<WorkerManager> {
  const { wasm, settingsString, workerSrc } = config;
  let signerRequestId = 0;

  const worker = workerSrc
    ? new Worker(validateWorkerSrc(workerSrc))
    : new InlineWorker();

  const tx = createTx(worker);

  const signingRequestMap = new Map<number, Signer['sign']>();

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
      }
    },
    worker
  );

  function registerSignReceiver(signFn: Signer['sign']) {
    const id = signerRequestId++;
    signingRequestMap.set(id, signFn);
    return id;
  }

  await tx.initWorker(wasm, settingsString);

  return {
    tx,
    registerSignReceiver,
    terminate: () => worker.terminate()
  };
}
