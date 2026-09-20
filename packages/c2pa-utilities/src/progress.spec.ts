/**
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { describe, expect, test } from 'vitest';
import { isCancelled } from './progress.js';

describe('isCancelled', () => {
  test('recognizes an abort that happened before the operation started', () => {
    const controller = new AbortController();
    controller.abort();

    let reason: unknown;
    try {
      controller.signal.throwIfAborted();
    } catch (e: unknown) {
      reason = e;
    }

    expect(isCancelled(reason)).toBe(true);
  });

  test('recognizes the engine reporting a cancelled operation', () => {
    // The shape that crosses the worker boundary: a Rust `Debug` rendering of the
    // error enum, turned back into an Error by the worker's error handling.
    expect(isCancelled(new Error('C2pa(OperationCancelled)'))).toBe(true);
  });

  test('does not mistake another engine error for a cancellation', () => {
    // A sibling of the string above. Reporting this as cancelled would make a missing
    // manifest look like a user action.
    expect(isCancelled(new Error('C2pa(JumbfNotFound)'))).toBe(false);
  });

  test('does not report an ordinary failure as cancelled', () => {
    expect(isCancelled(new Error('network unreachable'))).toBe(false);
    expect(isCancelled(new TypeError('bad argument'))).toBe(false);
  });

  test('tolerates values that are not errors', () => {
    // It takes `unknown`, because a `catch` binding can hold anything.
    expect(isCancelled(undefined)).toBe(false);
    expect(isCancelled(null)).toBe(false);
    expect(isCancelled('OperationCancelled')).toBe(false);
    expect(isCancelled({ message: 'OperationCancelled' })).toBe(false);
  });

  test('does not report an elapsed timeout as a cancellation', () => {
    // Documented behaviour, pinned here: AbortSignal.timeout() rejects with a
    // TimeoutError, and a deadline elapsing is a different event from cancelling.
    const timedOut = new DOMException('timed out', 'TimeoutError');
    expect(isCancelled(timedOut)).toBe(false);
  });

  test('cannot recognize an abort carrying a custom reason', () => {
    // Also documented: nothing marks this as a cancellation, so it is indistinguishable
    // from any other failure. Asserted so the limitation is visible rather than
    // discovered.
    const controller = new AbortController();
    controller.abort(new Error('user navigated away'));

    let reason: unknown;
    try {
      controller.signal.throwIfAborted();
    } catch (e: unknown) {
      reason = e;
    }

    expect(isCancelled(reason)).toBe(false);
  });
});
