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
}

export interface CreateWorkerManagerConfig {
  wasm: WebAssembly.Module;
}

export async function createWorkerManager({
  wasm,
}: CreateWorkerManagerConfig): Promise<WorkerManager> {
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

  await execute({ method: 'initWasm', args: [wasm] });

  return {
    execute,
  };
}
