#!/usr/bin/env node
/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

// Reads the C2PA manifest out of a local asset using c2pa-web's `Reader`,
// running the actual wasm/worker pipeline in a headless browser via Vitest
// browser mode (see vitest.manual.config.ts + test/scripts/read-manifest.manual.ts).
//
// Usage:
//   node scripts/read-manifest.js <path-to-asset> [--out <path-to-json>]
//
// Defaults the output path to "<asset>.manifest.json" next to the asset.

import { spawnSync } from 'node:child_process';
import { mkdirSync, copyFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { extname, basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const SCRATCH_DIR = join(PACKAGE_DIR, 'test/assets/.scratch');
const MARKER_START = 'MANIFEST_JSON_START';
const MARKER_END = 'MANIFEST_JSON_END';

function parseArgs(argv) {
  const [assetPath, ...rest] = argv;
  if (!assetPath || assetPath.startsWith('--')) {
    console.error('Usage: node scripts/read-manifest.js <path-to-asset> [--out <path-to-json>]');
    process.exit(1);
  }

  let outPath;
  const outFlagIndex = rest.indexOf('--out');
  if (outFlagIndex !== -1) {
    outPath = rest[outFlagIndex + 1];
  }

  return { assetPath: resolve(assetPath), outPath };
}

function stageAsset(assetPath) {
  if (!existsSync(assetPath)) {
    console.error(`Asset not found: ${assetPath}`);
    process.exit(1);
  }

  mkdirSync(SCRATCH_DIR, { recursive: true });

  const filename = `input${extname(assetPath)}`;
  copyFileSync(assetPath, join(SCRATCH_DIR, filename));
  writeFileSync(join(SCRATCH_DIR, 'meta.json'), JSON.stringify({ filename }));
}

function runVitest() {
  const result = spawnSync(
    'npx',
    ['vitest', 'run', '--config', 'vitest.manual.config.ts'],
    { cwd: PACKAGE_DIR, encoding: 'utf8' }
  );

  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error('vitest run failed');
  }

  return result.stdout;
}

function extractManifestJson(stdout) {
  const start = stdout.indexOf(MARKER_START);
  const end = stdout.indexOf(MARKER_END);

  if (start === -1 || end === -1) {
    console.error(stdout);
    throw new Error('Could not find manifest JSON markers in vitest output');
  }

  return stdout.slice(start + MARKER_START.length, end).trim();
}

const { assetPath, outPath } = parseArgs(process.argv.slice(2));
const resolvedOutPath = resolve(
  outPath ?? join(dirname(assetPath), `${basename(assetPath)}.manifest.json`)
);

stageAsset(assetPath);

try {
  const stdout = runVitest();
  const manifestJson = extractManifestJson(stdout);

  if (manifestJson === 'null') {
    console.log(`No C2PA manifest found in ${assetPath}`);
  } else {
    writeFileSync(resolvedOutPath, manifestJson);
    console.log(`Wrote manifest JSON to ${resolvedOutPath}`);
  }
} finally {
  rmSync(SCRATCH_DIR, { recursive: true, force: true });
}
