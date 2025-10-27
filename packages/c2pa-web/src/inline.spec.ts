/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { describe, expect, test } from 'vitest';
import { createC2pa } from './inline.js';
import C_with_CAWG_data from '../test/fixtures/assets/C_with_CAWG_data.jpg';
import C_with_CAWG_data_untrusted_ManifestStore from '../test/fixtures/manifests/C_with_CAWG_data_untrusted.js';

describe('inline entrypoint', () => {
  test('should work', async () => {
    const c2pa = await createC2pa();

    const blob = await getBlobForAsset(C_with_CAWG_data);

    const reader = await c2pa.reader.fromBlob(blob.type, blob);

    expect(reader).not.toBeNull();

    const manifestStore = await reader!.manifestStore();

    expect(manifestStore).toEqual(C_with_CAWG_data_untrusted_ManifestStore);

    await reader!.free();
  });
});

async function getBlobForAsset(src: string): Promise<Blob> {
  const response = await fetch(src);
  const blob = await response.blob();

  return blob;
}
