/**
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const workflow = fs.readFileSync(
  new URL('../.github/workflows/release.yml', import.meta.url),
  'utf8'
);
const verifier = fileURLToPath(
  new URL('./verify-linux-binary.mjs', import.meta.url)
);

test('Linux runner and cache retain the Ubuntu 24.04 baseline', () => {
  assert.match(workflow, /runs-on:.*\|\| 'ubuntu-24\.04' \}\}/);
  assert.match(workflow, /shared-key:.*linux.*ubuntu-24\.04/);
});

test('manual asset replacement is opt-in and follows binary validation', () => {
  assert.match(workflow, /replace-existing:\n(?: {8}.*\n)* {8}default: false/);
  assert(
    workflow.includes(
      '[ "$GITHUB_EVENT_NAME" = workflow_dispatch ] && [ "$REPLACE_EXISTING" != true ]'
    )
  );
  assert(
    workflow.indexOf('Verify Linux binary compatibility') <
      workflow.indexOf('Upload release asset')
  );
});

test('verification uses the workflow revision rather than an older release tag', () => {
  assert(workflow.includes('WORKFLOW_SHA: ${{ github.workflow_sha }}'));
  assert(
    workflow.includes(
      'git show "$WORKFLOW_SHA:scripts/verify-linux-binary.mjs"'
    )
  );
  assert(
    workflow.includes(
      'node "$RUNNER_TEMP/verify-linux-binary.mjs" generated/index.node'
    )
  );
});

test('Linux verification reports a missing binary argument', () => {
  const result = spawnSync(process.execPath, [verifier], {
    encoding: 'utf8'
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Usage: node verify-linux-binary\.mjs <binary>/);
});

test('Linux verification rejects incompatible glibc requirements before upload', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'c2pa-native-abi-'));
  fs.mkdirSync(path.join(directory, 'generated'));
  try {
    for (const [symbols, accepted] of [
      ['GLIBC_2.3 GLIBC_2.39', true],
      ['GLIBC_2.40', false],
      ['GLIBC_2.43', false],
      ['GLIBC_3.0', false],
      ['no versioned glibc symbols', false]
    ]) {
      fs.writeFileSync(path.join(directory, 'generated/index.node'), symbols);
      const result = spawnSync(
        process.execPath,
        [verifier, path.join(directory, 'generated/index.node')],
        {
          encoding: 'utf8',
          env: {
            ...process.env,
            NATIVE_TARGET: 'aarch64-unknown-linux-gnu'
          }
        }
      );
      assert.equal(result.status === 0, accepted, result.stderr);
    }
  } finally {
    fs.rmSync(directory, { recursive: true });
  }
});
