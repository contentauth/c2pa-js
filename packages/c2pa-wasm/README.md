# c2pa-wasm

The WebAssembly wrapper for [`c2pa-rs`](https://github.com/contentauth/c2pa-rs) that powers `c2pa-web`, built with [wasm-bindgen](https://github.com/wasm-bindgen/wasm-bindgen). While these bindings can be used directly, most users will prefer the convenience of `c2pa-web`.

## Installation

```sh
npm install @contentauth/c2pa-wasm
```

## Development

### Prerequsities

Ensure the repo-wide prerequisites [NX](https://nx.dev/getting-started/intro) and [pnpm](https://pnpm.io/) are installed.

Then, all of the following prerequisites must be installed before `c2pa-wasm` can be built:

#### Rust

[Installation instructions](https://www.rust-lang.org/tools/install)

Minimum supported Rust version: **1.86.0**.

Additionally, the `wasm32-unknown-unknown` target must be installed:

```sh
rustup target add wasm32-unknown-unknown
```

#### wasm-bindgen-cli

[Documentation](https://wasm-bindgen.github.io/wasm-bindgen/reference/cli)

```sh
cargo install wasm-bindgen-cli@0.2.106
```

#### wasm-pack

[Documentation](https://rustwasm.github.io/docs/wasm-pack/)

```sh
cargo install wasm-pack@0.13.1
```

### Building

To build the library:

```sh
nx build c2pa-wasm
```

This will execute the commands defined in the [nx-wasm-bindgen executor](https://github.com/contentauth/c2pa-js-v2/blob/main/tools/nx-wasm-bindgen/src/executors/build/executor.ts) to produce the final output in the `pkg/` directory.

### Testing

The library relies on [`wasm-pack`](https://rustwasm.github.io/docs/wasm-pack/) to run its tests. As a general principle, the majority of test coverage will come from `c2pa-web`'s test suite.

To run the tests:

```
nx test c2pa-wasm
```
