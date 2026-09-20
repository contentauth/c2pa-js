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
 * A single progress report.
 *
 * Named `ProgressReportEvent` rather than `ProgressEvent` to stay clear of the DOM's
 * own `ProgressEvent` (the one `XMLHttpRequest` and `FileReader` dispatch). The two are
 * unrelated, and sharing the name made a handler that forgot to import this one
 * silently typecheck against the DOM type instead.
 */
export interface ProgressReportEvent {
  /** What the SDK is doing. Derive any user-visible text from this. */
  phase: ProgressPhase;

  /**
   * Counter within the current phase, starting at 1 and resetting when the phase
   * changes. The unit is phase-specific and otherwise opaque; a rising value means
   * work is still progressing.
   */
  step: number;

  /**
   * How to interpret {@link ProgressReportEvent.step}:
   *
   * - `0` — indeterminate. The total is not known ahead of time; show a spinner
   *   and treat a rising `step` as a sign of life.
   * - `1` — single-shot. The event itself is the notification.
   * - `> 1` — determinate. `step / total` is a completion fraction.
   */
  total: number;
}

/** Optional behavior attached to a `Context`. */
export interface ContextOptions {
  /**
   * Called as the operation progresses.
   *
   * Reporting is advisory: the callback cannot influence the operation, and an
   * exception thrown here is reported to the console and otherwise ignored rather
   * than failing the read. Events are delivered asynchronously, so a final event
   * may be dropped if it would arrive after the operation resolves.
   */
  onProgress?: (event: ProgressReportEvent) => void;

  /**
   * Requests cancellation of the operations this `Context` configures.
   *
   * Aborting before the call starts rejects it immediately, with the signal's reason.
   * Aborting during the call rejects with an `Error` whose message is
   * `C2pa(OperationCancelled)`, reported by the engine rather than the signal.
   *
   * The engine only checks for cancellation at its own checkpoints, one per 256 MiB
   * of asset hashed, so an asset under that size hashes in one uninterruptible step.
   * Measured on a 479 KB JPEG: aborting at the first `reading` report still ran
   * `fetchingRemoteManifest` and `verifyingManifest` before stopping.
   *
   * The same signal may drive several operations, and aborting it cancels all of them.
   * Use a separate `AbortController` per operation to cancel them independently.
   */
  signal?: AbortSignal;
}

/**
 * Marker the underlying engine puts in the message of a cancelled operation.
 *
 * Matched as a substring because the surrounding text is a Rust `Debug` rendering
 * (`C2pa(OperationCancelled)`) rather than a stable contract. Kept here so exactly one
 * place in the codebase depends on that shape.
 */
const CANCELLED_MARKER = 'OperationCancelled';

/**
 * Whether `error` reports that an operation was cancelled.
 *
 * Cancelling rejects with one of two different error types, depending on when the
 * {@link ContextOptions.signal} fired, so a single `instanceof` or message check misses
 * half the cases:
 *
 * - Aborted **before** the call reached the engine: the signal's own reason, normally a
 *   `DOMException` named `AbortError`.
 * - Aborted **during** the operation: an `Error` reporting `OperationCancelled`, raised
 *   by the engine at its next checkpoint.
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
 * Two cases it deliberately does **not** report as cancelled:
 *
 * - `AbortSignal.timeout()`, whose reason is a `TimeoutError`. A deadline elapsing is
 *   not the same event as someone cancelling, and the two usually want different
 *   handling.
 * - An abort with a custom reason, such as `controller.abort(new Error('navigated'))`.
 *   Nothing marks that error as a cancellation, so it cannot be told apart from any
 *   other failure. Callers who need a custom reason recognized should check for it
 *   themselves, or abort with no reason.
 */
export function isCancelled(error: unknown): boolean {
  if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
    return error.name === 'AbortError';
  }

  return error instanceof Error && error.message.includes(CANCELLED_MARKER);
}
