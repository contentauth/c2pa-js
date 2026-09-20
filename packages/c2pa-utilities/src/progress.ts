/**
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

/**
 * A phase of work reported while reading or signing an asset.
 *
 * `'unknown'` covers phases added by a future version of the underlying SDK: the
 * Rust enum is non-exhaustive, so a newer engine can report a phase this version
 * cannot name. Treat it as "work is happening", not as an error.
 *
 * `'fetchingTimestamp'` is declared by the underlying SDK but never reported by
 * the version this package builds against — a timestamp fetch is counted as part
 * of `'signing'`. Do not wait for it.
 */
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

/** A single progress report. */
export interface ProgressEvent {
  /** What the SDK is doing. Derive any user-visible text from this. */
  phase: ProgressPhase;

  /**
   * Counter within the current phase, starting at 1 and resetting when the phase
   * changes. The unit is phase-specific and otherwise opaque; a rising value means
   * work is still progressing.
   */
  step: number;

  /**
   * How to interpret {@link ProgressEvent.step}:
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
  onProgress?: (event: ProgressEvent) => void;

  /**
   * Requests cancellation of the operations this `Context` configures.
   *
   * Aborting before the call starts rejects it immediately, with the signal's reason.
   * Aborting during the call makes it reject with an `Error` whose message is
   * `C2pa(OperationCancelled)`, since the cancellation is reported by the underlying
   * engine rather than by the signal.
   *
   * **Cancellation is cooperative and coarse.** The underlying engine only observes it
   * at its own checkpoints, and hashing reports one checkpoint per 256 MiB of asset.
   * An asset below that size therefore hashes in a single uninterruptible step, so an
   * abort arriving during it cannot stop that work — it takes effect at the next
   * checkpoint, if any remain. Treat this as "stop as soon as it is safe to", not as a
   * guarantee that work halts promptly.
   *
   * Measured on a 479 KB JPEG: aborting at the first `reading` report still ran
   * `fetchingRemoteManifest` and `verifyingManifest` before stopping. Expect work to
   * continue for one or more phases after `abort()`, and note that a network phase in
   * that window still completes.
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
 * This recognizes both, leaving the original error untouched for callers who want the
 * reason they attached.
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
