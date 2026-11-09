# Working in c2pa-js

Run the smallest relevant lint/test/build/typecheck targets.
For shared types, utilities, or bindings, identify affected consumers from imports and call sites; test changed paths in each.
Run `pnpm ci:check` for API or behavior changes spanning packages, or when consumer impact is unclear.
Report exact checks and missing prerequisites; never claim skipped checks passed.

Read [README.md](./README.md), the [development guide](./docs/project-contributions.md),
[CONTRIBUTING.md](./CONTRIBUTING.md), and the relevant package README.
This guide applies repository-wide. Follow package conventions; Node and browser bindings are not interchangeable.

## Repository map

pnpm/Nx monorepo with a Rust workspace. Production packages use `@contentauth/`; workspace dependencies use `workspace:*`.

- [c2pa-web](./packages/c2pa-web/): browser TypeScript API over WASM and shared utilities.
  Public entry points: [main](./packages/c2pa-web/src/index.ts), [inline](./packages/c2pa-web/src/inline.ts);
  The [worker](./packages/c2pa-web/src/lib/worker.ts) bridges browser API calls to WASM.
- [c2pa-node](./packages/c2pa-node/): Node API with a native Neon addon.
  TypeScript and tests: `js-src/`; Rust: `src/`; fixtures: `tests/`.
  Start at [public exports](./packages/c2pa-node/js-src/index.ts) and [native registrations](./packages/c2pa-node/src/lib.rs).
- [c2pa-wasm](./packages/c2pa-wasm/): Rust/wasm-bindgen adapters over `c2pa-rs`.
  Start at [src/lib.rs](./packages/c2pa-wasm/src/lib.rs); `pkg/` is generated.
- [c2pa-types](./packages/c2pa-types/): generated TypeScript types; Rust schema sources in `src/`.
  [build.ts](./packages/c2pa-types/build.ts) recreates `schemas/` and `types/`;
  [index.ts](./packages/c2pa-types/index.ts) is a hand-maintained export facade.
- [c2pa-utilities](./packages/c2pa-utilities/): shared Settings/Context and HTTP helpers;
  [exports](./packages/c2pa-utilities/src/index.ts). Nx project: `@contentauth/c2pa-utilities`.
- [nx-wasm-bindgen](./tools/nx-wasm-bindgen/): custom WASM build/test executors.
- [testbed](./tools/testbed/): local browser app for inspecting manifests.
- [scripts/](./scripts/): API documentation tooling.
  [api-docs/](./api-docs/): generated documentation plus tracked version lists and selector assets.
- [docs/](./docs/): contributor documentation; [.github/](./.github/): CI, releases, PR template.

Trace API changes through TypeScript and native/WASM implementations.
Check package exports; use workspace imports, never another package's private source or build output.
Nx targets come from scripts, `project.json`, and inferred TypeScript/Vite/Vitest/ESLint configuration.
Confirm names and targets; directories do not always match project names:

```sh
pnpm exec nx show projects
pnpm exec nx show project c2pa-web
pnpm exec nx show project @contentauth/c2pa-utilities
```

Other library project names: `c2pa-web`, `c2pa-node`, `c2pa-wasm`, `c2pa-types`.

## Setup and commands

Run from the repository root unless noted. Use `pnpm exec nx`; no global Nx required.

- Use `packageManager` in [package.json](./package.json) (pnpm 10.15.0). No npm/yarn lockfiles.
- Use a patched Node release from [prerequisites](./docs/project-contributions.md#prerequisites), not just the package engine range. Main CI uses Node 24.
- Source builds require the [workspace Rust minimum](./Cargo.toml), Clippy, `wasm32-unknown-unknown`, and [WASM prerequisites](./packages/c2pa-wasm/README.md#prerequisites).
- Install `wasm-pack`; match `wasm-bindgen-cli` to resolved `wasm-bindgen` in [Cargo.lock](./Cargo.lock).
  Keep dependencies, CLI, setup docs, and [CI installation](./.github/actions/install-dependencies/) aligned during upgrades.

```sh
pnpm install --frozen-lockfile
```

- **Web tests:** next, run `pnpm exec playwright install` from `packages/c2pa-web`, then return to the root.
  Vitest uses headless Chromium, Firefox, and WebKit.
- **WASM tests:** `wasm-pack` with headless Chrome.
- **Node tests:** build the local native addon; downloaded binaries do not test changed Rust.
- **Trustmark tests:** download missing ONNX models; require network access or a populated writable cache.
  CI uses `packages/c2pa-node/tmp/trustmark_models/`.

Common commands; run only those relevant to your change:

```sh
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

Prefer Nx targets for dependency-build ordering.
`pnpm ci:check` runs library lint/test/build; nightly Rust formatting is separate.
See [CI](./.github/workflows/ci.yml) for environment details.

- **Manual browser testing:** build `c2pa-web`, then `pnpm exec nx serve testbed`.
  See [testbed README](./tools/testbed/README.md) for HTTPS setup.

## Coding and compatibility

### General

- Match surrounding naming, imports, layout, and error handling.
  Apply required lint/format fixes to changed code; avoid unrelated rewrites or repository-wide formatting.
- Keep strict TypeScript, ESM exports, and `.js` relative imports.
  Prefer domain types and guards over `any`, unchecked casts, or non-null assertions.
- Use applicable ESLint and [Prettier](./.prettierrc): single quotes, no trailing commas.
  Preserve license headers; new JS/TS covered by [root ESLint](./eslint.config.mjs) needs the adjacent Adobe header.
- Use nightly rustfmt and [rustfmt.toml](./rustfmt.toml) import grouping.
  Respect crate editions and [blank-line rules](./CONTRIBUTING.md#code-formatting) for multiline blocks.
- Update both TypeScript/Rust sides and exported types when an API spans bindings.
- Preserve validation, cleanup, and error contracts. Reuse conversion helpers; never hide failures with success defaults.
- Update public API documentation with behavior changes. Preserve documentation style and `@internal` boundaries.

### Shared utilities

- Check utilities before adding Settings/Context, Reader/Builder validation, signer, or HTTP logic.
  Keep shared behavior aligned; document intentional differences and unavoidable duplicates.
- Keep Node filesystem/native code out of browser/shared code.

### Node

- Use Node's separate [TypeScript](./packages/c2pa-node/tsconfig.json) and [ESLint](./packages/c2pa-node/eslint.config.cjs) configuration.
- Preserve [Node error conversion](./packages/c2pa-node/src/error.rs); do not unify it with WASM reader errors.

### Web and WASM

- Trace changed web APIs through main/inline entry points, worker messaging, and WASM.
  Update and test affected layers only.
- Preserve [WASM reader errors](./packages/c2pa-wasm/src/wasm_reader.rs): `JsString` supports Firefox workers.

## Generated files and dependencies

- Edit sources/generators, not `dist/`, `out-tsc/`, `target/`, WASM `pkg/`, `index.node`, or generated API docs.
- Regenerate types with `pnpm exec nx build c2pa-types`; rebuild affected consumers.
- The [WASM executor](./tools/nx-wasm-bindgen/src/executors/build/executor.ts) generates `WASM_SRI`.
  Rebuild through the pipeline; never change the binary or integrity value alone.
- Never delete `api-docs/` to clean output: preserve tracked version lists and selector assets.
- Change appropriate manifests; update locks through pnpm/Cargo. Avoid unrelated upgrades.
  Shared `c2pa` dependency lives in root `Cargo.toml`.

## Validation and pull requests

- Add nearby regression tests using existing fixtures/mocks. Cover errors and cleanup; test bindings at runtime, not only through mocks.
  Node/utilities use colocated `*.spec.ts` in Node Vitest.
  Reuse [web fixtures](./packages/c2pa-web/test/methods.ts) for initialization/disposal and MSW lifecycle.
- Documentation tooling: `pnpm test:docs`.
  Versioned commands such as `pnpm ci:docs:releases` need network access and published npm declarations; they do not validate unreleased APIs.
  See [documentation builds](./docs/project-contributions.md#building-api-documentation).
  Prose-only changes need no native/WASM builds.
- Follow the contributor CLA and code of conduct. Discuss major API additions in an issue first.
- Follow [PR template](./.github/PULL_REQUEST_TEMPLATE): Overview, Changes, Testing, and applicable cross-package drift check.
  Explain compatibility effects and validation.
- For changes requiring a package release, run `pnpm changeset` and include the generated file.
  Do not run release/versioning workflows in feature PRs.
- Follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) for commit subjects and PR titles:
  `<type>[optional scope]: <description>`, e.g. `feat(c2pa-node): add support`, `fix: correct validation`, `docs: update guidance`.
- Exclude generated output, caches, credentials, and unrelated worktree changes.
  Report suspected vulnerabilities through [SECURITY.md](./SECURITY.md), never public issues.
