import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["js-src/**/*.spec.ts"],
    exclude: ["node_modules", "dist"],
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    // koffi's opaque/struct/proto type registrations (native/lib.ts) are
    // global native-library state, not per-module state — vitest's default
    // per-file module isolation re-runs those top-level registrations for
    // each spec file even within the single fork above, which koffi
    // rejects as duplicates. These are integration tests against one real
    // shared native library anyway, so disable isolation.
    isolate: false
  },
  define: {
    global: "globalThis"
  },
  esbuild: {
    target: "node22"
  },
  testTimeout: 10000
});
