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
import Worker from '../worker?worker&inline';
import { transfer } from 'highgain';

export interface WorkerManager {
  tx: ReturnType<typeof createTx>;
  registerSignReceiver: (signFn: Signer['sign']) => number;
  terminate: () => void;
}

export interface CreateWorkerManagerConfig {
  wasm: WebAssembly.Module;
  settingsString?: string;
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
  const { wasm, settingsString } = config;
  let signerRequestId = 0;

  const worker = new Worker();

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
