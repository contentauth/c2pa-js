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
});
