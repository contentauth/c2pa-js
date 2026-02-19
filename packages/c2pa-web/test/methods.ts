/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { test as baseTest } from 'vitest';
import { type C2paSdk, createC2pa } from '../src/index.js';
import { SetupWorker } from 'msw/browser';

import wasmSrc from '@contentauth/c2pa-web/resources/c2pa.wasm?url';
import { worker } from './msw.js';

interface TestWithC2paFixture {
  c2pa: C2paSdk;
  requestMock: SetupWorker;
}

const test = baseTest.extend<TestWithC2paFixture>({
  c2pa: async ({}, use) => {
    const c2pa = await createC2pa({ wasmSrc });

    await use(c2pa);

    c2pa.dispose();
  },
  requestMock: async ({}, use) => {
    await worker.start({ quiet: true });

    await use(worker);

    worker.resetHandlers();

    worker.stop();
  }
});

export { test };

// Re-export for convenience
export { describe, expect } from 'vitest';
