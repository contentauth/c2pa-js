/**
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { readFile } from 'node:fs/promises';
import { beforeAll, expect, test } from 'vitest';
import { encodeSignerPayload as nodeEncode } from '../packages/c2pa-node';
import {
  initSync,
  encodeSignerPayload as wasmEncode
} from '../packages/c2pa-wasm/pkg/c2pa.js';

// Exercise the actual browser-targeted Wasm binding, not another JS encoder.
beforeAll(async () => {
  initSync({
    module: await WebAssembly.compile(
      new Uint8Array(
        await readFile(
          new URL('../packages/c2pa-wasm/pkg/c2pa_bg.wasm', import.meta.url)
        )
      )
    )
  });
});

for (const length of [0, 1, 23, 24, 255, 256, 65535, 65536]) {
  for (const roles of [undefined, [], ['cawg.creator', 'cawg.publisher']]) {
    for (const alg of [undefined, 'sha256']) {
      test(`Node/Wasm parity: hash=${length}, roles=${JSON.stringify(
        roles
      )}, alg=${alg}`, () => {
        const backing = new Uint8Array(length + 4).fill(255);
        const hash = backing.subarray(2, length + 2);
        hash.fill(128);
        const payload = {
          referencedAssertions: [
            {
              url: 'self#jumbf=/c2pa/assertions/c2pa.actions',
              hash,
              alg
            },
            { url: 'second/日本語', hash: Uint8Array.of(0, 127, 128, 255) }
          ],
          sigType: 'cawg.x509.cose',
          roles
        };
        expect(nodeEncode(payload)).toEqual(wasmEncode(payload));
        expect(hash.byteLength, 'encoding must not detach the hash').toBe(
          length
        );
        expect(backing[0]).toBe(255);
      });
    }
  }
}

test('Node/Wasm parity: empty referenced assertions and omitted roles', () => {
  const payload = { referencedAssertions: [], sigType: 'cawg.x509.cose' };
  expect(nodeEncode(payload)).toEqual(wasmEncode(payload));
});
