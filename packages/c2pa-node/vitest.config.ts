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
    }
  },
  assetsInclude: ["**/*.node"],
  optimizeDeps: {
    exclude: ["index.node"]
  },
  define: {
    global: "globalThis"
  },
  ssr: {
    noExternal: ["index.node"]
  },
  esbuild: {
    target: "node18"
  },
  testTimeout: 10000
});
