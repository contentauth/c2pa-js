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

/**
 * Merges a `Context`'s progress and cancellation settings with any options passed to a
 * single call, per field: a value on the call wins over the same value on the
 * `Context`, so overriding the signal alone does not silence progress reporting.
 *
 * An explicit `undefined` means "not specified" and falls through to the `Context`.
 * There is therefore no way to opt one call out of a context's signal; construct a
 * `Context` without one for that.
 */
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
 * Registers whatever an operation asks for on the main thread: a progress handler, an
 * abort listener, or both, taken from the `Context` and any per-call `callOptions` per
 * {@link mergeOperationOptions}.
 *
 * Returns the options describing it — `undefined` when the context wants nothing beyond
 * settings, so the caller uses the plain worker method unchanged — and a `release` that
 * unregisters everything. Callers must invoke `release` exactly once, when the operation
 * can no longer report or be cancelled: at the end of the call for a reader, and when
 * the builder is freed for a builder.
 *
 * Progress and cancellation share one `operationId`: the worker keys reports by it and
 * names the operation to cancel with it.
 *
 * @throws the signal's reason if the merged signal has already been aborted, so a
 * caller that cancelled before starting never reaches the worker.
 */
export function registerOperation(
  worker: WorkerManager,
  context: Context,
  callOptions?: ContextOptions
): { options: OperationOptions | undefined; release: () => void } {
  const { onProgress, signal } = mergeOperationOptions(context, callOptions);

  // Rejects an operation whose signal already fired, before any worker call is made.
  // Here rather than at each caller, so every entry point guards identically and none
  // can accidentally test the `Context`'s signal instead of the merged one.
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
    const onAbort = () => {
      // One-way: the worker records the request and its progress closure observes it at
      // the engine's next checkpoint. A worker blocked in a synchronous read cannot act
      // on this until that read yields.
      worker.tx.operation_cancel(operationId);
    };
    signal.addEventListener('abort', onAbort, { once: true });
    // An AbortSignal holds a strong reference to its listeners, so a long-lived signal
    // would otherwise retain this closure for every operation it ever configured.
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

/**
 * Runs a worker call with the options the `Context` asks for, releasing them afterwards.
 *
 * Suits an operation whose work ends when the call resolves, such as creating a reader.
 * A builder outlives its constructor, so it reserves and releases around its own
 * lifetime instead.
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
