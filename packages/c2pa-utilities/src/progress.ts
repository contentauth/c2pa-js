/**
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

/** Phases of C2PA-related work reported while reading or signing an asset. */
export type ProgressPhase =
  | 'reading'
  | 'verifyingManifest'
  | 'verifyingSignature'
  | 'verifyingIngredient'
  | 'verifyingAssetHash'
  | 'addingIngredient'
  | 'thumbnail'
  | 'hashing'
  | 'signing'
  | 'embedding'
  | 'fetchingRemoteManifest'
  | 'writing'
  | 'fetchingOcsp'
  | 'fetchingTimestamp'
  | 'unknown';

/**
 * A progress report event (fired by the underlying library).
 */
export interface ProgressReportEvent {
  /** SDK progress phase/step. */
  phase: ProgressPhase;

  /** Counter within the current phase, starting at 1 and resetting on phase change. */
  step: number;

  /**
   * `0`: indeterminate, total unknown.
   * `1`: single-shot.
   * `> 1`: `step / total` is the completion fraction.
   */
  total: number;
}

/** Optional behavior attached to a `Context`. */
export interface ContextOptions {
  /**
   * Called as the operation progresses.
   * An exception thrown by the callback is logged and does not stop execution.
   * The last event may be dropped/missed if arriving after the operation/call ended.
   */
  onProgress?: (event: ProgressReportEvent) => void;

  /**
   * Requests cancellation of the operations this `Context` configures.
   * Aborting before the call starts rejects with the signal's reason.
   * Aborting during the call rejects with an `Error` reporting `C2pa(OperationCancelled)`.
   *
   * A cancellation during processing is checked at progress checkpoints,
   * and therefore cancellation can only happen at a progress checkpoint.
   */
  signal?: AbortSignal;
}

/** Marker that the operation was cancelled. */
const CANCELLED_MARKER = 'OperationCancelled';

/**
 * Depending on where/how somethings is cancelled, the error is different.
 * This is to detect relevant cancellation events.
 *
 * Not reported as cancelled: `AbortSignal.timeout()`
 * (reason is `TimeoutError`, not `AbortError`),
 * and an abort with a custom reason such as
 * `controller.abort(new Error('navigated'))`.
 */
export function isCancelled(error: unknown): boolean {
  if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
    return error.name === 'AbortError';
  }

  return error instanceof Error && error.message.includes(CANCELLED_MARKER);
}
