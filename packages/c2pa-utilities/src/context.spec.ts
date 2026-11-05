/**
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { describe, expect, test } from 'vitest';
import { Context } from './context.js';
import { DEFAULT_SETTINGS, settingsToJson } from './settings.js';

describe('Context', () => {
  test('new Context() with no settings resolves to defaults', async () => {
    const result = await new Context().toJson();
    expect(result).toEqual(settingsToJson(DEFAULT_SETTINGS));
  });

  test('sdkConfig getter returns what was attached', () => {
    expect(new Context().sdkConfig).toBeUndefined();
    expect(new Context({ verify: { verifyTrust: false } }).sdkConfig).toBeUndefined();

    const sdkConfig = { maxSizeInBytes: 42 };
    expect(new Context(undefined, sdkConfig).sdkConfig).toEqual(sdkConfig);
  });

  test('sdkConfig is not serialized into the settings JSON', async () => {
    const withSdkConfig = await new Context(undefined, { maxSizeInBytes: 42 }).toJson();
    expect(withSdkConfig).toEqual(await new Context().toJson());
  });

  test('Context options are not serialized into the settings JSON', async () => {
    const context = new Context(undefined, undefined, {
      trustFetch: { cacheTtlMs: 1000, requireHttps: true }
    });
    expect(await context.toJson()).toEqual(await new Context().toJson());
  });

  test('settings getter returns what was attached', () => {
    expect(new Context().settings).toBeUndefined();

    const settings = { verify: { verifyTrust: false } };
    expect(new Context(settings).settings).toEqual(settings);
  });

  test('constructing with settings resolves the given settings', async () => {
    const result = await new Context({
      verify: { verifyTrust: false }
    }).toJson();

    // Result should contain the defaults that the given settings are merged with.
    expect(result).toEqual(
      JSON.stringify({
        builder: { generate_c2pa_archive: true },
        verify: { verify_trust: false }
      })
    );
  });

  test('successful toJson() calls should be memoized', async () => {
    const context = new Context({ verify: { verifyTrust: false } });

    const first = context.toJson();
    const second = context.toJson();

    expect(second).toBe(first);
    await expect(first).resolves.toEqual(
      JSON.stringify({
        builder: { generate_c2pa_archive: true },
        verify: { verify_trust: false }
      })
    );
  });

  test('failed toJson() calls should not be memoized', async () => {
    const context = new Context({
      trust: { trustAnchors: 'https://example.com/anchors.pem' }
    });

    const failingFetch = async (): Promise<Response> => {
      throw new Error('network down');
    };

    const first = context.toJson({ fetch: failingFetch, maxRetries: 0 });
    await expect(first).rejects.toThrow();

    const succeedingFetch = async (): Promise<Response> =>
      new Response(
        '-----BEGIN CERTIFICATE-----\nabcd\n-----END CERTIFICATE-----'
      );

    const second = context.toJson({ fetch: succeedingFetch });

    // A fresh attempt (a new Promise, not the previously-rejected one), which succeeds.
    expect(second).not.toBe(first);
    await expect(second).resolves.toEqual(expect.any(String));

    // The successful resolution is memoized as usual from here on.
    expect(context.toJson()).toBe(second);
  });

  test('inherits a cached resource lifetime without extending it for a new Context', async () => {
    const fetch = vi.fn(async () => new Response(
      `-----BEGIN CERTIFICATE-----\nanchor-${fetch.mock.calls.length}\n-----END CERTIFICATE-----`
    ));
    vi.stubGlobal('fetch', fetch);
    vi.useFakeTimers();
    const createContext = () => new Context(
      { trust: { trustAnchors: 'https://example.com/inherited-expiry.pem' } },
      undefined,
      { trustFetch: { cacheTtlMs: 100, maxRetries: 0 } }
    );
    try {
      const first = await createContext().toJson();
      await vi.advanceTimersByTimeAsync(90);
      const context = createContext();
      await expect(context.toJson()).resolves.toBe(first);
      expect(fetch).toHaveBeenCalledOnce();
      await vi.advanceTimersByTimeAsync(10);

      const pending = context.toJson();
      expect(context.toJson()).toBe(pending);
      const refreshed = await pending;
      expect(refreshed).not.toBe(first);
      expect(fetch).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  test('refresh failures reject instead of memoizing expired trust data', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(
        '-----BEGIN CERTIFICATE-----\nfirst\n-----END CERTIFICATE-----'
      ))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(new Response(
        '-----BEGIN CERTIFICATE-----\nupdated\n-----END CERTIFICATE-----'
      ));
    vi.useFakeTimers();
    const context = new Context(
      { trust: { trustAnchors: 'https://example.com/refresh-failure.pem' } },
      undefined,
      { trustFetch: { fetch, cacheTtlMs: 100, maxRetries: 0 } }
    );
    try {
      await context.toJson();
      await vi.advanceTimersByTimeAsync(100);
      await expect(context.toJson()).rejects.toThrow('offline');
      await expect(context.toJson()).resolves.toContain('updated');
      expect(fetch).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  test('uses the earliest lifetime when trust resources resolve at different times', async () => {
    const fetch = vi.fn(async (url: string) => {
      if (url.endsWith('slow.pem')) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      return new Response(
        '-----BEGIN CERTIFICATE-----\nanchor\n-----END CERTIFICATE-----'
      );
    });
    const context = new Context(
      { trust: { trustAnchors: [
        'https://example.com/fast.pem',
        'https://example.com/slow.pem'
      ] } },
      undefined,
      { trustFetch: { fetch, cacheTtlMs: 100 } }
    );
    vi.useFakeTimers();
    try {
      const pending = context.toJson();
      await vi.advanceTimersByTimeAsync(50);
      await pending;
      await vi.advanceTimersByTimeAsync(50);
      const refresh = context.toJson();
      expect(refresh).not.toBe(pending);
      await vi.advanceTimersByTimeAsync(50);
      await refresh;
      expect(fetch).toHaveBeenCalledTimes(4);
    } finally {
      vi.useRealTimers();
    }
  });
});
