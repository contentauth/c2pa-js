/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { describe, expect, test } from 'vitest';
import { createC2pa } from './c2pa.js';

import wasmSrc from '@contentauth/c2pa-wasm/assets/c2pa_bg.wasm?url';
import { ManifestDefinition } from '@contentauth/c2pa-types';

describe('builder', () => {
  test('should work when created from a manifest definition', async () => {
    const c2pa = await createC2pa({ wasmSrc });

    const manifestDefinition: ManifestDefinition = {
      claim_generator_info: [
        {
          name: 'c2pa-web-test',
          version: '1.0.0',
        },
      ],
      title: 'Test_Manifest',
      format: 'image/jpeg',
      instance_id: '1234',
      assertions: [],
      ingredients: [],
    };

    const builder = await c2pa.builder.fromDefinition(manifestDefinition);

    const manifestDefinitionFromBuilder = await builder.getDefinition();

    expect(manifestDefinitionFromBuilder).toEqual(manifestDefinition);

    await builder.free();
  });
});
