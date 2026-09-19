# Testbed app

The `testbed` app is a minimal local app for experimenting with [`c2pa-web`](../../packages/c2pa-web) and inspecting C2PA manifest data in the browser.

## Prerequisites

Install these before running the testbed. Full details are in the [c2pa-js README](../../README.md#prerequisites).

- **Node.js** v22.22 or later
- **pnpm** and the **Nx** CLI (`npm install -g pnpm nx`)
- **Rust toolchain** and related tools to build `c2pa-wasm` from source:
  - Rust 1.88.0+ with the `wasm32-unknown-unknown` target
  - `wasm-bindgen-cli` (version must match [`Cargo.toml`](../../packages/c2pa-wasm/Cargo.toml))
  - `wasm-pack` 0.13.1

See [Prerequisites in `packages/c2pa-wasm/README.md`](../../packages/c2pa-wasm/README.md#prerequisites) for install commands.

## Setup

From the **repository root** (`c2pa-js/`):

```sh
pnpm install
nx build c2pa-web
```

`nx build c2pa-web` builds `c2pa-wasm` and other dependencies the app needs at runtime.

## Run

From the repository root:

```sh
nx serve testbed
```

Open **https://localhost:4200/** in your browser. The dev server uses [vite-plugin-mkcert](https://github.com/liuweiGL/vite-plugin-mkcert) to serve over HTTPS on first launch.

Drag and drop a C2PA-enabled image onto the drop zone, then open the browser developer console to view the parsed manifest store and read time.

### Progress reporting

The panel below the drop zone lists the phases reported while an asset is read, driven by the `onProgress` callback on `Context`. The **Cancel** button aborts the read through the same `Context`:

```ts
const controller = new AbortController();
const context = new Context(settings, {
  onProgress: (event) => ...,
  signal: controller.signal
});
const reader = await Reader.fromBlob(c2pa, file.type, file, context);
// Cancel:
controller.abort();
```

Use a **large** asset to see more than a flash. Assets under 50 MB are loaded into memory before the first phase is reported, and a small file finishes verifying almost immediately, so the panel may jump straight to `done`.

Cancellation stops the read at the engine's next checkpoint, not instantly — expect a few more phases to appear after pressing Cancel before the status turns to `cancelled`. On a small asset the read often completes first, in which case Cancel has no visible effect.

### Other commands

```sh
nx build testbed    # Production build to tools/testbed/dist
nx preview testbed  # Preview the production build at https://localhost:4300
```
