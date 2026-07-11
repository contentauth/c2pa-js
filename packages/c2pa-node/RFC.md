# RFC: Rebase c2pa-node on c2pa-rs's public C API via koffi

**Status:** Draft / for discussion — now backed by a working PoC (see below)
**Author:** (spike + analysis)
**Date:** 2026-07-09 (rewritten 2026-07-11 to remove out-of-scope Adobe-specific content — see below)
**Target:** `packages/c2pa-node` in the `c2pa-js` monorepo

## This branch (`ale/koffi-poc`)

This branch is the working-code companion to this RFC: it actually tears out
the Neon binding in `packages/c2pa-node` and replaces it with a koffi FFI
binding over `c2pa-rs`'s public C API, so `git diff main` here **is** the
before/after comparison. See "PoC results" near the end of this document for
what works, what doesn't (with concrete spec pass/fail numbers), and a
pros/cons summary. Base for the rewrite: a colleague's (gpeacock) separate
koffi exploration at `~/Repos/c2pa-koffi`, adapted to preserve this
package's existing public API wherever the C API allows it.

**Scope note (2026-07-11):** an earlier draft of this RFC also proposed
adding a new `AdobeSigner` capability (Adobe claims-signer + CAWG-identity
signing, implemented in Adobe's private `adobe_api` Rust crate) as part of
this same PoC. That's been removed: `AdobeSigner` isn't part of the
existing `c2pa-node` package today, so it's out of scope for a PoC about
migrating what already exists from Neon to koffi. Anything Adobe-specific
that depends on the private `adobe_api` repo belongs in a separate proposal
if/when it's pursued, not bundled into this one.

## Summary

Replace the current Neon (N-API) binding with a [koffi](https://koffi.dev)
FFI binding over `c2pa-rs`'s own public, open source C API (`c2pa_c_ffi`,
the crate that produces `c2pa.h` and the `libc2pa_c` dylib). This covers
`Reader`, `Builder`, `LocalSigner`, `CallbackSigner`, and `Settings` — the
package's existing public surface — with no new Rust code of our own and no
dependency beyond the public `contentauth/c2pa-rs` repo.

The motivation is reducing bespoke binding maintenance, not adding
capability: this package carries ~10 `neon_*.rs` files coupled to N-API
version churn, when a first-party, multi-consumer C API already exists and
is what `c2pa-python`, `c2patool`, and the C++/WASM SDKs already bind to.
Rebasing onto it means this package stops carrying its own native Rust glue
entirely.

## Motivation

- **Bespoke binding glue.** This package carries ~10 `neon_*.rs` files
  (`packages/c2pa-node/src/`) and is coupled to N-API version churn (`.node`
  is ABI-tied to the Node runtime). A koffi binding loads a plain shared
  library instead, with no Node-version-specific compilation step.
- **A first-party, multi-consumer C API already exists** (`c2pa.h`, from
  `c2pa-rs`'s `c2pa_c_ffi` crate) and is the surface `c2pa-python`,
  `c2patool`, and the C++/WASM SDKs already bind to. Rebasing this package
  onto it isn't inventing a new binding strategy — it's adopting the one
  every other non-Rust C2PA consumer already uses.
- **Async signer callbacks don't survive the move, and that needs calling
  out up front.** The current `CallbackSigner` is typed
  `(data: Buffer) => Promise<Buffer>` (`js-src/types.d.ts`'s
  `CallbackSignerInterface`). koffi's native signer callback must return
  *synchronously* — it runs on the main thread and cannot await real async
  work (verified this session: see "Key finding" below). Any consumer
  relying on a genuinely asynchronous callback signer (e.g. one that makes
  a network call to sign) breaks under this migration. This is the single
  most consequential behavior change and needs to be flagged to any real
  consumer before a cutover.

## Evidence — spikes (all run against real `libc2pa_c`, koffi 3.1.x, Node 22)

| # | Exercised | Result |
|---|---|---|
| 1 | `koffi.load` + `c2pa_version()` | ✅ string marshaled |
| 2 | Builder + local `signer_from_info`; byte out-params; koffi `.async()` off-thread | ✅ signed manifest, off-thread call OK |
| 3 | JS `SignerCallback` invoked by native, main thread and worker thread | ✅ no crash; koffi marshals cross-thread — **but runs the callback on the main thread and blocks the event loop; callback must be synchronous** |
| 4 | Full streaming sign of a real JPEG via JS `Read/Seek/Write` callbacks + readback | ✅ valid signed asset, `validation_state: Valid` |

## Key finding: async JS callback signers do not survive this migration

The current callback signer is typed `(data: Buffer) => Promise<Buffer>`.
koffi cannot replicate this: its signer callback is synchronous and runs on
the main thread (Spike 3). Since `this._callback` always returns a real
`Promise` (per its type), there is no standard JS mechanism to unwrap that
synchronously — even work that's already finished can't be read back
without yielding to the microtask queue, which a blocking native call
can't do.

**This is accepted as a breaking change, not solved.** Verified in the PoC
(`Signer.ts`'s `CallbackSigner.nativeSigner()`): calling
`Builder.signAsync()`/`Builder.sign()` with a genuinely async callback
signer now fails with a clear, specific error pointing at this
limitation, instead of an opaque native COSE-signature error. Any real
migration needs to either accept this loss of capability, or find/build a
different mechanism for consumers who need it (out of scope for this RFC).

## Proposed architecture

```
c2pa-node (TS)                      c2pa-rs's c2pa_c_ffi crate (public, via libc2pa_c)
────────────────────                ──────────────────────────────────────────────────
koffi binding + types                 c2pa Builder / Reader / streams
memory/lifetime discipline            LocalSigner / CallbackSigner (sync only — see above)
                                       Settings
```

### What moves to Rust
Nothing new — this package doesn't gain new Rust-side logic. `Builder`/
`Reader` functionality already lives in `c2pa-rs`; the koffi rebase means
reaching it through the existing public C API instead of a Rust addon
compiled per-Node-version.

### What stays in JS
The koffi binding + public TS types, and buffer/pointer lifetime
management (RAII-style wrappers around native pointers, since koffi
doesn't manage lifetimes for you).

## Async / threading model

- Local-key signing → single blocking C call, dispatchable via koffi
  `.async()` on the libuv threadpool so it doesn't block the event loop.
- Stream callbacks and any JS signer callback are marshaled to the main
  thread by koffi and run synchronously there (Spike 3/4) — fine for
  stream I/O and synchronous signers; **not** usable for async JS signers
  (see "Key finding").
- Throughput is bounded by `UV_THREADPOOL_SIZE` (default 4); tune for
  server/batch signing.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Manual memory management (koffi `c2pa_free`, pointer lifetimes) | Thin RAII-style TS wrappers; the public `c2pa-python` project (ctypes over this same `c2pa_c_ffi` API) is a working reference |
| Packaging the native library | Ship/fetch `libc2pa_c` per platform — `c2pa-rs` already publishes prebuilt binaries (same pattern the `c2pa-koffi` prototype's `fetch:c2pa` script uses), comparable packaging burden to today's prebuilt `.node` |
| Reader validation needs trust settings | `load_trust_settings_for_current_thread` (network load) before read |
| Loss of BYO **async** JS signer | Breaking change, accepted; revisit if a real consumer needs it — see "Key finding" |
| `Builder` methods with no C API equivalent (`addAssertion`, `addRedaction`, `getManifestDefinition`, `updateManifestProperty`, ingredient-without-asset) | See "Decision point" in "PoC results" below — needs a team decision, not resolved by this RFC |

## Open questions / follow-up spikes

1. **Streaming vs. data-hashed embeddable** for asset I/O (avoid per-chunk
   main-thread hops on large assets).
2. **Build/release integration with nx** — this branch already removes
   `@neon-rs/cli`/`cargo-cp-artifact` and the old prebuilt-`.node` pipeline
   entirely (see "PoC results"), but real packaging still needs a decision
   on how `libc2pa_c` gets fetched/shipped by default — following
   `c2pa-rs`'s own prebuilt-binary releases, similar to the `c2pa-koffi`
   prototype's `fetch:c2pa` script.
3. **What to do about lost async-callback-signer capability** (see "Key
   finding") — accept the breaking change, or find another mechanism.

## Rollout

1. ~~Prototype koffi binding for the read path + local-key signing behind a
   flag.~~ **Done 2026-07-10, further than planned** — done as a real
   in-place replacement on `ale/koffi-poc` rather than behind a flag,
   covering read, local-key signing, and callback signing. See "PoC
   results" below.
2. Deprecate the async JS callback signer API; publish migration notes.
3. Cut over `packages/c2pa-node` to the koffi binding; delete superseded TS
   + the `neon_*.rs` glue.

## PoC results (2026-07-10, branch `ale/koffi-poc`)

### What changed

- Deleted `packages/c2pa-node/src/*.rs`, `Cargo.toml` (~2754 lines of Neon
  glue) and all Neon-specific build tooling (`@neon-rs/cli`,
  `cargo-cp-artifact`, `scripts/postinstall.cjs`, the `build:rust*` scripts).
  The package now has **zero Rust code of its own** — it loads a prebuilt
  `libc2pa_c` at runtime via koffi.
- Rewrote `Reader.ts`, `Builder.ts`, `Signer.ts` against a new
  `js-src/native/` koffi layer (`lib.ts`, `error.ts`, `stream.ts`,
  `context.ts`, `signer.ts`), preserving the existing public class/method
  signatures wherever the plain c2pa-rs C API supports it, so the
  pre-existing `.spec.ts` suite could run against it unmodified.
- `Settings.ts` and `assertions.ts` needed **zero changes** — both were
  already pure TypeScript with no native calls.
- `Trustmark.ts` and `IdentityAssertion.ts` (the generic X.509/CAWG identity
  path) are stubbed with clear "not implemented, see RFC.md" throws rather
  than reimplemented.

### Spec suite results (existing tests, run unmodified)

37 passed, 22 failed, 10 skipped (69 total):

| File | Result | Why |
|---|---|---|
| `Reader.spec.ts` | **11/11 pass** | Full parity, including CAWG assertion reading and the `cloud.jpg` remote-manifest case. |
| `Settings.spec.ts` | **17/17 pass** | No native calls to begin with. |
| `Signer.spec.ts` | **8/9 pass** | The 1 failure is `signAsync()` with a genuine async JS `CallbackSigner` — expected, see "Key finding" above: koffi's signer callback must be synchronous, so a callback typed `Promise<Buffer>` can never work through it. Now fails with a clear, specific message pointing at this RFC instead of an opaque native COSE error. |
| `Builder.spec.ts` | **1/21 pass** | Looks dramatic but isn't 20 independent gaps: nearly all failures cascade from one shared `beforeEach` calling `updateManifestProperty()`, which — like `addAssertion()`, `addRedaction()`, `getManifestDefinition()`, and ingredient-without-an-asset — **has no equivalent in the plain c2pa-rs C API at all** (confirmed via `grep` against `c2pa.h`). These were bespoke Rust glue in `neon_builder.rs`, calling `c2pa::Builder` methods/fields directly (Neon isn't restricted to a C ABI) — not thin C-API wrappers. The underlying Rust methods/fields *do* exist upstream (`Builder::add_assertion`, `Builder::add_ingredient` without a stream, the public `Builder.definition` field for redactions/property updates/reading the definition back — all confirmed against `c2pa-rs/sdk/src/builder.rs`); they're just not exposed as C functions yet. **Closing this gap means a small, upstream PR to the public `c2pa_c_ffi` crate** (`github.com/contentauth/c2pa-rs/tree/main/c2pa_c_ffi`) — e.g. `c2pa_builder_add_assertion` following the existing `c2pa_builder_add_action` as a template. Confirmed this isn't c2pa-node-specific: `c2pa-python` (same upstream authors, also a ctypes/C-ABI binding over this exact `c2pa_c_ffi` layer) has the identical gap — its `Builder` class has no `add_assertion`/`add_redaction`/`get_manifest_definition`/`update_manifest_property` either. Every C-ABI language binding is blocked on the same upstream work; not attempted in this PoC. |
| `Trustmark.spec.ts` | 0/10 (skipped) | Stubbed per plan — needs the separate `trustmark` crate. |
| `IdentityAssertion.spec.ts` | 0/1 | Stubbed per plan — generic X.509 CAWG path. |

### Decision point: `Builder` convenience methods with no C API

**Not a Node-specific invention.** `addAssertion`, `addRedaction`,
`getManifestDefinition`, and `updateManifestProperty` map to genuine,
documented, first-class parts of `c2pa-rs`'s own public Rust API —
`Builder::add_assertion` (and `add_assertion_json`), and the public
`Builder.definition: ManifestDefinition` field for the rest. `add_assertion`
appears in the crate's own **top-level doc example** (`sdk/src/lib.rs`), is
exercised 76+ times across the SDK's own test suite, and dates to the
original V2 `Builder` design (`#437`), not a later add-on.

**But every consumer that crosses the C ABI lacks them, not just us.**
Consumers that link `c2pa-rs` directly in Rust — the crate itself, the
reference `c2patool` CLI, and our own outgoing Neon binding — get these for
free, because they're just normal Rust method/field access. Consumers that
must go through the C FFI layer (`c2pa_c_ffi`) don't, because nobody has
written the `extern "C"` wrapper: confirmed `c2pa-python` (ctypes over the
same `c2pa_c_ffi`) has the identical gap, and `c2patool` itself never needed
these methods because its whole interface is upfront JSON manifest files —
the same pattern `c2pa-python`'s docs use exclusively. This is a structural
property of every non-Rust binding today, not a temporary koffi shortcoming.

That leaves two real options:

**Option A — Drop these from Node's public API.**
- *Pros:* Brings this package's capability set in line with every other
  non-Rust C2PA binding that exists today (`c2pa-python`, and — for this
  specific interaction pattern — `c2patool`); removes a footgun where our
  own tests exercise capabilities no other language binding can reproduce;
  zero new work, no dependency on an external repo's timeline.
- *Cons:* Breaking change for any consumer relying on the incremental
  `Builder.withJson(x); builder.addAssertion(...)` pattern (still exercised
  by our own `Builder.spec.ts`); the redaction workflow tests also depend
  on `updateManifestProperty`/`getManifestDefinition`, so redaction support
  would need reworking too, unless upfront-JSON redactions cover real
  consumer usage (worth checking against actual usage, not just specs,
  before committing to this).

**Option B — Add the C API upstream, support them properly via koffi.**
- *Pros:* Restores full feature parity with the Neon binding; benefits
  every other C-ABI consumer too — `c2pa-python` would gain the same
  capability for free once merged; the Rust-side change is small
  (`c2pa_builder_add_action` in `c2pa_c_ffi/src/c_api.rs` is close to a
  working template for `add_assertion`).
- *Cons:* Depends on an external repo's review/release cadence
  (`contentauth/c2pa-rs`); until merged, this package either carries a
  patched fork (extra maintenance burden) or ships without these methods in
  the interim; someone has to actually write and shepherd the PR.

This is a decision for the team (and, since `c2pa-rs`/`c2pa_c_ffi` are
public, potentially for the wider C2PA developer community) — not something
this PoC resolves on its own.

### Pros / cons — for the team, and any other developer evaluating this

**Pros:**
- Real reduction in surface area: ~2754 lines of Rust and a whole native
  build/packaging pipeline gone, replaced by ~1000 lines of TS loading a
  prebuilt library.
- Read path and local/callback signing reach full parity with today's
  Neon binding (Reader/Settings/Signer specs pass in full or in the one
  expected/documented case).
- Errors are more specific by default (`ManifestNotFoundError` etc.) for
  synchronous calls.
- Puts this package on the same footing as every other non-Rust C2PA
  binding (`c2pa-python`, etc.) instead of a bespoke Rust-linked one — one
  fewer "how does Node do this differently" question for anyone working
  across the C2PA language bindings.

**Cons:**
- Real, non-trivial gap in `Builder`: `addAssertion`, `addRedaction`,
  `getManifestDefinition`, `updateManifestProperty`, and ingredient-without-
  asset have no C API today. This is the single biggest blocker to a real
  cutover — see "Decision point" above for the two real options (drop them,
  or land a small upstream PR) and their own pros/cons.
- Trustmark and the generic X.509 CAWG identity path aren't ported (not
  attempted here; both are plausible follow-ups, not blocked on anything
  fundamental).
- Async **JS callback** signers (arbitrary `Promise`-returning callbacks)
  are no longer supported — a breaking change; see "Key finding".
- Async failures lose specific error typing (thread-local last-error race
  in c2pa-rs, documented in `native/error.ts`).

## Appendix: spike sources

Scratch spikes (`spike*.js`) load `libc2pa_c` directly and were run
end-to-end against real local test fixtures.
