/**
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

assert(process.argv[2], 'Usage: node verify-linux-binary.mjs <binary>');
const binary = resolve(process.argv[2]);
const requirements = [
  ...readFileSync(binary)
    .toString('latin1')
    .matchAll(/GLIBC_(\d+)\.(\d+)/g)
];
assert(
  requirements.length > 0,
  'No glibc requirements found in the Linux binary'
);
for (const [, major, minor] of requirements) {
  assert(
    Number(major) < 2 || (Number(major) === 2 && Number(minor) <= 39),
    `Binary requires GLIBC_${major}.${minor}, newer than Ubuntu 24.04`
  );
}
if (process.env.NATIVE_TARGET === 'x86_64-unknown-linux-gnu') {
  createRequire(import.meta.url)(binary);
}
console.log('Linux binary is compatible with the Ubuntu 24.04 glibc baseline');
