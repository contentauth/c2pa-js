/**
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import type { Context, ContextOptions } from '@contentauth/c2pa-utilities';
import type { OperationOptions } from './rpc.js';
import type { WorkerManager } from './workerManager.js';

/** Merges a `Context`'s progress and cancellation settings with a call's, per field: a
 * value on the call wins, and an explicit `undefined` falls through to the `Context`. */
function mergeOperationOptions(
  context: Context,
  callOptions?: ContextOptions
): Pick<ContextOptions, 'onProgress' | 'signal'> {
  return {
    onProgress: callOptions?.onProgress ?? context.onProgress,
    signal: callOptions?.signal ?? context.signal
  };
}

/**
 * Registers a progress handler, an abort listener, or both, per {@link
 * mergeOperationOptions}. Returns `undefined` options when neither applies, so the
 * caller uses the plain worker method, plus a `release` the caller must call exactly
 * once when the operation can no longer report or be cancelled.
 *
 * @throws the signal's reason if it has already been aborted.
 */
export function registerOperation(
  worker: WorkerManager,
  context: Context,
  callOptions?: ContextOptions
): { options: OperationOptions | undefined; release: () => void } {
  const { onProgress, signal } = mergeOperationOptions(context, callOptions);

  // Guards the merged signal here, once, so every entry point rejects identically.
  signal?.throwIfAborted();

  if (!onProgress && !signal) {
    return { options: undefined, release: () => undefined };
  }

  const releases: (() => void)[] = [];
  let operationId: number;

  if (onProgress) {
    const progress = worker.registerProgressReceiver(onProgress);
    operationId = progress.operationId;
    releases.push(progress.unregister);
  } else {
    operationId = worker.nextOperationId();
  }

  if (signal) {
    // The worker observes this at its next checkpoint; it cannot act on it sooner if
    // blocked in a synchronous read.
    const onAbort = () => worker.tx.operation_cancel(operationId);
    signal.addEventListener('abort', onAbort, { once: true });
    // A long-lived signal holds a strong reference to its listeners, so this must be
    // removed or it retains one closure per operation it ever configured.
    releases.push(() => signal.removeEventListener('abort', onAbort));
  }

  return {
    options: {
      operationId,
      reportsProgress: Boolean(onProgress),
      cancellable: Boolean(signal)
    },
    release: () => releases.forEach((release) => release())
  };
}

/** Runs a worker call with the `Context`'s options, releasing them afterwards. Suits an
 * operation whose work ends when the call resolves; a builder outlives its constructor,
 * so it reserves and releases around its own lifetime instead. */
export async function withOperationOptions<T>(
  worker: WorkerManager,
  context: Context,
  run: (options: OperationOptions | undefined) => Promise<T>,
  callOptions?: ContextOptions
): Promise<T> {
  const { options, release } = registerOperation(worker, context, callOptions);
  try {
    return await run(options);
  } finally {
    release();
  }
}
