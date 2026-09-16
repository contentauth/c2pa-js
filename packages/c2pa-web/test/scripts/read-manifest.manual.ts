/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

// Driven by `scripts/read-manifest.js`. Not a real test: it reads whichever
// asset that script staged at `test/assets/.scratch/`, prints the manifest
// (or `null`) as JSON between marker strings, and lets the wrapper script
// pull that out of stdout and write it to disk.
import { test } from '../methods.js';
import { Reader } from '../../src/lib/reader.js';

const MARKER_START = 'MANIFEST_JSON_START';
const MARKER_END = 'MANIFEST_JSON_END';

test('reads the manifest for the staged scratch asset', async ({ c2pa }) => {
  const meta = await (await fetch('/test/assets/.scratch/meta.json')).json();

  const blob = await (
    await fetch(`/test/assets/.scratch/${meta.filename}`)
  ).blob();

  const reader = await Reader.fromBlob(c2pa, blob.type, blob);

  const manifestStore = reader ? await reader.manifestStore() : null;

  // eslint-disable-next-line no-console
  console.log(MARKER_START + JSON.stringify(manifestStore, null, 2) + MARKER_END);
});
