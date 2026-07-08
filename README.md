# c2pa-js

## Overview

The c2pa-js repository is a monorepo containing JavaScript libraries and tools for working with [C2PA metadata](https://c2pa.org/). It provides several libraries published for production use.

These libraries are of primary interest to developers:

- [**c2pa-web**](packages/c2pa-web/README.md): Library for C2PA metadata in the browser. Import and use this package in browser client JavaScript code.
- [**c2pa-node**](packages/c2pa-node/README.md): Node.js library that can read and validate C2PA data from and add signed manifests to media files in supported formats.

Additionally, the repo contains these intermediate and internal libraries:

- [**c2pa-wasm**](c2pa-js/packages/c2pa-wasm/README.md): WebAssembly bindings for [c2pa-rs](https://github.com/contentauth/c2pa-rs) that power c2pa-web, built with [wasm-bindgen](https://github.com/wasm-bindgen/wasm-bindgen). Most applications should use c2pa-web instead of calling the bindings directly.
- [**c2pa-types**](c2pa-js/packages/c2pa-types/README.md): TypeScript types generated from c2pa-rs structs for use by c2pa-web and c2pa-node.

> [!NOTE]
> In June, 2026, the c2pa-node-v2 repo was merged into the c2pa-js repo.
> The old `c2pa-js` repository is now in [c2pa-js-legacy](https://github.com/contentauth/c2pa-js-legacy) and is deprecated. If you need to work with C2PA metadata in the browser, use the libraries in this repository instead.

### Learning videos

For video walkthroughs on using the JavaScript SDK, see the following lessons from the Content Credentials Foundations course:

- [Reading and validating C2PA data with Javascript in the browser](https://learn.contentauthenticity.org/reading-and-validating-content-credentials)
- [Formatting C2PA data for L1 - L3 disclosures](https://learn.contentauthenticity.org/formatting-c2pa-data-for-display)

## Using this monorepo

This monorepo uses [Nx](https://nx.dev/getting-started/intro) and [pnpm](https://pnpm.io/).

### Prerequisites

Install the following before you work in this repository.

#### Node.js

Node.js **v22.22.0 or later** is required. Older versions may fail to build because of unrecognized file extensions.

If you use [nvm](https://github.com/nvm-sh/nvm), install a supported v22 release (for example, `nvm install 22.22.0`).

#### pnpm and Nx

Install `pnpm` and the Nx CLI globally:

```sh
npm install -g pnpm
npm install -g nx
```

#### Rust toolchain for building `c2pa-wasm`

To build from source instead of using published packages only, you need the Rust toolchain and other prerequisites. See [Prerequisites in `packages/c2pa-wasm/README.md`](https://github.com/contentauth/c2pa-js/tree/main/packages/c2pa-wasm#prerequisites).

### Recommended setup order

1. Install Node.js, `pnpm`, and the Nx CLI (see the previous sections).
2. Install the Rust toolchain and `c2pa-wasm` prerequisites ([`packages/c2pa-wasm/README.md`](https://github.com/contentauth/c2pa-js/tree/main/packages/c2pa-wasm#prerequisites)).
3. From the repository root, run `pnpm install` to install dependencies.

### Running commands with Nx

Run tasks as `nx <target> <project>`. For example:

```sh
nx build c2pa-web   # Builds c2pa-web and its dependencies
nx test c2pa-web    # Builds and runs tests for c2pa-web
nx lint c2pa-web    # Runs ESLint on c2pa-web
nx lint c2pa-web --fix   # Runs ESLint and applies fixes
```

### Committing changes for a release

Include a changeset when your change should ship in a release.

From the repository root:

```sh
pnpm changeset
```

Follow the prompts to bump affected packages. The command adds a Markdown file under `.changeset/`; commit that file with your pull request.

After the pull request merges to `main`, the changeset bot opens a release pull request. When that pull request merges, a new release is published.

## Directory layout

### Packages

The `/packages` directory contains libraries published for production use.

| Package | Description | Source |
|---------|-------------|--------|
| c2pa-web | JavaScript library for working with C2PA data in a web browser. | [`packages/c2pa-web`](https://github.com/contentauth/c2pa-js/tree/main/packages/c2pa-web) |
| c2pa-node | Node.js library that can read and validate C2PA data from and add signed manifests to media files in supported formats. | [`packages/c2pa-node`](https://github.com/contentauth/c2pa-js/tree/main/packages/c2pa-node) |
| c2pa-wasm | WebAssembly bindings for [c2pa-rs](https://github.com/contentauth/c2pa-rs) that power power c2pa-web, built with [wasm-bindgen](https://github.com/wasm-bindgen/wasm-bindgen). Most applications should use c2pa-web instead of calling the bindings directly. | [`packages/c2pa-wasm`](https://github.com/contentauth/c2pa-js/tree/main/packages/c2pa-wasm) |
| c2pa-types | TypeScript types generated from `c2pa-rs` structs for use by `c2pa-web`. | [`packages/c2pa-types`](https://github.com/contentauth/c2pa-js/tree/main/packages/c2pa-types) |

### Tools

The `/tools` directory contains utilities for local development.

#### testbed

Minimal site for inspecting `c2pa-web` output and experimenting locally. Source: [`tools/testbed`](https://github.com/contentauth/c2pa-js/tree/main/tools/testbed).

#### nx-wasm-bindgen

Custom [Nx executor](https://nx.dev/concepts/executors-and-configurations) that builds `c2pa-wasm` with `wasm-bindgen`. Source: [`tools/nx-wasm-bindgen`](https://github.com/contentauth/c2pa-js/tree/main/tools/nx-wasm-bindgen).

## License

This project is licensed under the [MIT license](https://github.com/contentauth/c2pa-js/blob/main/LICENSE).
