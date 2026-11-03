# CAI JavaScript library

## Overview

The c2pa-js repository is a monorepo containing JavaScript libraries and tools for working with [C2PA metadata](https://c2pa.org/). It provides these libraries published for production use:

- [**c2pa-web**](packages/c2pa-web/README.md): Library for C2PA metadata in the browser. Import and use this package in browser client JavaScript code.
- [**c2pa-node**](packages/c2pa-node/README.md): Node.js library that can read and validate C2PA manifest data that is attached to media assets and add signed manifests to media assets.

Versioned API documentation for published releases is available for
[Node.js](https://contentauth.github.io/c2pa-js/node/) and
[web](https://contentauth.github.io/c2pa-js/web/). See the
[Node.js](packages/c2pa-node/README.md#documentation) and
[web](packages/c2pa-web/README.md#documentation) documentation build instructions
to select releases or generate the sites locally.

Run `pnpm ci:docs:releases` to build both versioned sites without building the
workspace libraries. Run `pnpm ci:docs` to build the existing multi-package
source docs and both versioned sites together.

Additionally, the repo contains these intermediate and internal libraries:

- [**c2pa-wasm**](packages/c2pa-wasm/README.md): WebAssembly bindings for [c2pa-rs](https://github.com/contentauth/c2pa-rs) that power c2pa-web, built with [wasm-bindgen](https://github.com/wasm-bindgen/wasm-bindgen). Most applications should use c2pa-web instead of calling the bindings directly.
- [**c2pa-types**](packages/c2pa-types/README.md): TypeScript types generated from c2pa-rs structs for use by c2pa-web and c2pa-node.
- **c2pa-utilities**: A small internal helper library shared across the c2pa-js monorepo.

> [!NOTE]
> In June 2026, the c2pa-node-v2 repo was merged into the c2pa-js repo.
> The old `c2pa-js` repository is now in [c2pa-js-legacy](https://github.com/contentauth/c2pa-js-legacy) and is deprecated. If you need to work with C2PA metadata in the browser, use the libraries in this repository instead.

### Learning videos

For video walkthroughs on using the JavaScript library, see the following lessons from the Content Credentials Foundations course:

- [Reading and validating C2PA data with JavaScript in the browser](https://learn.contentauthenticity.org/reading-and-validating-content-credentials)
- [Formatting C2PA data for L1 - L3 disclosures](https://learn.contentauthenticity.org/formatting-c2pa-data-for-display)

## Using this monorepo

This monorepo uses [Nx](https://nx.dev/getting-started/intro) and [pnpm](https://pnpm.io/).

### Prerequisites

Install the following before you work in this repository.

#### Node.js

Use a patched Node.js release: **v22.23.4+ on v22, v24.22.1+ on v24, or v26.12.1+ on v26**. These releases update the bundled roots and block the compromised eMudhra intermediate public keys. Older Node versions may also fail to build because of unrecognized file extensions.

If you use [nvm](https://github.com/nvm-sh/nvm), install a patched v22 release (for example, `nvm install 22.23.4`).

#### TLS trust stores

The workspace pins `c2pa` to **0.91.7** for native bindings, WebAssembly, and type generation. Native SDK HTTP requests and Trustmark model downloads use Reqwest with Rustls and share the patched `rustls-webpki` verifier and `webpki-roots` bundle in `Cargo.lock`.

The Rust upgrade does **not** update every HTTPS trust path:

- The Node package's binary installer uses `node-fetch`, and shared utilities use the runtime's global `fetch` (or a caller-supplied implementation) for settings and trust-resource URLs. Build tooling also uses Node HTTPS clients, including `got` for the Binaryen download. These paths need a patched Node runtime; updating npm HTTP-client packages alone does not update Node's TLS verifier or roots.
- Browser/WASM HTTP requests, including remote manifests, timestamp requests, and WASM loading, use browser networking. Keep the browser and its revocation data current, along with the OS trust store where applicable. A Rust dependency update cannot patch the browser.
- Native build tooling has independent trust stores: the Trustmark dependency's ONNX Runtime downloader uses `ureq` with `native-tls`, while Cargo, Rustup, `cargo-binstall`, and shell downloads use their own runtime or system TLS configuration. Keep those tools and OS CA packages patched.

No production TLS CA bundle is maintained in this repository. Custom fetch implementations, Node CA overrides (such as `NODE_EXTRA_CA_CERTS`), proxies, and externally supplied binaries remain the deployer's responsibility. C2PA signing trust anchors and test certificates are separate from HTTPS CA roots.

See the [eMudhra incident and patched-client list](https://emudhra.we-have-a-problem.com/) and the upstream Node security releases for [v22.23.4](https://github.com/nodejs/node/releases/tag/v22.23.4), [v24.22.1](https://github.com/nodejs/node/releases/tag/v24.22.1), and [v26.12.1](https://github.com/nodejs/node/releases/tag/v26.12.1).

#### pnpm and Nx

Install `pnpm` and the Nx CLI globally:

```sh
npm install -g pnpm
npm install -g nx
```

#### Rust toolchain for building c2pa-wasm

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

<div class="packages-table" markdown="1">

| Package | Description | Source |
|---------|-------------|--------|
| c2pa-web | JavaScript library for working with C2PA data in a web browser. | [`packages/c2pa-web`](https://github.com/contentauth/c2pa-js/tree/main/packages/c2pa-web) |
| c2pa-node | Node.js library that can read and validate C2PA manifest data that is attached to media assets and add signed manifests to media assets. | [`packages/c2pa-node`](https://github.com/contentauth/c2pa-js/tree/main/packages/c2pa-node) |
| c2pa-wasm | WebAssembly bindings for [c2pa-rs](https://github.com/contentauth/c2pa-rs) that power c2pa-web, built with [wasm-bindgen](https://github.com/wasm-bindgen/wasm-bindgen). Most applications should use c2pa-web instead of calling the bindings directly. | [`packages/c2pa-wasm`](https://github.com/contentauth/c2pa-js/tree/main/packages/c2pa-wasm) |
| c2pa-types | TypeScript types generated from `c2pa-rs` structs for use by `c2pa-web`. | [`packages/c2pa-types`](https://github.com/contentauth/c2pa-js/tree/main/packages/c2pa-types) |

</div>

### Tools

The `/tools` directory contains utilities for local development.

#### testbed

Minimal site for inspecting `c2pa-web` output and experimenting locally. Source: [`tools/testbed`](https://github.com/contentauth/c2pa-js/tree/main/tools/testbed).

#### nx-wasm-bindgen

Custom [Nx executor](https://nx.dev/concepts/executors-and-configurations) that builds `c2pa-wasm` with `wasm-bindgen`. Source: [`tools/nx-wasm-bindgen`](https://github.com/contentauth/c2pa-js/tree/main/tools/nx-wasm-bindgen).

## License

This project is licensed under the [MIT license](https://github.com/contentauth/c2pa-js/blob/main/LICENSE).
