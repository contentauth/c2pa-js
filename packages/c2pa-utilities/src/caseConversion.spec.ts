/**
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { describe, expect, it } from 'vitest';
import { snakeCaseify } from './caseConversion.js';

describe('snakeCaseify', () => {
  it('converts camelCase keys to snake_case', () => {
    const result = snakeCaseify({ verifyAfterReading: true } as any);
    expect(result).toEqual({ verify_after_reading: true });
  });

  it('recurses into nested objects', () => {
    const result = snakeCaseify({
      builder: { generateC2paArchive: true, thumbnail: { enabledFlag: false } }
    } as any);
    expect(result).toEqual({
      builder: {
        generate_c2pa_archive: true,
        thumbnail: { enabled_flag: false }
      }
    });
  });

  it('preserves arrays as arrays instead of flattening them into objects', () => {
    // typeof [] === 'object' in JS — a naive recursion would otherwise rebuild this as
    // {"0": "a", "1": "b"} via Object.entries, corrupting anything c2pa-rs expects as a
    // JSON array (e.g. BuilderSettings.createdAssertionLabels: string[]).
    const result = snakeCaseify({ someArrayField: ['a', 'b'] } as any);
    expect(Array.isArray(result.some_array_field)).toBe(true);
    expect(result.some_array_field).toEqual(['a', 'b']);
  });

  it('snake-cases keys of object elements inside an array', () => {
    const result = snakeCaseify({
      someArrayField: [{ innerCamelKey: 1 }, { innerCamelKey: 2 }]
    } as any);
    expect(result.some_array_field).toEqual([
      { inner_camel_key: 1 },
      { inner_camel_key: 2 }
    ]);
  });

  it('leaves an empty array as an empty array', () => {
    const result = snakeCaseify({ someArrayField: [] } as any);
    expect(result.some_array_field).toEqual([]);
  });
});
