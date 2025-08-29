/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { WorkerDefinition } from '../worker.js';
import Worker from '../worker?worker&inline';
import { WorkerRequest, WorkerResponse } from './setupWorker.js';
import { handleWorkerResponse } from './workerResponse.js';

export interface WorkerManager {
  execute: <T extends keyof WorkerDefinition, K extends WorkerDefinition[T]>(
    request: WorkerRequest<T, Parameters<K>>
  ) => Promise<
    Awaited<ReturnType<K>> extends WorkerResponse<infer Data>
      ? Data
      : Awaited<ReturnType<K>>
  >;
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

  const worker = new Worker();

  const execute: WorkerManager['execute'] = (request) => {
    return new Promise((resolve, reject) => {
      handleWorkerResponse(worker, {
        onSuccess: (data) => resolve(data),
        onError: (error) => reject(error),
      });

      const { method, args, transfer } = request;
      worker.postMessage({ method, args }, transfer ?? []);
    });
  };

  await execute({ method: 'initWorker', args: [wasm, settingsString] });

  return {
    execute,
    terminate: () => worker.terminate(),
  };
}
