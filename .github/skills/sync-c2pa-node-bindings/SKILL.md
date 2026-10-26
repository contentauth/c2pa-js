---
name: sync-c2pa-node-bindings
description: Sync c2pa-rs public API changes into @contentauth/c2pa-node Neon bindings. Use for Node dependency bumps, binding syncs, or exposing new Rust APIs.
---

# Sync Node bindings

Expose new/changed stable `c2pa` APIs. Preserve Node.js/TypeScript ergonomics.

## Discover and classify

1. Read root `Cargo.toml`. `OLD` = pinned version; `NEW` = requested version or latest from `cargo search c2pa --limit 1`.
   Already bumped, including by Web skill? Recover OLD from `git log -p -- Cargo.toml`.
2. Clone `https://github.com/contentauth/c2pa-rs` into temporary directory. Check tags with `git tag -l 'c2pa-v*'`.
   Compare using `git diff c2pa-vOLD..c2pa-vNEW -- sdk/src`, changelog sections, or `cargo public-api -p c2pa diff OLD NEW`.
   Prefer public-api diff when available.
3. List added, changed, removed, deprecated items. Include Reader, Builder, Signer/AsyncSigner, Context, Settings, CAWG identity, errors.
   - Bind stable APIs useful in Node, including filesystem APIs. Reuse `SourceAsset`/`DestinationAsset`: `{ path } | { buffer, mimeType }`.
   - Skip hidden/deprecated items and redundant sync/async variants; choose execution appropriate to operation.
   - Assess feature-gated/experimental APIs separately. When explicitly requested, enable required feature, document status, check shared-workspace impact.
   - Fix existing bindings affected by signatures/removals. Record every skip reason.
4. Update shared pin and lockfile: `cargo update -p c2pa`. Run `cargo check -p c2pa-node`.
   Fix dependency breakages before new bindings.

## Wire every layer

- **Rust:** `packages/c2pa-node/src/neon_*.rs`, `asset.rs`, `error.rs`, `runtime.rs`.
  Follow `Neon<Name>` wrappers, existing `Arc<Mutex<T>>` ownership, `cx.boxed`, `FunctionContext`, `JsResult`.
  Read receiver with `cx.this::<JsBox<Neon<X>>>()`. Use JSON/serde, JsBuffer, or existing structured converters.
  For I/O/heavy work, spawn on `runtime()`; settle `JsPromise` using channel/deferred.
  Convert errors through `error.rs`/`as_js_error`; never unwrap/panic.
  Keep callbacks on JS thread. Never move Neon JS handles into background Rust work without supported channel/root mechanism.
- **Registration:** export camelCase `<object><Method>` functions through `cx.export_function` in `src/lib.rs`.
- **Typings:** declare native functions in `js-src/index.node.d.ts`; update matching public interfaces/handle types in `js-src/types.d.ts`.
- **Public TS:** extend `js-src/{Reader,Builder,Signer,Settings,IdentityAssertion,Trustmark}.ts`; export through `js-src/index.ts`.
  Use Buffer/paths/asset objects, camelCase, options objects, TSDoc. Parse JSON into `@contentauth/c2pa-types` objects.
  Keep handles private. Preserve synchronous in-memory methods; use Promises for async/heavy operations.
  Throw Error with upstream message; never crash process.
  New types need `neon_<name>.rs`, `js-src/<Name>.ts`, module registration and public export.
- Root dependency also serves WASM and c2pa-types. Align names with [Web skill](../sync-c2pa-web-bindings/SKILL.md), not execution model.

## Reference patterns

Read relevant PR diff; follow current code, not historical layouts.

- [#162](https://github.com/contentauth/c2pa-js/pull/162), incorporating [contentauth/c2pa-rs#2281](https://github.com/contentauth/c2pa-rs/pull/2281):
  bumps dependency, enables historical `experimental_builder_filter`, adds Neon methods/exports, TS interfaces, tests, three-package changeset.
  Node invokes predicates directly; Web sends indices. Align `filterActions`/`filterIngredients` names.
  Require boolean results. After JS throws, stop invoking JS while exception remains pending.
  Rust filter closure has no error channel: capture exception out-of-band, then re-raise.
  Filtering may partially mutate; document contract, never promise atomicity.
  Preserve inception actions and ingredient references. Retaining actions differs from rescuing orphan ingredients.
- [#229](https://github.com/contentauth/c2pa-js/pull/229): callback adaptation, not dependency bump or evidence of new upstream method.
  Synchronous `Builder.updateAssertion(label, transform): void` calls `builderUpdateAssertion`; update `BuilderInterface`.
  Match exact labels in manifest order. Run/convert all results before mutation.
  Throws/invalid data leave builder unchanged. Null/undefined keeps data; missing label is no-op.
  Preserve metadata and JSON/CBOR kinds. Callback holds builder lock: prevent same-builder re-entry; consider deadlocks before copying pattern.
- [#104](https://github.com/contentauth/c2pa-js/pull/104): Web-only crJSON reference, no Node binding.
  Public `crJson` returns parsed data. Shared dependency bumps can change existing test expectations beyond added API.

Do not make cheap in-memory operations async merely for Web symmetry. Keep heavy work off event loop.

## Verify and deliver

- Add `js-src/<Class>.spec.ts` tests using `tests/fixtures`. Cover output shape, errors, preserved behavior.
  Callback tests: ordering, duplicate matches, missing-label/no-op cases, invalid results, mutation-on-failure contract.
  Test signing/readback when serialization or manifest validity matters. References do not limit coverage.
- Run `pnpm nx run-many -t build lint test -p c2pa-node`. All checks must pass.
  Lint runs clippy/eslint; tests build debug native module first.
- Add `.changeset/<name>.md` for `@contentauth/c2pa-node`: minor for new APIs; breaking note for changed public signatures.
  Same dependency update on Web? One changeset may list all affected packages.
- Report OLD/NEW, each upstream item's bound TS name or skip reason, breaking fixes, validation results.
  Do not open PR unless requested.
