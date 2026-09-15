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
    const result = await second;
    expect(JSON.parse(result)).toMatchObject({
      trust: {
        trust_anchors:
          '-----BEGIN CERTIFICATE-----\nabcd\n-----END CERTIFICATE-----'
      }
    });

    // The successful resolution is memoized as usual from here on.
    expect(context.toJson()).toBe(second);
  });
});
