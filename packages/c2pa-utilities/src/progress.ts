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
   * `null` when unknown,
   * `1` for single-shot,
   * `> 1` when `step / total` is the completion fraction.
   */
  total: number | null;
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
   * The engine observes the request at its next progress checkpoint. An asset that
   * completes before the first checkpoint is never cancelled.
   */
  signal?: AbortSignal;
}

/** The engine's cancellation error, as its Rust `Debug` rendering reaches JS. */
const CANCELLED_MARKER = 'C2pa(OperationCancelled)';

/**
 * Whether an error represents a cancellation:
 * a `DOMException` named `AbortError` before the operation started,
 * or the library's `C2pa(OperationCancelled)` during processing.
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
