/**
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

/**
 * This file implements a generic HTTP fetch-with-retry helper, using exponential backoff and
 * `Retry-After` handling.
 */

/**
 * Default maximum response size, in bytes, when {@link FetchWithRetryOptions.maxResponseBytes}
 * isn't specified.
 */
export const DEFAULT_MAX_RESPONSE_BYTES = 1 * 1024 * 1024; // 1MB

/**
 * Options to configure {@link fetchWithRetry}. Retry count and backoff timing are fixed
 * internally for now — only the response-size cap is currently overridable.
 */
export interface FetchWithRetryOptions {
  /**
   * Maximum allowed response size, in bytes.
   * Defaults to {@link DEFAULT_MAX_RESPONSE_BYTES} when omitted.
   */
  maxResponseBytes?: number;
}

/**
 * Default fetch-with-retry parameters.
 */
const DEFAULT_FETCH_RETRIES = 2;
const DEFAULT_INITIAL_RETRY_DELAY_MS = 200;
const DEFAULT_MAX_RETRY_DELAY_MS = 2_000;
export const DEFAULT_MAX_RETRY_AFTER_MS = 30_000;

/**
 * @param attempt The current attempt number.
 * @returns The backoff time for the current attempt number in milliseconds,
 * in accordance with an exponential backoff policy.
 */
function calculateBackoffMs(attempt: number): number {
  const backoff = Math.min(
    DEFAULT_INITIAL_RETRY_DELAY_MS * 2 ** attempt,
    DEFAULT_MAX_RETRY_DELAY_MS
  );
  const jitter = Math.floor(Math.random() * 200);
  return Math.min(backoff + jitter, DEFAULT_MAX_RETRY_DELAY_MS); // jitter, capped
}

/**
 * Parses a `Retry-After` header value, which per HTTP spec is either a number of
 * seconds or an HTTP date. 
 * @param value The `Retry-After` header value.
 * @returns the delay in milliseconds, or null if the header is absent or unparseable.
 */
function parseRetryAfterMs(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const seconds = Number(value);
  if (!Number.isNaN(seconds)) {
    return seconds * 1000;
  }

  const dateMs = Date.parse(value);
  if (Number.isNaN(dateMs)) {
    return null;
  }

  return dateMs - Date.now();
}

/**
 * Fetches `url` as text, retrying on network errors, `429`, and `5xx` responses with
 * exponential backoff (respecting a `Retry-After` header when present).
 *
 * @param url The URL to fetch.
 * @param options Options for configuring the fetch.
 * @returns The response body.
 */
export async function fetchWithRetry(
  url: string,
  options?: FetchWithRetryOptions
): Promise<string> {
  const maxResponseBytes =
    options?.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;

  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(url);
    } catch (e) {
      if (attempt < DEFAULT_FETCH_RETRIES) {
        await new Promise((resolve) =>
          setTimeout(resolve, calculateBackoffMs(attempt))
        );
        continue;
      }
      const message = e instanceof Error ? e.message : String(e);
      throw new Error(`Network error fetching ${url}: ${message}`, {
        cause: e
      });
    }

    if (!res.ok) {
      const retryable = res.status === 429 || res.status >= 500;

      if (retryable) {
        if (res.status === 429) {
          const retryAfterMs = parseRetryAfterMs(
            res.headers.get('retry-after')
          );
          if (retryAfterMs !== null) {
            if (retryAfterMs > DEFAULT_MAX_RETRY_AFTER_MS) {
              throw new Error(
                `Failed to fetch ${url}: server requested a Retry-After delay of ` +
                  `${Math.ceil(retryAfterMs / 1000)}s, which exceeds the maximum allowed delay of ` +
                  `${DEFAULT_MAX_RETRY_AFTER_MS / 1000}s`
              );
            }

            if (attempt < DEFAULT_FETCH_RETRIES) {
              await new Promise((resolve) =>
                setTimeout(resolve, Math.max(retryAfterMs, 0))
              );
              continue;
            }

            throw new Error(
              `Failed to fetch ${url}: ${res.status} ${res.statusText}`
            );
          }
        }

        if (attempt < DEFAULT_FETCH_RETRIES) {
          await new Promise((resolve) =>
            setTimeout(resolve, calculateBackoffMs(attempt))
          );
          continue;
        }
      }

      throw new Error(
        `Failed to fetch ${url}: ${res.status} ${res.statusText}`
      );
    }

    const text = await res.text();

    if (text.length > maxResponseBytes) {
      throw new Error(
        `Response from ${url} is too large. Max size is ${maxResponseBytes} bytes.`
      );
    }

    return text;
  }
}
