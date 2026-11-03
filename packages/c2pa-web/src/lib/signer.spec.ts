/**
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { test, describe, expect } from 'test/methods.js';
import { vi } from 'vitest';
import { createC2pa, encodeSignerPayload } from '../index.js';
import wasmSrc from '@contentauth/c2pa-web/resources/c2pa.wasm?url';

describe('encodeSignerPayload', () => {
  test('encodes asynchronously through the worker using the CAWG wire representation', async ({
    c2pa
  }) => {
    expect(c2pa).toBeDefined();
    const pending = encodeSignerPayload(c2pa, {
      referencedAssertions: [{ url: 'a', hash: Uint8Array.of(1, 2) }],
      sigType: 'test'
    });
    expect(pending).toBeInstanceOf(Promise);
    const bytes = await pending;
    expect(bytes).toBeInstanceOf(Uint8Array);
    // {referenced_assertions: [{url: "a", hash: h'0102'}], sig_type: "test"}
    const hex = Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, '0')
    ).join('');
    expect(hex).toBe(
      'a2757265666572656e6365645f617373657274696f6e7381a26375726c61616468617368420102687369675f747970656474657374'
    );
    expect(
      await encodeSignerPayload(c2pa, {
        referencedAssertions: [{ url: 'a', hash: Uint8Array.of(1, 2) }],
        sigType: 'test',
        roles: []
      })
    ).toEqual(bytes);
  });

  test('rejects malformed payloads', async ({ c2pa }) => {
    expect(c2pa).toBeDefined();
    await expect(
      encodeSignerPayload(c2pa, { sigType: 'test' } as never)
    ).rejects.toThrow();
    // A failed encoding request must not poison the existing worker.
    const bytes = await encodeSignerPayload(c2pa, {
      referencedAssertions: [],
      sigType: 'test'
    });
    expect(bytes.byteLength).toBeGreaterThan(0);
  });

  test('does not instantiate Wasm on the main thread during initialization or encoding', async () => {
    const instantiate = vi.spyOn(WebAssembly, 'instantiate');
    const instance = vi.spyOn(WebAssembly, 'Instance');
    let c2pa: Awaited<ReturnType<typeof createC2pa>> | undefined;
    try {
      c2pa = await createC2pa({ wasmSrc });
      await encodeSignerPayload(c2pa, {
        referencedAssertions: [],
        sigType: 'test'
      });
      expect(instantiate).not.toHaveBeenCalled();
      expect(instance).not.toHaveBeenCalled();
    } finally {
      c2pa?.dispose();
      instantiate.mockRestore();
      instance.mockRestore();
    }
  });

  test.for([
    [0, '40'],
    [1, '41'],
    [23, '57'],
    [24, '5818'],
    [255, '58ff'],
    [256, '590100'],
    [65535, '59ffff'],
    [65536, '5a00010000']
  ] as const)(
    'preserves %i-byte hashes through RPC without detaching input buffers',
    async ([length, header], { c2pa }) => {
      const backing = new Uint8Array(length + 4).fill(255);
      const hash = backing.subarray(2, length + 2);
      hash.fill(128);
      const bytes = await encodeSignerPayload(c2pa, {
        referencedAssertions: [{ url: 'a', hash }],
        sigType: 'test'
      });
      const hex = Array.from(bytes, (byte) =>
        byte.toString(16).padStart(2, '0')
      ).join('');
      expect(hex).toBe(
        'a2757265666572656e6365645f617373657274696f6e7381a26375726c61616468617368' +
          header +
          '80'.repeat(length) +
          '687369675f747970656474657374'
      );
      expect(hash.byteLength).toBe(length);
      expect(backing.byteLength).toBe(length + 4);
      expect(Array.from(hash)).toEqual(Array(length).fill(128));
      expect(backing[0]).toBe(255);
      expect(backing[length + 3]).toBe(255);
    }
  );
});
