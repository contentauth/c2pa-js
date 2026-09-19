/**
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import type { Context } from '@contentauth/c2pa-utilities';
import type { OperationOptions } from './rpc.js';
import type { WorkerManager } from './workerManager.js';

/**
 * Runs a worker call, attaching per-operation options when the `Context` asks for any.
 *
 * `run` receives an `OperationOptions` to pass to the options-carrying worker method,
 * or `undefined` when the context requests nothing beyond settings — in which case the
 * caller runs the plain method, exactly as it did before options existed. The resolved
 * settings JSON is passed by the caller as its own argument, beside the options.
 *
 * Anything registered on the main thread for the duration of the call is released in a
 * `finally`, so a rejected operation cannot leak it.
 */
export async function withOperationOptions<T>(
  worker: WorkerManager,
  context: Context,
  run: (options: OperationOptions | undefined) => Promise<T>
): Promise<T> {
  const { onProgress } = context;
  if (!onProgress) {
    return run(undefined);
  }

  const { operationId, unregister } =
    worker.registerProgressReceiver(onProgress);
  try {
    return await run({ progressOperationId: operationId });
  } finally {
    unregister();
  }
}
