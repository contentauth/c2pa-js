/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

// Standalone Vitest config for `scripts/read-manifest.js`. Kept separate from
// vite.config.ts so this manual, ad hoc entry point never gets picked up by
// the package's normal `*.spec.ts`/`*.test.ts` test run.
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/packages/web',
  plugins: [tsconfigPaths()],
  server: {
    fs: {
      deny: []
    }
  },
  test: {
    watch: false,
    include: ['test/scripts/**/*.manual.ts'],
    browser: {
      headless: true,
      enabled: true,
      provider: 'playwright',
      instances: [{ browser: 'chromium' }],
      screenshotFailures: false
    }
  }
});
