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

/** Merges a `Context`'s progress and cancellation settings with a call's, per field:
 * a value on the call wins, and an explicit `undefined` falls through to the `Context`. */
function mergeOperationOptions(
  context: Context,
  callOptions?: ContextOptions
): Pick<ContextOptions, 'onProgress' | 'signal'> {
  return {
    onProgress: callOptions?.onProgress ?? context.onProgress,
    signal: callOptions?.signal ?? context.signal
  };
}

/** Cancels the operation when the signal aborts. Returns the detaching function. */
function cancelOnAbort(
  worker: WorkerManager,
  operationId: number,
  signal: AbortSignal
): () => void {
  const onAbort = () => worker.tx.operation_cancel(operationId);
  // An `abort` listener added after the signal aborted never fires,
  // hence we must check it here explicitly.
  if (signal.aborted) {
    onAbort();
    return () => undefined;
  }
  signal.addEventListener('abort', onAbort, { once: true });
  return () => signal.removeEventListener('abort', onAbort);
}

/**
 * Registers a progress handler, an abort listener, or both, per {@link
 * mergeOperationOptions}.
 * Returns `undefined` options when neither applies, so the caller uses
 * the plain worker method, and a `release` the caller must call exactly
 * once when the operation can no longer report or be cancelled.
 *
 * `deferredWork` returns options even when neither applies, for an operation whose
 * work happens in a later call and so must stay cancellable until then.
 *
 * @throws the signal's reason if it has already been aborted.
 */
export function registerOperation(
  worker: WorkerManager,
  context: Context,
  callOptions?: ContextOptions,
  deferredWork = false
): { options: OperationOptions | undefined; release: () => void } {
  const { onProgress, signal } = mergeOperationOptions(context, callOptions);

  signal?.throwIfAborted();

  if (!onProgress && !signal && !deferredWork) {
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
    releases.push(cancelOnAbort(worker, operationId, signal));
  }

  return {
    options: {
      operationId,
      reportsProgress: Boolean(onProgress),
      cancellable: Boolean(signal) || deferredWork
    },
    release: () => releases.forEach((release) => release())
  };
}

/**
 * Attaches a call's own progress handler and abort listener to an operation id.
 * Only what the call supplies is attached, since the `Context`'s own options
 * were registered and are released by {@link registerOperation}.
 *
 * @throws the merged signal's reason if it has already been aborted.
 */
export function attachToOperation(
  worker: WorkerManager,
  operationId: number,
  context: Context,
  callOptions?: ContextOptions
): () => void {
  mergeOperationOptions(context, callOptions).signal?.throwIfAborted();

  const releases: (() => void)[] = [];
  const { onProgress, signal } = callOptions ?? {};

  if (onProgress) {
    const unregister = worker.registerProgressHandler(operationId, onProgress);
    worker.tx.operation_setReporting(operationId, true);
    releases.push(() => {
      worker.tx.operation_setReporting(operationId, false);
      unregister();
    });
  }

  if (signal) {
    releases.push(cancelOnAbort(worker, operationId, signal));
  }

  return () => releases.forEach((release) => release());
}

/**
 * Runs a worker call with the `Context`'s behavioral functional options, releasing them afterwards.
 */
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
