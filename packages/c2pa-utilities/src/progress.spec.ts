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
  test('recognizes a pre-operation abort', () => {
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

  test("recognizes the engine's cancellation error", () => {
    // The shape that crosses the worker boundary: a Rust `Debug` rendering of the
    // error enum, turned back into an Error by the worker's error handling.
    expect(isCancelled(new Error('C2pa(OperationCancelled)'))).toBe(true);
  });

  test('ignores an error that only mentions the marker', () => {
    expect(
      isCancelled(new Error('ENOENT: OperationCancelled.jpg not found'))
    ).toBe(false);
    expect(
      isCancelled(
        new Error('field "OperationCancelled" is not a valid enum value')
      )
    ).toBe(false);
  });

  test('ignores an elapsed timeout', () => {
    // AbortSignal.timeout() rejects with a TimeoutError, and a deadline elapsing is a
    // different event from cancelling.
    const timedOut = new DOMException('timed out', 'TimeoutError');
    expect(isCancelled(timedOut)).toBe(false);
  });

  test('tolerates values that are not errors', () => {
    // It takes `unknown`, because a `catch` binding can hold anything.
    expect(isCancelled(undefined)).toBe(false);
    expect(isCancelled(null)).toBe(false);
    expect(isCancelled('OperationCancelled')).toBe(false);
    expect(isCancelled({ message: 'OperationCancelled' })).toBe(false);
  });
});
