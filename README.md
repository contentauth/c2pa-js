# c2pa-js

> [!NOTE]
> Looking for the old `c2pa-js` repo? It's available [here](https://github.com/contentauth/c2pa-js-legacy) as `c2pa-js-legacy`. Those packages are now deprecated and implementors wishing to interact with C2PA metadata on the web should use the libraries in this repo instead.

A collection of libraries and tools that enable interaction with [C2PA metadata](https://c2pa.org/) in JavaScript. Part of the [Content Authenticity Initiative](https://contentauthenticity.org/).

## Using this monorepo

This monorepo is managed by `NX` and `pnpm`.

### Prerequisites

The following must be installed before working with this monorepo:

#### Node.js

Node.js **v22 or later** is required (earlier versions may fail with build errors related to unknown file extensions).

If you use [nvm](https://github.com/nvm-sh/nvm), you can install the required version with:

```sh
nvm install <version>
nvm install 22.22.0
```

#### pnpm and NX

Install `pnpm` and `NX`.

```sh
npm install -g pnpm
npm install -g nx
```

#### Rust toolchain

If you plan to build from source (rather than only consuming published packages), the Rust toolchain and additional prerequisites are required. See [the `c2pa-wasm` prerequisites](https://github.com/contentauth/c2pa-js/tree/main/packages/c2pa-wasm#prerequisites) for full details.

### Recommended setup order

1. Install Node.js, `pnpm`, and `NX` (see above).
2. Install the Rust toolchain and `c2pa-wasm` prerequisites (see the [c2pa-wasm prerequisites](https://github.com/contentauth/c2pa-js/tree/main/packages/c2pa-wasm#prerequisites)).
3. Run `pnpm install` from the repo root to install the project dependencies.

### Running commands with NX

Commands are run in the following format: `nx [target] [project]`. For example:

```sh
nx build c2pa-web # This will build c2pa-web and all of its dependencies
nx test c2pa-web # This will build and run the tests defined in the c2pa-web package
nx lint c2pa-web # This will run ESLint on the c2pa-web package
nx lint c2pa-web --fix # This will run ESLint on the c2pa-web package and fix any errors
```

### Committing changes for release

If your changes should be part of a release, you will need to create and commit a changeset.

To create a new changeset, from the root repo directory, run:

```sh
pnpm changeset
```

Follow the prompts to bump the version numbers of affected packages as appropriate. This will generate a new changeset markdown file in the `.changeset` directory, which should then be committed as part of your PR.

Once the PR is merged into `main`, the changeset bot will create a release PR, which will then be reviewed, merged, and result in a new release being published.

## Packages

The `packages/` directory contains published libraries intended for production use:

- `c2pa-web`: SDK for interacting with C2PA metadata on the web. See [c2pa-web](packages/c2pa-web/README.md) for details.
- `c2pa-wasm`: WebAssembly wrapper for `c2pa-rs` that powers `c2pa-web`, built with `wasm-bindgen`. While these bindings can be used directly, most users will prefer the convenience of `c2pa-web`. See  [c2pa-wasm](packages/c2pa-wasm/README.md) for details.
- `c2pa-types`: Exports the TypeScript types auto-generated from `c2pa-rs` structs that `c2pa-web` uses. See [c2pa-types](packages/c2pa-types/README.md) for details.

## Tools 

The `tools/` directory contains some utilities for local development:

- `testbed`: A minimal website that can be used to view `c2pa-web` output and as a sandbox for local development. See the [testbed directory](https://github.com/contentauth/c2pa-js/tree/main/tools/testbed) for more details.
- `nx-wasm-bindgen`: A custom NX executor that contains the logic for building `c2pa-wasm` using `wasm-bindgen`. See the [nx-wasm-bindgen directory](https://github.com/contentauth/c2pa-js/tree/main/tools/nx-wasm-bindgen) for more details.

## License

This project is licensed under the terms of the [MIT license](https://github.com/contentauth/c2pa-js-v2/blob/main/LICENSE).
