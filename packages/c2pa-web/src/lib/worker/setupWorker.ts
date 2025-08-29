/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { postError, postSuccess } from './workerResponse.js';

export interface WorkerRequest<T, K> {
  method: T;
  args: K;
  transfer?: Transferable[];
}

type WorkerRequestPayload = Omit<WorkerRequest<any, any>, 'transfer'>;

export interface WorkerResponse<T> {
  data: T;
  transfer?: Transferable[];
}

export type WorkerFunctions = Record<
  string,
  (
    ...args: any[]
  ) => void | Promise<void> | WorkerResponse<any> | Promise<WorkerResponse<any>>
>;

/**
 * Prepares a worker with a list of functions to expose via postMessage and an initialization function
 *
 * @param functions Map of functions keyed by name
 * @param init Initialization function to be called once when the worker is set up
 */
export function setupWorker(functions: WorkerFunctions) {
  onmessage = async (e: MessageEvent<WorkerRequestPayload>) => {
    try {
      const { args, method } = e.data;
      const result = await functions[method](...args);

      if (result?.data !== undefined) {
        postSuccess(result.data, result.transfer);
      } else {
        postSuccess();
      }
    } catch (e) {
      postError(e);
    }
  };
}
