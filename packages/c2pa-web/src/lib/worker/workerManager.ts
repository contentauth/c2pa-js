/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { createTx } from './rpc.js';
import Worker from '../worker?worker&inline';

export interface WorkerManager {
  tx: ReturnType<typeof createTx>;
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

  const tx = createTx(worker);

  await tx.initWorker(wasm, settingsString);

  return {
    tx,
    terminate: () => worker.terminate(),
  };
}
