/**
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
  vi
} from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import {
  fetchWithRetry,
  DEFAULT_MAX_RETRY_AFTER_MS,
  DEFAULT_MAX_RESPONSE_BYTES
} from './fetchWithRetry.js';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  vi.unstubAllGlobals();
});
afterAll(() => server.close());

describe('fetchWithRetry', () => {
  test('fetches and returns response text', async () => {
    server.use(http.get('http://plainText', () => HttpResponse.text('hello')));

    const result = await fetchWithRetry('http://plainText');
    expect(result).toBe('hello');
  });

  test('reports a meaningful error for a non-OK HTTP response with no Retry-After', async () => {
    server.use(
      http.get(
        'http://always429',
        () =>
          new HttpResponse(null, { status: 429, statusText: 'Too Many Requests' })
      )
    );

    await expect(fetchWithRetry('http://always429')).rejects.toThrow(
      'Failed to fetch http://always429: 429'
    );
  });

  test('respects a reasonable numeric Retry-After header and retries', async () => {
    let requestCount = 0;
    server.use(
      http.get('http://retryAfterSeconds', () => {
        requestCount++;
        if (requestCount === 1) {
          return new HttpResponse(null, {
            status: 429,
            headers: { 'Retry-After': '1' }
          });
        }
        return HttpResponse.text('resolved after retry');
      })
    );

    const result = await fetchWithRetry('http://retryAfterSeconds');
    expect(result).toBe('resolved after retry');
  });

  test('respects an HTTP-date Retry-After header and retries', async () => {
    let requestCount = 0;
    server.use(
      http.get('http://retryAfterDate', () => {
        requestCount++;
        if (requestCount === 1) {
          const retryDate = new Date(Date.now() + 100).toUTCString();
          return new HttpResponse(null, {
            status: 429,
            headers: { 'Retry-After': retryDate }
          });
        }
        return HttpResponse.text('resolved after http-date retry');
      })
    );

    const result = await fetchWithRetry('http://retryAfterDate');
    expect(result).toBe('resolved after http-date retry');
  });

  test('falls back to generic backoff when Retry-After is unparseable', async () => {
    let requestCount = 0;
    server.use(
      http.get('http://retryAfterInvalid', () => {
        requestCount++;
        if (requestCount === 1) {
          return new HttpResponse(null, {
            status: 429,
            headers: { 'Retry-After': 'not-a-valid-value' }
          });
        }
        return HttpResponse.text('resolved after fallback backoff');
      })
    );

    const result = await fetchWithRetry('http://retryAfterInvalid');
    expect(result).toBe('resolved after fallback backoff');
  });

  test('fails immediately when Retry-After exceeds the maximum allowed delay', async () => {
    const tooLongSeconds = DEFAULT_MAX_RETRY_AFTER_MS / 1000 + 1;
    server.use(
      http.get(
        'http://retryAfterTooLong',
        () =>
          new HttpResponse(null, {
            status: 429,
            headers: { 'Retry-After': String(tooLongSeconds) }
          })
      )
    );

    await expect(fetchWithRetry('http://retryAfterTooLong')).rejects.toThrow(
      'exceeds the maximum allowed delay'
    );
  });

  test('recovers after a transient 500 by retrying', async () => {
    server.use(
      http.get(
        'http://transient500',
        () => new HttpResponse(null, { status: 500 }),
        { once: true }
      ),
      http.get('http://transient500', () =>
        HttpResponse.text('recovered after 500')
      )
    );

    const result = await fetchWithRetry('http://transient500');
    expect(result).toBe('recovered after 500');
  });

  test('rejects after exhausting retries when server keeps returning 429 with Retry-After', async () => {
    server.use(
      http.get(
        'http://always429WithRetryAfter',
        () =>
          new HttpResponse(null, {
            status: 429,
            headers: { 'Retry-After': '0' }
          })
      )
    );

    await expect(
      fetchWithRetry('http://always429WithRetryAfter')
    ).rejects.toThrow('Failed to fetch http://always429WithRetryAfter: 429');
  });

  test('rejects after exhausting retries on repeated network errors', async () => {
    server.use(
      http.get('http://repeatedNetworkError', () => HttpResponse.error())
    );

    await expect(
      fetchWithRetry('http://repeatedNetworkError')
    ).rejects.toThrow('Network error fetching http://repeatedNetworkError');
  });

  test('stringifies a non-Error network rejection after exhausting retries', async () => {
    // fetch() is spec'd to reject with an Error, but the code defends against a
    // non-Error rejection too (e.g. a broken polyfill) — MSW's HttpResponse.error()
    // always rejects with a real Error, so this is exercised with a direct stub instead.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue('raw string rejection'));

    await expect(fetchWithRetry('http://nonErrorRejection')).rejects.toThrow(
      'Network error fetching http://nonErrorRejection: raw string rejection'
    );
  });

  test('applies the default 1MB cap when maxResponseBytes is omitted', async () => {
    const oversizedBody = 'x'.repeat(DEFAULT_MAX_RESPONSE_BYTES + 1);
    server.use(
      http.get('http://defaultCap', () => HttpResponse.text(oversizedBody))
    );

    await expect(fetchWithRetry('http://defaultCap')).rejects.toThrow(
      `Response from http://defaultCap is too large. Max size is ${DEFAULT_MAX_RESPONSE_BYTES} bytes.`
    );
  });

  test('accepts a response under the default cap when maxResponseBytes is omitted', async () => {
    server.use(
      http.get('http://underDefaultCap', () =>
        HttpResponse.text('x'.repeat(10_000))
      )
    );

    const result = await fetchWithRetry('http://underDefaultCap');
    expect(result).toHaveLength(10_000);
  });

  test('rejects a response larger than the given maxResponseBytes', async () => {
    server.use(
      http.get('http://overCap', () => HttpResponse.text('x'.repeat(20)))
    );

    await expect(
      fetchWithRetry('http://overCap', { maxResponseBytes: 10 })
    ).rejects.toThrow('Response from http://overCap is too large. Max size is 10 bytes.');
  });

  test('accepts a response at or under the given maxResponseBytes', async () => {
    server.use(
      http.get('http://underCap', () => HttpResponse.text('x'.repeat(10)))
    );

    const result = await fetchWithRetry('http://underCap', {
      maxResponseBytes: 10
    });
    expect(result).toHaveLength(10);
  });
});
