# Working in c2pa-js

This guide applies across the repository. Follow the conventions of the package
you are changing; do not assume the browser and Node.js bindings are interchangeable.
Start with [README.md](./README.md), the
[development guide](./docs/project-contributions.md), and
[CONTRIBUTING.md](./CONTRIBUTING.md). Package READMEs document their public APIs
and package-specific setup.

## Repository map and navigation

This is a pnpm/Nx monorepo with a Rust workspace. Production packages are published
under `@contentauth/`; shared workspace dependencies use `workspace:*`.

| Location                                               | Purpose and where to start                                                                                                                        |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| [packages/c2pa-web/](./packages/c2pa-web/)             | Browser-facing TypeScript API. Start in `src/`; both the main and `/inline` entry points are public. Uses the WASM bindings and shared utilities. |
| [packages/c2pa-node/](./packages/c2pa-node/)           | Node.js API backed by a native Neon addon. TypeScript wrappers and tests are in `js-src/`, Rust bindings in `src/`, and fixtures in `tests/`.     |
| [packages/c2pa-wasm/](./packages/c2pa-wasm/)           | Rust/wasm-bindgen bindings over `c2pa-rs`, used by `c2pa-web`. Rust source is in `src/`; `pkg/` is build output.                                  |
| [packages/c2pa-types/](./packages/c2pa-types/)         | TypeScript types generated from `c2pa-rs`. See `src/`, `build.ts`, and the package's `index.ts` exports.                                          |
| [packages/c2pa-utilities/](./packages/c2pa-utilities/) | Shared TypeScript helpers, including Settings/Context and HTTP-related logic. Check here before implementing similar logic in Node or web.        |
| [tools/nx-wasm-bindgen/](./tools/nx-wasm-bindgen/)     | Custom Nx executors for building and testing WASM. Start here for WASM build-pipeline changes.                                                    |
| [tools/testbed/](./tools/testbed/)                     | Local browser app for exercising `c2pa-web` and inspecting manifests.                                                                             |
| [scripts/](./scripts/) and [api-docs/](./api-docs/)    | API documentation tooling, tracked version lists, and selector assets. Generated documentation also goes into `api-docs/`.                        |
| [docs/](./docs/) and [.github/](./.github/)            | Contributor documentation, CI/release workflows, and the PR template.                                                                             |

Public API entry points are [web/src/index.ts](./packages/c2pa-web/src/index.ts),
[web/src/inline.ts](./packages/c2pa-web/src/inline.ts), and
[node/js-src/index.ts](./packages/c2pa-node/js-src/index.ts). Native registrations
are in [node/src/lib.rs](./packages/c2pa-node/src/lib.rs); WASM adapters start in
[wasm/src/lib.rs](./packages/c2pa-wasm/src/lib.rs). Shared utilities are exported
through [utilities/src/index.ts](./packages/c2pa-utilities/src/index.ts).

For a change, trace the public API through its TypeScript wrapper and native/WASM
implementation where relevant. Inspect package exports before adding an API or
changing an import. Use workspace package imports rather than reaching into
another package's private source or build output.

Nx targets can be defined in package scripts, `project.json`, or inferred from
TypeScript, Vite, Vitest, and ESLint configuration. Do not infer project names
solely from directory names:

```sh
pnpm exec nx show projects
pnpm exec nx show project c2pa-web
pnpm exec nx show project @contentauth/c2pa-utilities
```

The utilities Nx project is named `@contentauth/c2pa-utilities`; the other library
projects are `c2pa-web`, `c2pa-node`, `c2pa-wasm`, and `c2pa-types`.

## Setup and common commands

Unless noted otherwise, run commands from the repository root. Use the workspace
Nx CLI through `pnpm exec`; a global Nx installation is not required for these commands.

- Use the pnpm version pinned by `packageManager` in [package.json](./package.json)
  (currently 10.15.0). Do not introduce npm/yarn lockfiles.
- Use a patched Node.js release listed in the
  [prerequisites](./docs/project-contributions.md#prerequisites); the main CI job
  uses Node.js 24. Do not rely only on the package's broad Node engine range.
- Source builds need Rust at the workspace minimum version or newer, Clippy, and
  the `wasm32-unknown-unknown` target. See [Cargo.toml](./Cargo.toml) and the
  [WASM prerequisites](./packages/c2pa-wasm/README.md#prerequisites).
- Install `wasm-pack` and a `wasm-bindgen-cli` matching the resolved `wasm-bindgen`
  version in [Cargo.lock](./Cargo.lock). Keep the dependency, CLI, setup docs,
  and [.github/actions/install-dependencies/](./.github/actions/install-dependencies/)
  aligned when upgrading.

```sh
pnpm install --frozen-lockfile

pnpm exec nx build c2pa-web
pnpm exec nx lint c2pa-web
pnpm exec nx test c2pa-web
pnpm exec nx typecheck c2pa-web

pnpm exec nx test @contentauth/c2pa-utilities
pnpm exec nx test c2pa-node
pnpm exec nx test c2pa-wasm

pnpm ci:check
cargo +nightly fmt --all -- --check
```

Nx builds/tests have dependency-build ordering; prefer these targets to calling
tools directly before their inputs have been built. `pnpm ci:check` runs the
library lint, test, and build targets; the nightly Rust formatting check is a
separate CI job. See [.github/workflows/ci.yml](./.github/workflows/ci.yml) for the
current CI environment.

For web tests, first install browser binaries from the web package, not the root:

```sh
cd packages/c2pa-web
pnpm exec playwright install
```

Then return to the root for Nx commands. Web Vitest tests run in headless Chromium,
Firefox, and WebKit; WASM tests use `wasm-pack` with headless Chrome.
Node tests build a local native addon;
do not assume an installed precompiled binary exercises changed Rust code.
Trustmark tests download missing ONNX models, so they need network access or a
populated writable model cache. CI prepares
`packages/c2pa-node/tmp/trustmark_models/`; consult the workflow before running them.

For manual browser testing, build `c2pa-web`, then run `pnpm exec nx serve testbed`.
See the [testbed README](./tools/testbed/README.md) for HTTPS setup and usage.

## Coding conventions and compatibility

- Keep changes focused. Match surrounding naming, imports, layout, and error
  handling rather than reformatting or rewriting unrelated code.
- TypeScript is strict. Prefer existing domain types and type guards over
  `any`, unchecked assertions, or non-null assertions. Preserve ESM exports and
  existing `.js` relative import specifiers. The Node package has its own
  [TypeScript configuration](./packages/c2pa-node/tsconfig.json).
- Use the repository's [Prettier configuration](./.prettierrc) and the applicable
  ESLint configuration. Root formatting uses single quotes and no trailing
  commas; the Node package has a separate
  [ESLint configuration](./packages/c2pa-node/eslint.config.cjs). Avoid bulk formatting.
- Preserve existing license headers. New JS/TS source files covered by the root
  [ESLint configuration](./eslint.config.mjs) need the Adobe header used in adjacent files.
- Format Rust with nightly rustfmt and [rustfmt.toml](./rustfmt.toml). Group imports
  as configured, and follow the blank-line guidance for multi-line blocks in
  [CONTRIBUTING.md](./CONTRIBUTING.md#code-formatting). Respect each crate's edition.
- Check shared utilities before adding Settings/Context, input-validation,
  signer, or HTTP logic. Keep Node and web behavior aligned where it is shared;
  document intentional differences rather than silently creating package-local copies.
- Keep Node-only filesystem/native functionality out of browser/shared code.
  When an API spans TypeScript and Rust, update both sides and their exported types.
  For web APIs, check the main, inline, and worker surfaces as applicable.
- Preserve error contracts, cleanup, and validation behavior. Reuse existing
  error-conversion helpers; do not hide failures with catch-all success defaults.
  Do not unify [Node error conversion](./packages/c2pa-node/src/error.rs) with
  [WASM reader errors](./packages/c2pa-wasm/src/wasm_reader.rs): WASM deliberately
  uses `JsString` errors for Firefox-worker compatibility.
- Add or update public API documentation alongside behavior changes. Follow the
  existing documentation comments and `@internal` boundaries.

## Generated files and dependencies

- Edit source/generators, not `dist/`, `out-tsc/`, `target/`, WASM `pkg/`,
  native `index.node` binaries, or generated API documentation.
- Regenerate C2PA types with `pnpm exec nx build c2pa-types` rather than patching
  generated schemas/types. The [generator](./packages/c2pa-types/build.ts) clears
  and recreates `schemas/` and `types/`; the
  [type export facade](./packages/c2pa-types/index.ts) is hand-maintained.
  Rebuild affected consumers after type changes.
- The [WASM build executor](./tools/nx-wasm-bindgen/src/executors/build/executor.ts)
  also generates the `WASM_SRI` integrity value used by web loading. Rebuild
  through the pipeline rather than changing the binary or integrity value alone.
- Preserve tracked [API documentation version lists and selector assets](./api-docs/).
  Do not delete that directory to clean generated documentation.
- Make dependency changes in the appropriate package or workspace manifest,
  update lockfiles through pnpm/Cargo, and avoid unrelated dependency upgrades.
  The shared `c2pa` dependency is declared in [Cargo.toml](./Cargo.toml).

## Tests and pull requests

Run the smallest relevant lint, test, and build/typecheck targets, then broaden to
affected consumers when changing shared types, utilities, or bindings. Use
`pnpm ci:check` for cross-package validation before submitting substantial code changes.
Do not claim a skipped or unavailable check passed; report missing prerequisites
and the exact checks actually run.

Add regression tests for behavior changes near the existing tests, using the
package's fixtures and mocking patterns. Include error cases and cleanup where
relevant. Prefer package runtime tests over mocks alone for binding changes.
Node and utilities use colocated `*.spec.ts` tests in a Node Vitest environment.
Web tests share [browser fixtures](./packages/c2pa-web/test/methods.ts) for
initialization/disposal and MSW setup/teardown; reuse them instead of duplicating
resource and mock-server lifecycle code.

For documentation tooling changes, run `pnpm test:docs`. Versioned documentation
commands such as `pnpm ci:docs:releases` fetch published npm declarations and need
network access; they do not validate unreleased workspace APIs. See the
[documentation build guide](./docs/project-contributions.md#building-api-documentation).
Documentation-only prose changes do not require native/WASM builds.

Before opening a PR:

- Follow [CONTRIBUTING.md](./CONTRIBUTING.md), including the contributor CLA and
  code of conduct. Discuss major API additions in an issue before implementation.
- Follow [.github/PULL_REQUEST_TEMPLATE](./.github/PULL_REQUEST_TEMPLATE):
  include Overview, Changes, Testing, and the cross-package drift check when applicable.
- Include a changeset for changes that should ship in a package release.
  Run `pnpm changeset` and commit the resulting file; do not manually perform the
  release/versioning workflow as part of an ordinary feature PR.
- Recent commit subjects use prefixes such as `feat(c2pa-node):`, `fix:`, and
  `docs:`. Use similarly concise, descriptive commit and PR titles.
- Keep generated outputs, local caches, credentials, and unrelated worktree
  changes out of the PR. Summarize compatibility effects and validation performed.
- Report suspected vulnerabilities through [SECURITY.md](./SECURITY.md), not a public issue.
