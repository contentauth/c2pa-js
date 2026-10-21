---
name: sync-c2pa-web-bindings
description: Sync c2pa-rs public API changes into @contentauth/c2pa-wasm and @contentauth/c2pa-web. Use for web dependency bumps, binding syncs, or exposing new Rust APIs.
---

# Sync Web bindings

Expose new/changed stable `c2pa` APIs useful in browsers. Preserve browser/TypeScript ergonomics.

## Discover and classify

1. Read root `Cargo.toml`. `OLD` = pinned version; `NEW` = requested version or latest from `cargo search c2pa --limit 1`.
   Already bumped? Recover OLD from `git log -p -- Cargo.toml`.
2. Clone `https://github.com/contentauth/c2pa-rs` into temporary directory. Check tags with `git tag -l 'c2pa-v*'`.
   Compare using `git diff c2pa-vOLD..c2pa-vNEW -- sdk/src`, changelog sections, or `cargo public-api -p c2pa diff OLD NEW`.
   Prefer public-api diff when available; installation: `cargo install cargo-public-api`. Run from SDK directory; nightly may be needed.
3. List added, changed, removed, deprecated items. Include Reader, Builder, Signer/AsyncSigner, Context, Settings, CAWG identity, errors.
   - Bind stable APIs reachable in WASM.
   - Skip browser filesystem APIs; prefer Blob/stream equivalents. Skip hidden/deprecated items and redundant sync/async variants.
   - Assess feature-gated/experimental APIs separately. When explicitly requested, enable required feature, document status, check WASM and shared-workspace impact.
   - Fix existing bindings affected by signatures/removals. Record every skip reason.
4. Update shared pin and lockfile: `cargo update -p c2pa`.
   Run `cargo check -p c2pa-wasm --target wasm32-unknown-unknown`. Fix dependency breakages before new bindings.

## Wire every layer

- **Rust:** `packages/c2pa-wasm/src/wasm_*.rs`, `stream/blob_stream.rs`, `error.rs`, `utils.rs`.
  Follow `Wasm<Name>` wrappers and `#[wasm_bindgen(js_name = camelCase)]`.
  Use existing `WasmError` conversions and `Result<T, JsValue>`/`JsString`; never `JsError` (Firefox worker issue in `wasm_reader.rs`).
  Accept Blob/Uint8Array; return Uint8Array via `cursor_to_u8array`. Use JSON-compatible `serde_wasm_bindgen::Serializer`.
  Register new `wasm_<name>.rs` modules in `lib.rs`.
- **Worker:** add `<object>_<method>` handler in `packages/c2pa-web/src/lib/worker.ts` and declaration in `worker/rpc.ts`.
  Reuse `createWorkerObjectMap`. Transfer ArrayBuffers where existing code does.
- **Public TS:** extend `src/lib/{reader,builder,signer,c2pa}.ts`; export through `src/index.ts`/`src/inline.ts`.
  Worker-backed methods return Promises; WASM internals may stay synchronous.
  Use Blob, ArrayBuffer/Uint8Array, typed objects from `@contentauth/c2pa-types`, camelCase, options objects, TSDoc.
  Keep worker IDs/WASM handles private. Throw Error subclasses with upstream messages.
  Extend typed settings/context options instead of free-form JSON.
- **Types:** regenerate changed manifest/settings schemas through `pnpm nx run c2pa-types:build`; check its `project.json`. Include generated output.
  Root dependency also serves Node and c2pa-types. Align method names with [Node skill](../sync-c2pa-node-bindings/SKILL.md).

## Reference patterns

Read relevant PR diff; follow current code, not historical layouts.

- [#104](https://github.com/contentauth/c2pa-js/pull/104): `Reader::crjson`, WASM `crJson`, `reader_crJson` RPC/handler, public `crJson`.
  Bridge returns string; public wrapper parses JSON. Pin/lock update also changes expected `c2pa.actions` label to `c2pa.actions.v2`.
  Check dependency behavior changes, not only compilation.
- [#162](https://github.com/contentauth/c2pa-js/pull/162), incorporating [contentauth/c2pa-rs#2281](https://github.com/contentauth/c2pa-rs/pull/2281):
  enables historical `experimental_builder_filter` feature; exposes documented experimental filters on both platforms.
  Functions cannot cross worker RPC. Evaluate predicates on caller side; send indices to `filterActionsAt`/`filterIngredientsAt`.
  Match Rust order across all actions assertions: assertion order, then action order.
  Keep inception actions. Action filtering does not remove ingredients automatically; rescue cannot drop referenced/lineage ingredients.
- [#229](https://github.com/contentauth/c2pa-js/pull/229): callback adaptation, not dependency bump or evidence of new upstream method.
  `updateAssertion(label, transform)` sends serializable replacements through `builder_updateAssertionsAt`.
  WASM checks count and converts all replacements before mutation. Preserve exact labels, duplicate order, metadata, JSON/CBOR kinds.
  Null/undefined keeps data; missing label is no-op. Throws/invalid data leave builder unchanged.

Never post callback functions. Preserve snapshot/transform/apply alignment; account for interleaving mutations. Never claim concurrent safety without tests or serialization.

## Verify and deliver

- Add neighboring `*.spec.ts` tests with existing fixtures. Cover output shape, errors, preserved behavior.
  Callback tests: ordering, multiple assertions, duplicate matches, references, no-ops, invalid results, mutation-on-failure.
  Test signing/readback when serialization or manifest validity matters. References do not limit coverage.
- Run `cargo clippy -p c2pa-wasm --target wasm32-unknown-unknown`.
- Run `pnpm nx run-many -t build lint test -p c2pa-wasm c2pa-web`. All checks must pass.
- Add `.changeset/<name>.md` for `@contentauth/c2pa-wasm` and `@contentauth/c2pa-web`: minor for new APIs; major/breaking note for changed public signatures.
- Report OLD/NEW, each upstream item's bound TS name or skip reason, breaking fixes, validation results.
  Do not open PR unless requested.
