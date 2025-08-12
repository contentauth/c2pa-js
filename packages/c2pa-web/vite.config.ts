/// <reference types='vitest' />
import { defineConfig, Plugin } from 'vite';
import dts from 'vite-plugin-dts';
import { workspaceRoot } from '@nx/devkit';
import { rimrafSync } from 'rimraf';
import { join } from 'path';
import { mkdirSync, linkSync } from 'fs';
export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/packages/web',
  plugins: [
    dts({
      entryRoot: 'src',
      tsconfigPath: join(__dirname, 'tsconfig.lib.json'),
    }),
    createBuildPlugin(),
  ],
  // Configuration for building your library.
  // See: https://vitejs.dev/guide/build.html#library-mode
  build: {
    outDir: './dist',
    emptyOutDir: false, // Done in our custom plugin so we can correctly create the "resources" folder
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    lib: {
      entry: 'src/index.ts',
      name: '@contentauth/c2pa-web',
      fileName: 'index',
      // Change this to the formats you want to support.
      // Don't forget to update your package.json as well.
      formats: ['es' as const],
    },
    rollupOptions: {
      // External packages that should not be bundled into your library.
      external: [],
    },
  },
  test: {
    watch: false,
    include: ['{src,test}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    browser: {
      headless: true,
      enabled: true,
      provider: 'playwright',
      // https://vitest.dev/guide/browser/playwright
      instances: [{ browser: 'chromium' }],
      screenshotFailures: false,
    },
  },
}));

/**
 * This plugin has two responsibilities:
 * 1. Clears the output directory (Vite's default emptyOutDir behavior will delete the files copied in step 2)
 * 2. Links the WASM resources into the output directory so they can be packaged with the published library
 */
function createBuildPlugin(): Plugin {
  return {
    name: 'contentauth-web-build',
    buildStart: () => {
      const wasmPackageName = 'c2pa-wasm';
      const wasmResourceName = 'c2pa_bg.wasm';
      const wasmPackagePath = join(workspaceRoot, 'packages', wasmPackageName);
      const wasmOutDir = join(wasmPackagePath, 'pkg');
      const wasmResourcePath = join(wasmOutDir, wasmResourceName);

      const pkgOutDir = join(__dirname, 'dist');
      const pkgResourceDir = join(pkgOutDir, 'resources');
      const pkgResourcePath = join(pkgResourceDir, wasmResourceName);

      rimrafSync(pkgOutDir);

      mkdirSync(pkgResourceDir, { recursive: true });
      linkSync(wasmResourcePath, pkgResourcePath);
    },
  };
}
