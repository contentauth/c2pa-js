/**
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

/** A phase of C2PA-related work reported while reading or signing an asset. */
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
 * A single progress report. Named `ProgressReportEvent`, not `ProgressEvent`, to avoid
 * the DOM's unrelated `ProgressEvent` (`XMLHttpRequest`, `FileReader`).
 */
export interface ProgressReportEvent {
  /** What the SDK is doing. Derive any user-visible text from this. */
  phase: ProgressPhase;

  /** Counter within the current phase, starting at 1 and resetting on phase change. */
  step: number;

  /**
   * `0`: indeterminate, total unknown. `1`: single-shot. `> 1`: `step / total` is the
   * completion fraction.
   */
  total: number;
}

/** Optional behavior attached to a `Context`. */
export interface ContextOptions {
  /**
   * Called as the operation progresses. Advisory: a thrown exception is logged and
   * ignored, and a final event may be dropped if it arrives after the operation
   * resolves.
   */
  onProgress?: (event: ProgressReportEvent) => void;

  /**
   * Requests cancellation of the operations this `Context` configures. Aborting before
   * the call starts rejects with the signal's reason; aborting during the call rejects
   * with an `Error` reporting `C2pa(OperationCancelled)`.
   *
   * The engine checks for cancellation only at its own checkpoints, one per 256 MiB of
   * asset hashed. Measured on a 479 KB JPEG: aborting at the first `reading` report
   * still ran `fetchingRemoteManifest` and `verifyingManifest` before stopping.
   *
   * One signal cancels every operation it is passed to; use a separate
   * `AbortController` per operation to cancel them independently.
   */
  signal?: AbortSignal;
}

/** Marker in a cancelled operation's error message; matched as a substring since the
 * surrounding `C2pa(OperationCancelled)` text is a Rust `Debug` rendering, not a
 * stable contract. */
const CANCELLED_MARKER = 'OperationCancelled';

/**
 * Whether `error` reports that an operation was cancelled. Cancelling rejects with a
 * different error type depending on when {@link ContextOptions.signal} fired, so a
 * single `instanceof` or message check misses half the cases:
 *
 * - Aborted **before** reaching the engine: the signal's reason, normally a
 *   `DOMException` named `AbortError`.
 * - Aborted **during** the operation: an `Error` reporting `OperationCancelled`.
 *
 * ```ts
 * try {
 *   await Reader.fromBlob(c2pa, file.type, file, context);
 * } catch (e) {
 *   if (isCancelled(e)) return;
 *   throw e;
 * }
 * ```
 *
 * Not reported as cancelled: `AbortSignal.timeout()` (reason is `TimeoutError`, not
 * `AbortError`), and an abort with a custom reason such as
 * `controller.abort(new Error('navigated'))`, which nothing marks as a cancellation.
 */
export function isCancelled(error: unknown): boolean {
  if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
    return error.name === 'AbortError';
  }

  return error instanceof Error && error.message.includes(CANCELLED_MARKER);
}
