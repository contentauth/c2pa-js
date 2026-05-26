# testbed

Minimal local app for experimenting with [`c2pa-web`](../../packages/c2pa-web) and inspecting C2PA manifest data in the browser.

Drop an image onto the page. The app reads its C2PA manifest store using `c2pa-web` and logs the result (plus timing) to the browser developer console.

## Prerequisites

Install these before running the testbed. Full details are in the [c2pa-js README](../../README.md#prerequisites).

- **Node.js** v22 or later
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

`nx build c2pa-web` builds `c2pa-wasm` and other dependencies the testbed needs at runtime.

## Run

From the repository root:

```sh
nx serve testbed
```

Open **https://localhost:4200/** in your browser. The dev server uses [vite-plugin-mkcert](https://github.com/liuweiGL/vite-plugin-mkcert) to serve over HTTPS on first launch.

Drag and drop a C2PA-enabled image onto the drop zone, then open the browser developer console to view the parsed manifest store and read time.

### Other commands

```sh
nx build testbed    # Production build to tools/testbed/dist
nx preview testbed  # Preview the production build at https://localhost:4300
```
