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
  fetchWithRetryRaw,
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

describe('URL validation', () => {
  test('fetchWithRetry rejects a malformed URL without attempting a request', async () => {
    await expect(fetchWithRetry('not a valid url')).rejects.toThrow(
      'Invalid URL: not a valid url'
    );
  });

  test('fetchWithRetryRaw rejects a malformed URL without attempting a request', async () => {
    await expect(fetchWithRetryRaw('not a valid url')).rejects.toThrow(
      'Invalid URL: not a valid url'
    );
  });
});

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

  test('rejects based on Content-Length before reading an oversized body', async () => {
    server.use(
      http.get(
        'http://oversizedContentLength',
        () =>
          new HttpResponse('small body', {
            headers: { 'Content-Length': '999999999' }
          })
      )
    );

    await expect(
      fetchWithRetry('http://oversizedContentLength', { maxResponseBytes: 10 })
    ).rejects.toThrow(
      'Response from http://oversizedContentLength is too large. Max size is 10 bytes.'
    );
  });

  test('falls back to checking the body when Content-Length is absent', async () => {
    server.use(
      http.get('http://streamedOverCap', () => {
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('x'.repeat(20)));
            controller.close();
          }
        });
        return new HttpResponse(stream);
      })
    );

    await expect(
      fetchWithRetry('http://streamedOverCap', { maxResponseBytes: 10 })
    ).rejects.toThrow(
      'Response from http://streamedOverCap is too large. Max size is 10 bytes.'
    );
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

  test('honors a custom maxRetries, giving up sooner than the default', async () => {
    let requestCount = 0;
    server.use(
      http.get('http://customMaxRetries', () => {
        requestCount++;
        return new HttpResponse(null, { status: 500 });
      })
    );

    await expect(
      fetchWithRetry('http://customMaxRetries', { maxRetries: 0 })
    ).rejects.toThrow('Failed to fetch http://customMaxRetries: 500');
    expect(requestCount).toBe(1);
  });

  test('honors a custom maxRetries, retrying more than the default', async () => {
    let requestCount = 0;
    server.use(
      http.get('http://moreRetries', () => {
        requestCount++;
        if (requestCount <= 4) {
          return new HttpResponse(null, { status: 500 });
        }
        return HttpResponse.text('resolved after extra retries');
      })
    );

    const result = await fetchWithRetry('http://moreRetries', {
      maxRetries: 4,
      initialRetryDelayMs: 1,
      maxRetryDelayMs: 5
    });
    expect(result).toBe('resolved after extra retries');
    expect(requestCount).toBe(5);
  });

  test('honors a custom maxRetryAfterMs cap', async () => {
    server.use(
      http.get(
        'http://customRetryAfterCap',
        () =>
          new HttpResponse(null, {
            status: 429,
            headers: { 'Retry-After': '2' }
          })
      )
    );

    await expect(
      fetchWithRetry('http://customRetryAfterCap', { maxRetryAfterMs: 1000 })
    ).rejects.toThrow('exceeds the maximum allowed delay');
  });

  test('honors a custom isRetryableStatus, retrying a status not retried by default', async () => {
    let requestCount = 0;
    server.use(
      http.get('http://customRetryableStatus', () => {
        requestCount++;
        if (requestCount === 1) {
          return new HttpResponse(null, { status: 418 });
        }
        return HttpResponse.text('resolved after custom-status retry');
      })
    );

    const result = await fetchWithRetry('http://customRetryableStatus', {
      isRetryableStatus: (status) => status === 418
    });
    expect(result).toBe('resolved after custom-status retry');
  });

  test('honors a custom isRetryableStatus, refusing to retry a status retried by default', async () => {
    let requestCount = 0;
    server.use(
      http.get('http://noRetryOn500', () => {
        requestCount++;
        return new HttpResponse(null, { status: 500 });
      })
    );

    await expect(
      fetchWithRetry('http://noRetryOn500', {
        isRetryableStatus: () => false
      })
    ).rejects.toThrow('Failed to fetch http://noRetryOn500: 500');
    expect(requestCount).toBe(1);
  });

  test('honors a Retry-After header on a non-429 retryable status', async () => {
    let requestCount = 0;
    server.use(
      http.get('http://retryAfterOn503', () => {
        requestCount++;
        if (requestCount === 1) {
          return new HttpResponse(null, {
            status: 503,
            headers: { 'Retry-After': '0' }
          });
        }
        return HttpResponse.text('resolved after 503 retry-after');
      })
    );

    const result = await fetchWithRetry('http://retryAfterOn503');
    expect(result).toBe('resolved after 503 retry-after');
  });
});

describe('fetchWithRetryRaw', () => {
  test('returns the raw Response for a successful request', async () => {
    server.use(http.get('http://rawSuccess', () => HttpResponse.json({ a: 1 })));

    const res = await fetchWithRetryRaw('http://rawSuccess');
    expect(res.ok).toBe(true);
    await expect(res.json()).resolves.toEqual({ a: 1 });
  });

  test('forwards method, headers, and body via RequestInit', async () => {
    let receivedBody: unknown;
    let receivedHeader: string | null = null;
    server.use(
      http.post('http://rawPost', async ({ request }) => {
        receivedHeader = request.headers.get('x-test-header');
        receivedBody = await request.json();
        return HttpResponse.json({ ok: true });
      })
    );

    const res = await fetchWithRetryRaw('http://rawPost', {
      method: 'POST',
      headers: { 'x-test-header': 'value', 'content-type': 'application/json' },
      body: JSON.stringify({ hello: 'world' })
    });

    expect(res.ok).toBe(true);
    expect(receivedHeader).toBe('value');
    expect(receivedBody).toEqual({ hello: 'world' });
  });

  test('does not enforce a response size cap', async () => {
    const oversizedBody = 'x'.repeat(DEFAULT_MAX_RESPONSE_BYTES + 1);
    server.use(
      http.get('http://rawNoSizeCap', () => HttpResponse.text(oversizedBody))
    );

    const res = await fetchWithRetryRaw('http://rawNoSizeCap');
    const text = await res.text();
    expect(text).toHaveLength(DEFAULT_MAX_RESPONSE_BYTES + 1);
  });

  test('still retries on a retryable status using the same policy options', async () => {
    server.use(
      http.get(
        'http://rawRetry',
        () => {
          return new HttpResponse(null, { status: 500 });
        },
        { once: true }
      ),
      http.get('http://rawRetry', () => HttpResponse.text('recovered'))
    );

    const res = await fetchWithRetryRaw('http://rawRetry');
    await expect(res.text()).resolves.toBe('recovered');
  });
});
