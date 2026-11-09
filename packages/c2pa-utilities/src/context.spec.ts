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
      trustFetch: { maxRetries: 0, requireHttps: true }
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

  test('memoizes trust settings only within each Context without automatic refresh', async () => {
    const fetch = vi.fn(async () => new Response(
      `-----BEGIN CERTIFICATE-----\nanchor-${fetch.mock.calls.length}\n-----END CERTIFICATE-----`
    ));
    vi.stubGlobal('fetch', fetch);
    vi.useFakeTimers();
    const createContext = () => new Context(
      { trust: { trustAnchors: 'https://example.com/context-memoization.pem' } },
      undefined,
      { trustFetch: { maxRetries: 0 } }
    );
    try {
      const context = createContext();
      const pending = context.toJson();
      const first = await pending;
      await vi.advanceTimersByTimeAsync(60_000);
      expect(context.toJson()).toBe(pending);
      await expect(context.toJson()).resolves.toBe(first);
      expect(fetch).toHaveBeenCalledOnce();

      await expect(createContext().toJson()).resolves.not.toBe(first);
      expect(fetch).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

});
