# Contributing to the project

The information in this page is primarily for those who wish to contribute to the `c2pa-js` library project itself, rather than those who simply wish to use it in an application. For general contribution guidelines, see [`CONTRIBUTING.md`](../CONTRIBUTING.md).

## Working in the monorepo

This monorepo uses [Nx](https://nx.dev/getting-started/intro) and [pnpm](https://pnpm.io/).
Unless otherwise noted, run commands from the repository root.

### Prerequisites

Install the following before you work in this repository.

#### Node.js

Use a patched Node.js release: **v22.23.4+ on v22, v24.22.1+ on v24, or v26.12.1+ on v26**.
These releases update the bundled roots and block the compromised eMudhra
intermediate public keys. Older Node versions may also fail to build because of
unrecognized file extensions.

If you use [nvm](https://github.com/nvm-sh/nvm), install a patched v22 release
(for example, `nvm install 22.23.4`).
See [TLS trust stores](../README.md#tls-trust-stores) for runtime security considerations.

#### Install pnpm and Nx

Install `pnpm` and the Nx CLI globally:

```sh
npm install -g pnpm
npm install -g nx
```

#### Rust toolchain

To build from source instead of using published packages only, you need
[Rust](https://www.rust-lang.org/tools/install) and the additional
[c2pa-wasm prerequisites](../packages/c2pa-wasm/README.md#prerequisites).

#### TLS trust stores for builds

The workspace pins `c2pa` to **0.91.7** for native bindings, WebAssembly, and type
generation. Native SDK HTTP requests and Trustmark model downloads use Reqwest
with Rustls and share the patched `rustls-webpki` verifier and `webpki-roots`
bundle in `Cargo.lock`.

Build tooling also has independent HTTPS trust paths:

- Node HTTPS clients, including `got` for the Binaryen download, require a patched
  Node runtime. Updating npm HTTP-client packages alone does not update Node's
  TLS verifier or roots.
- The Trustmark dependency's ONNX Runtime downloader uses `ureq` with `native-tls`,
  while Cargo, Rustup, `cargo-binstall`, and shell downloads use their own runtime
  or system TLS configuration. Keep those tools and OS CA packages patched.

### Recommended setup order

1. Install Node.js, `pnpm`, and the Nx CLI (see the previous sections).
2. Install the Rust toolchain and the [c2pa-wasm prerequisites](../packages/c2pa-wasm/README.md#prerequisites).
3. From the repository root, run `pnpm install` to install dependencies.

### Running commands with Nx

Run tasks as `nx <target> <project>`. For example:

```sh
nx build c2pa-web   # Builds c2pa-web and its dependencies
nx test c2pa-web    # Builds and runs tests for c2pa-web
nx lint c2pa-web    # Runs ESLint on c2pa-web
nx lint c2pa-web --fix   # Runs ESLint and applies fixes
```

## Contributing to c2pa-web

Install the [repo-wide prerequisites](#prerequisites), including the additional
[c2pa-wasm prerequisites](../packages/c2pa-wasm/README.md#prerequisites).

### Building

To build the library:

```sh
nx build c2pa-web
```

### Testing

This library relies on [Vitest](https://vitest.dev/) to run its tests in a headless
browser. Before the tests can be run, install the browser binaries. Run the
following from `packages/c2pa-web`, rather than the repository root, to ensure
that the correct binaries are installed:

```sh
pnpm exec playwright install
```

Then, from the repository root, run:

```sh
nx test c2pa-web
```

## Contributing to c2pa-node

Install the [repo-wide prerequisites](#prerequisites). Rust is required for source
builds, but not for normal package installation, which downloads precompiled
binaries.

### Building a custom Rust binary

From `packages/c2pa-node`, run:

```sh
pnpm run build:rust
```

To use the custom binary:

```sh
export C2PA_LIBRARY_PATH=<path-to-binary-folder>/index.node
```

## Building API documentation

The versioned Node.js and web API sites are generated with
[TypeDoc](https://typedoc.org/) from declarations in published npm releases.
After installing workspace dependencies, run these commands from the monorepo root:

```sh
pnpm ci:docs:node       # Versioned Node.js docs only
pnpm ci:docs:web        # Versioned web docs only
pnpm ci:docs:releases   # Both versioned sites
```

These commands require npm and network access to the public npm registry, but
no Rust build, native binaries, WASM compilation, or GitHub authentication.
Packages are installed in isolated temporary directories with lifecycle scripts
disabled. Only their TypeScript declarations are parsed, and temporary installs
are removed after the build.

### Selecting releases and defaults

Node and web have independent version lists:

- [node-versions.json](../api-docs/node-versions.json) selects releases of
  `@contentauth/c2pa-node`.
- [web-versions.json](../api-docs/web-versions.json) selects releases of
  `@contentauth/c2pa-web`, including the main and `/inline` entry points.

Versions must be exact npm releases, not tags such as `latest` or version ranges.
The first entry is the default. Adding or publishing a release does not
automatically change the default or add it to the lists.

The first Node.js version is served at `api-docs/node/index.html`; every selected
release is also available at `api-docs/node/versions/<version>/index.html`,
published at `https://contentauth.github.io/c2pa-js/node/versions/<version>/`.
The equivalent web paths are `api-docs/web/index.html` and
`api-docs/web/versions/<version>/index.html`, published at
`https://contentauth.github.io/c2pa-js/web/versions/<version>/`.

The public web docs exclude members marked `@internal`. Versioned builds rewrite
the published README's monorepo-root relative links to their public GitHub URLs.

### Building and publishing the complete site

Run `pnpm ci:docs` to build the existing multi-package source documentation and
both versioned sites together. Build the workspace libraries first; unlike
`pnpm ci:docs:releases`, the multi-package source build needs their build outputs.

Generated output is written directly to `api-docs/`, alongside the tracked version
lists and selector assets; `docs/` is reserved for other documentation. TypeDoc's
output-directory cleaning is disabled for the multi-package build to preserve
those source files and the versioned sites. Rebuilding one versioned site does
not remove the other. Generated files are ignored by Git, but the version lists
and selector assets remain tracked.

The release workflow publishes the complete site after a new package release.
Run that workflow manually to rebuild documentation without publishing packages.
GitHub Pages publishes `api-docs/` as the site root, so public URLs are unchanged.

For unversioned web-only source documentation, run `pnpm build:docs` from
`packages/c2pa-web`; its output goes into that package's `api-docs/` directory.

Run `pnpm test:docs` for the documentation tooling tests.

## Committing changes for a release

Include a changeset when your change should ship in a release.
From the repository root:

```sh
pnpm changeset
```

Follow the prompts to bump affected packages. The command adds a Markdown file
under `.changeset/`; commit that file with your pull request.

After the pull request merges to `main`, the changeset bot opens a release pull
request. When that pull request merges, a new release is published.

## Directory layout

### Packages

The `packages/` directory contains the production libraries and their intermediate
and internal dependencies.

| Package | Description | Source |
|---------|-------------|--------|
| c2pa-web | JavaScript library for working with C2PA data in a web browser. | [packages/c2pa-web](../packages/c2pa-web) |
| c2pa-node | Node.js library that reads and validates C2PA manifest data and adds signed manifests to media assets. | [packages/c2pa-node](../packages/c2pa-node) |
| c2pa-wasm | WebAssembly bindings for [c2pa-rs](https://github.com/contentauth/c2pa-rs) that power c2pa-web, built with [wasm-bindgen](https://github.com/wasm-bindgen/wasm-bindgen). Most applications should use c2pa-web instead of calling the bindings directly. | [packages/c2pa-wasm](../packages/c2pa-wasm) |
| c2pa-types | TypeScript types generated from c2pa-rs structs for use by c2pa-web and c2pa-node. | [packages/c2pa-types](../packages/c2pa-types) |
| c2pa-utilities | A small internal helper library shared across the monorepo. | [packages/c2pa-utilities](../packages/c2pa-utilities) |

### Tools

The `tools/` directory contains utilities for local development.

- [testbed](../tools/testbed): Minimal site for inspecting c2pa-web output and
  experimenting locally.
- [nx-wasm-bindgen](../tools/nx-wasm-bindgen): Custom
  [Nx executor](https://nx.dev/concepts/executors-and-configurations) that builds
  c2pa-wasm with wasm-bindgen.