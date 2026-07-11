# RFC: Rebase c2pa-node on c2pa-rs's public C API via koffi, with Adobe signing as an additive layer

**Status:** Draft / for discussion — now backed by a working PoC (see below)
**Author:** (spike + analysis)
**Date:** 2026-07-09 (revised 2026-07-11 to correct the public/Adobe split — see below)
**Target:** `packages/c2pa-node` in the `c2pa-js` monorepo

## This branch (`ale/koffi-poc`)

This branch is the working-code companion to this RFC: it actually tears out
the Neon binding in `packages/c2pa-node` and replaces it with the koffi
approach described below, so `git diff main` here **is** the before/after
comparison. See "PoC results" near the end of this document for what
works, what doesn't (with concrete spec pass/fail numbers), and a pros/cons
summary. Base for the rewrite: a colleague's (gpeacock) separate koffi
exploration at `~/Repos/c2pa-koffi`, extended with this session's spikes
(the CAWG signer flow, the `char**` marshal fix) and adapted to preserve
this package's existing public API wherever the C API allows it.

## Summary

Replace the current Neon (N-API) binding with a [koffi](https://koffi.dev) FFI
binding, in two layers:

1. **Core** (`Reader`/`Builder`/`Signer`/`Settings`) moves from Neon to koffi
   over **c2pa-rs's own public, open source C API** (`c2pa_c_ffi`, the crate
   that produces `c2pa.h` and the `libc2pa_c` dylib). This is what every
   consumer of `@contentauth/c2pa-node` gets, and — because this package is
   open source — it can only depend on the public `contentauth/c2pa-rs`
   repo, never on Adobe's private `adobe_api`.
2. **An additive, optional Adobe extension** (`AdobeSigner`: claims-signer
   HTTP signing + CAWG-verified-identity signing) moves that business logic
   out of TypeScript (currently duplicated in the separate `adobe-js-sdk`
   repo's `@cai/adobe-node` wrapper) and into the shared Rust `adobe_api`
   crate, reached via the same koffi mechanism but a different,
   Adobe-controlled native library (`libadobe_c2pa`). See "Two-layer
   architecture" below.

The Neon→koffi change is a *consequence* for the core; for the Adobe layer,
the actual goal is **one Rust core, thin language bindings** for Adobe's own
business logic — today `adobe-js-sdk`'s `@cai/adobe-node` wrapper
reimplements in TypeScript what `adobe_api` already implements in Rust, and
what Adobe's own internal `sdk-python` (distinct from the public
`c2pa-python` project), `sdk-c`, and the C++/WASM SDKs already consume
through the same Adobe C API.

## Two-layer architecture

| | Core (this package's baseline) | Adobe extension (additive) |
|---|---|---|
| Depends on | `contentauth/c2pa-rs`'s `c2pa_c_ffi` crate (public, MIT/Apache-2.0) | Adobe's private `adobe_api` repo |
| Native library | `libc2pa_c` | `libadobe_c2pa` (a superset — statically links `c2pa-rs`, so it also exports every `libc2pa_c` symbol) |
| Covers | `Reader`, `Builder` (see "Decision point" for known gaps), `LocalSigner`, `CallbackSigner`, `Settings` | `AdobeSigner` (claims-signer HTTP signing, CAWG-verified-identity signing) |
| Required for | Every consumer of `@contentauth/c2pa-node` | Only consumers who explicitly use `AdobeSigner` |
| On `ale/koffi-poc` | `js-src/native/{lib,error,stream,context,signer}.ts` | `js-src/native/adobeContext.ts`, `js-src/AdobeSigner.ts` |

In the PoC, both layers happen to load from the *same* dylib
(`libadobe_c2pa`, since it's a strict superset) for convenience — that's a
packaging choice, not an architectural requirement. `native/lib.ts` already
degrades gracefully: it tries `libadobe_c2pa` first, falls back to plain
`libc2pa_c`, and only throws — from `AdobeSigner`/`native/adobeContext.ts`
specifically, via `isAdobeApiAvailable()` — if code that actually needs the
Adobe layer runs against a library that doesn't have it. A real release
still needs to decide packaging: ship `libadobe_c2pa` as the default
(simpler for consumers, but means every install of this open source package
pulls in an Adobe-built binary), or ship plain `libc2pa_c` by default with
`AdobeSigner` requiring an explicit `C2PA_LIBRARY_PATH` override to the
Adobe build (cleaner separation, more packaging complexity for anyone who
wants `AdobeSigner`) — see "Open questions".

## Motivation

- **Duplicated business logic.** `createAdobeSigner.ts` (claims-signer HTTP),
  `cawgSigner.ts`, `ManifestService.ts`, compliance-builder, profile/identity
  helpers (all in `adobe-js-sdk`) exist as parallel Rust implementations in
  `adobe_api`. Two copies drift.
- **Bespoke binding glue.** This package carries ~10 `neon_*.rs` files
  (`packages/c2pa-node/src/`) and is coupled to N-API version churn (`.node` is
  ABI-tied to the Node runtime).
- **First-party C APIs already exist for both layers.** `c2pa.h` (public,
  from `c2pa-rs`'s `c2pa_c_ffi` crate) is the surface `c2pa-python`,
  `c2patool`, and the C++/WASM SDKs already bind to for core functionality.
  `adobe_c2pa.h` (Adobe-private, from `adobe_api/sdk-c`) is the equivalent
  for Adobe's signing/identity business logic, consumed by `sdk-python`
  (Adobe's internal Python SDK, distinct from the public `c2pa-python`),
  `sdk-c`, and the C++/WASM SDKs that need Adobe features. Neither this
  package's core nor its Adobe extension would be inventing a new binding
  strategy — both already have a working multi-consumer precedent.

## Evidence — spikes (all run against real `libadobe_c2pa.dylib`, koffi 3.1.0, Node 22)

Spikes 1–4 exercise plain `c2pa-rs`/`c2pa_c_ffi` functionality (core layer);
5–6 exercise the Adobe-specific layer. All were run against
`libadobe_c2pa.dylib` for convenience (it's a superset, see "Two-layer
architecture" above) — 1–4 would work identically against plain `libc2pa_c`.

| # | Exercised | Result |
|---|---|---|
| 1 | `koffi.load` + `c2pa_version()` | ✅ string marshaled |
| 2 | Builder + local `signer_from_info` + `data_hashed_placeholder` + `sign_data_hashed_embeddable` (asset=NULL); byte out-params; koffi `.async()` off-thread | ✅ signed manifest, **zero reverse callbacks**, off-thread call OK |
| 3 | JS `SignerCallback` invoked by native, main thread and worker thread | ✅ no crash; koffi marshals cross-thread — **but runs the callback on the main thread and blocks the event loop; callback must be synchronous** |
| 4 | Full streaming sign of a real JPEG via JS `Read/Seek/Write` callbacks + readback | ✅ valid signed asset, `validation_state: Valid` |
| 5 | `adobe_context_create` with a malformed token | ✅ returned `AuthTokenFormatError`, no crash |
| 6 | **Real STAGE sign**: `adobe_context_create` + `adobe_context_create_signer` + `c2pa_builder_sign` via `.async()` | ✅ **issuer "Adobe Inc.", validation_state Valid**; `get_box_size` and `manifest/sign/v2` executed **in Rust**; **17 main-thread heartbeats during the 358ms network sign** (loop stayed responsive); **no JS signing callback** |

The decisive result is Spike 6: the claims-signer network round-trip happens
inside Rust, the whole sign runs off the libuv threadpool via koffi `.async()`,
and the event loop stays free — with no JS callback anywhere.

## Key finding: the async-signer blocker is resolved

The current callback signer is typed `(data: Buffer) => Promise<Buffer>`
(`js-src/types.d.ts`'s `CallbackSignerInterface`, formerly also
`js-src/index.node.d.ts` before this branch removed the Neon binding) and
`createAdobeSigner.ts` (in `adobe-js-sdk`) performs the claims-signer HTTP
call *inside that async JS callback*. koffi cannot replicate this: its
callbacks are synchronous and run on the main thread (Spike 3).

`adobe_context_create_signer` sidesteps it entirely — the signer is
`AdobeAsyncSigner` (`adobe_api/src/signers.rs`) wrapping a `ClaimsSigner`
(`claims_signer_client`, `reqwest` → `cai-signer*.adobe.io`). JS supplies an IMS
token up front; **Rust does the network signing.** From JS it is one blocking C
call run off-thread. This is a **breaking API change** (async JS callback
signers go away) that we accept in exchange for a simpler, shared implementation.

## Proposed architecture

**Core** — `c2pa-node`'s own koffi binding over the public C API:

```
c2pa-node core (TS)                 c2pa-rs's c2pa_c_ffi crate (public, via libc2pa_c)
────────────────────                ──────────────────────────────────────────────────
koffi binding + types                c2pa Builder / Reader / streams
memory/lifetime discipline           LocalSigner / CallbackSigner (sync only — see below)
                                      Settings
```

**Adobe extension** — additive, only loaded/used if a consumer actually
imports `AdobeSigner`:

```
c2pa-node (TS)                      shared Rust (adobe_api, via libadobe_c2pa C API)
───────────────────────────         ───────────────────────────────────────────────
IMS token acquisition   ─token──▶   adobe_context_create(auth_token, api_key)
thin koffi binding + types          adobe_context_create_signer            (claims-signer HTTP)
memory/lifetime discipline          adobe_context_create_signer_with_identities (CAWG)
                                     adobe_context_create_uploader          (manifest upload)
                                     adobe_context_create_ai_compliance_workflow
                                     profile client / identities / DNI-DNT / trust settings
```

### What moves to Rust (Adobe extension only)
`createAdobeSigner`, `cawgSigner`, `ManifestService`, compliance builder,
profile/identity/AI-model helpers, DNI/DNT checks. Core `Builder`/`Reader`
functionality was never in `adobe-js-sdk`'s TypeScript to begin with — it
already lives in `c2pa-rs`, and the koffi rebase for it means reaching the
existing public C API instead of a Rust addon, not moving new logic into
Rust for the first time.

### What stays in JS
IMS token acquisition (Rust explicitly does **not** do token exchange), the
koffi binding + public TS types, and buffer/pointer lifetime management.

### Auth boundary
`adobe_context_create(auth_token, api_key)` takes an IMS bearer token;
`adobe_context_set_ims_token` refreshes it for long-lived processes.

## Async / threading model

- Rust-side signers (Adobe service, local key) → single blocking C call run via
  koffi `.async()` on the libuv threadpool. Event loop stays free (Spike 6).
- Stream callbacks and any JS signer callback are marshaled to the main thread
  by koffi and run synchronously there (Spike 3/4) — fine for stream I/O and
  synchronous signers; **not** usable for async JS signers.
- Throughput is bounded by `UV_THREADPOOL_SIZE` (default 4); tune for
  server/batch signing.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Manual memory management (koffi `c2pa_free`, pointer lifetimes) | Thin RAII-style TS wrappers; for the core layer, the public `c2pa-python` (ctypes) is a working reference against the same `c2pa_c_ffi` API; for the Adobe layer, Adobe's internal `sdk-python` is the equivalent reference against `adobe_c2pa.h` |
| Packaging the native library | **Core:** ship/fetch `libc2pa_c` per platform — `c2pa-rs` already publishes prebuilt binaries (same pattern the `c2pa-koffi` prototype's `fetch:c2pa` script uses), comparable packaging burden to today's prebuilt `.node`. **Adobe extension:** `libadobe_c2pa` is a separate, Adobe-built artifact required only by consumers who use `AdobeSigner` — see "Two-layer architecture" for the open question of whether it ships by default or via opt-in `C2PA_LIBRARY_PATH` override |
| Reader validation needs trust settings | `load_trust_settings_for_current_thread` (network load) before read |
| Loss of BYO **async** JS signer | Adobe service + local-key signers cover real cases; revisit if a real consumer needs it |
| Two Rust crates now in the dependency graph (`c2pa-rs`'s `c2pa_c_ffi` + Adobe's `adobe_api`) | `c2pa_c_ffi` is required for every consumer and is public/first-party to the C2PA project; `adobe_api` is only in the critical path for consumers of `AdobeSigner`, and is Adobe-private — this asymmetry is why the two layers are packaged/versioned separately rather than as one dylib in the real release (unlike this PoC's convenience shortcut) |

## Open questions / follow-up spikes

1. **CAWG parity — fully verified end-to-end (2026-07-10).** The full
   CAWG/identity surface binds cleanly via koffi (`create_ims_user_client`,
   `get_connected_identities`, `get_identities`, `create_signer_with_options`,
   plus the `adobe_identity_*` accessors). **Resolution of the earlier
   401 blocker:** it was never a token/provisioning problem — it was passing
   `api_key=cai-test-client` while the token's own `client_id` claim was
   `cai-cr-web` (IMS validates the token's `client_id`, not the `api_key` arg
   passed to `adobe_context_create`). Using `api_key="cai-cr-web"` to match a
   `cai-cr-web` token — exactly what `adobe_api/tests/cloud_upload.rs`'s
   existing (Rust-only) `test_cloud_manifest_sign_upload_with_cawg` integration
   test already does — worked immediately: `get_connected_identities` and
   `get_identities` both returned `Ok` in ~100-200ms with a real linked Behance
   identity (`account_type: "behance"`, username `austinle1`).
   Feeding that identity's type string into
   `adobe_context_create_signer_with_options` (`identities: ["behance"]`)
   produced a working signer (`get_box_size` round-trip to the claims-signer
   service, ~230-310ms), which then signed a real local JPEG
   (`packages/c2pa-node/tests/fixtures/A.jpg`) via `c2pa_builder_sign` over
   koffi-marshaled `C2paStream` Read/Seek/Write/Flush callbacks (embedded
   manifest, no remote URL/upload — sign-only by request). Reading the signed
   asset back confirmed `validation_state: "Valid"` and a `cawg.identity`
   assertion containing the real verified Behance credential
   (`issuer: "did:web:connected-identities.identity-stage.adobe.com"`,
   `verifiedIdentities[0]` = the Behance account). This closes the last open
   item from the original CAWG spike — no remaining unknowns in this area.

   One rough edge found along the way: `c2pa_builder_sign`'s
   `manifest_bytes_ptr` argument (documented as "optional, can be NULL")
   rejects a bare `null` — pass an actual `koffi.out(koffi.pointer(...))` slot
   instead, even if you don't care about the returned manifest bytes.

   **`char**` marshal — resolved (2026-07-10).** The crash reported earlier is
   fixed: declare the koffi struct field as `'str *'` and pass a plain JS array
   of strings — koffi handles the `const char *const *` + `usize` length pair
   (`SignerOptions.identities`/`identities_count` in
   `sdk-c/src/adobe_context.rs`) correctly. Verified with a standalone Rust
   harness mirroring `SignerOptions` byte-for-byte (no network, no `adobe_api`
   dependency): 2000 alloc/marshal/free iterations, a 500-string array, and
   unicode/empty-string entries all round-tripped with no crash. Root cause of
   the original crash was almost certainly the koffi type declaration used, not
   a fundamental limitation.

   **Separate footgun found while testing this (not a koffi issue):**
   `adobe_context_create_signer_with_options`'s `check_null_ptr!` macro
   (`sdk-c/src/ffi_utils.rs`) only checks that the **outer** `AdobeContext**`
   pointer is non-null; it does not check the pointee. `create_signer_from_options`
   then unconditionally dereferences it (`let context = &**c_context_ptr;`).
   Calling this (or the sibling `_with_identities`/`_with_connected_identities`
   functions, same pattern) with a context slot holding `null` — e.g. after
   `adobe_context_create` fails — segfaults immediately. This is UB per the
   function's own doc comment ("ensure `c_context_ptr` is pointing to a valid
   AdobeContext"), not a marshal defect, but it's a real risk for the TS
   wrapper: **must never call signer/uploader-creation functions unless the
   prior `adobe_context_create` call returned `Ok` with a non-null context**,
   the same discipline the Neon wrapper presumably already enforces.
2. **Streaming vs. data-hashed embeddable** for asset I/O (avoid per-chunk
   main-thread hops on large assets).
3. **Token refresh lifecycle** for long-lived signing services.
4. **Build/release integration with nx** — this branch already removes
   `@neon-rs/cli`/`cargo-cp-artifact` and the old prebuilt-`.node` pipeline
   entirely (see "PoC results"), but real packaging for **both** native
   libraries still needs a decision: how the core `libc2pa_c` gets
   fetched/shipped by default (following `c2pa-rs`'s own prebuilt-binary
   releases, similar to the `c2pa-koffi` prototype's `fetch:c2pa` script),
   and whether/how the Adobe extension's `libadobe_c2pa` is offered — bundled
   by default (simplest for consumers, but ships an Adobe-built binary to
   every installer of this open source package) or strictly opt-in via
   `C2PA_LIBRARY_PATH` (cleaner separation, more setup for anyone who wants
   `AdobeSigner`). See "Two-layer architecture" above.

## Rollout

1. ~~Spike CAWG + identity parity (open question 1).~~ **Done 2026-07-10** —
   see above.
2. ~~Prototype koffi binding for the read path + local-key signing behind a
   flag.~~ **Done 2026-07-10, further than planned** — done as a real
   in-place replacement on `ale/koffi-poc` rather than behind a flag,
   covering read, local-key signing, callback signing, and the Adobe
   service/CAWG signer. See "PoC results" below.
3. ~~Port the Adobe service signer~~ **Done 2026-07-10** (`AdobeSigner.ts`,
   see below) — manifest upload not attempted (out of scope for this PoC;
   sign-only, per this session's ground rules).
4. Deprecate the async JS callback signer API; publish migration notes.
5. Cut over `packages/c2pa-node` (and the `adobe-js-sdk` consumer) to the koffi
   binding; delete superseded TS + the `neon_*.rs` glue.

## PoC results (2026-07-10, branch `ale/koffi-poc`)

### What changed

- Deleted `packages/c2pa-node/src/*.rs`, `Cargo.toml` (~2754 lines of Neon
  glue) and all Neon-specific build tooling (`@neon-rs/cli`,
  `cargo-cp-artifact`, `scripts/postinstall.cjs`, the `build:rust*` scripts).
  The package now has **zero Rust code of its own** — it loads a prebuilt
  `libadobe_c2pa`/`libc2pa_c` at runtime via koffi.
- Rewrote `Reader.ts`, `Builder.ts`, `Signer.ts` against a new
  `js-src/native/` koffi layer (`lib.ts`, `error.ts`, `stream.ts`,
  `context.ts`, `signer.ts`, `adobeContext.ts`), preserving the existing
  public class/method signatures wherever the plain c2pa-rs C API supports
  it, so the pre-existing `.spec.ts` suite could run against it unmodified.
- Added `AdobeSigner.ts` — new capability, not present in the Neon binding:
  Adobe claims-signer + CAWG-identity signing, implemented in `adobe_api`
  Rust and reached via `native/adobeContext.ts`.
- `Settings.ts` and `assertions.ts` needed **zero changes** — both were
  already pure TypeScript with no native calls.
- `Trustmark.ts` and `IdentityAssertion.ts` (the generic X.509/CAWG identity
  path, distinct from `AdobeSigner`) are stubbed with clear
  "not implemented, see RFC.md" throws rather than reimplemented.

### Spec suite results (existing tests, run unmodified)

37 passed, 22 failed, 10 skipped (69 total):

| File | Result | Why |
|---|---|---|
| `Reader.spec.ts` | **11/11 pass** | Full parity, including CAWG assertion reading and the `cloud.jpg` remote-manifest case. |
| `Settings.spec.ts` | **17/17 pass** | No native calls to begin with. |
| `Signer.spec.ts` | **8/9 pass** | The 1 failure is `signAsync()` with a genuine async JS `CallbackSigner` — expected, see "Key finding" above: koffi's signer callback must be synchronous, so a callback typed `Promise<Buffer>` can never work through it. Now fails with a clear, specific message pointing at this RFC instead of an opaque native COSE error. |
| `Builder.spec.ts` | **1/21 pass** | Looks dramatic but isn't 20 independent gaps: nearly all failures cascade from one shared `beforeEach` calling `updateManifestProperty()`, which — like `addAssertion()`, `addRedaction()`, `getManifestDefinition()`, and ingredient-without-an-asset — **has no equivalent in the plain c2pa-rs C API at all** (confirmed via `grep` against `c2pa.h`). These were bespoke Rust glue in `neon_builder.rs`, calling `c2pa::Builder` methods/fields directly (Neon isn't restricted to a C ABI) — not thin C-API wrappers. The underlying Rust methods/fields *do* exist upstream (`Builder::add_assertion`, `Builder::add_ingredient` without a stream, the public `Builder.definition` field for redactions/property updates/reading the definition back — all confirmed against `c2pa-rs/sdk/src/builder.rs`); they're just not exposed as C functions yet. **Closing this gap means a small, upstream PR to the public `c2pa_c_ffi` crate** (`github.com/contentauth/c2pa-rs/tree/main/c2pa_c_ffi`) — e.g. `c2pa_builder_add_assertion` following the existing `c2pa_builder_add_action` as a template — not a private/Adobe-only extension: this package is open source, so its core Builder functionality can't depend on Adobe's internal `adobe_api` repo the way `AdobeSigner.ts` (explicitly, visibly Adobe-specific) can. Confirmed this isn't c2pa-node-specific: `c2pa-python` (same upstream authors, also a ctypes/C-ABI binding over this exact `c2pa_c_ffi` layer) has the identical gap — its `Builder` class has no `add_assertion`/`add_redaction`/`get_manifest_definition`/`update_manifest_property` either. Every C-ABI language binding is blocked on the same upstream work; not attempted in this PoC. |
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

That leaves two real options — not a "fix it ourselves in this package"
option, since (per the correction earlier this session) routing it through
Adobe's private `adobe_api` is off the table for this open source package's
core functionality:

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
- *Pros:* Restores full feature parity with the Neon binding, with no
  private dependency; benefits every other C-ABI consumer too —
  `c2pa-python` would gain the same capability for free once merged; the
  Rust-side change is small (`c2pa_builder_add_action` in
  `c2pa_c_ffi/src/c_api.rs` is close to a working template for
  `add_assertion`).
- *Cons:* Depends on an external repo's review/release cadence
  (`contentauth/c2pa-rs`); until merged, this package either carries a
  patched fork (extra maintenance burden) or ships without these methods in
  the interim; someone has to actually write and shepherd the PR.

This is a decision for the team (and, since `c2pa-rs`/`c2pa_c_ffi` are
public, potentially for the wider C2PA developer community) — not something
this PoC resolves on its own.

### Live Adobe CAWG demo (real stage IMS, this session)

Ran `AdobeSigner` end-to-end through the actual rewritten package (not a
throwaway spike): fetched a real connected identity (Behance), created a
signer via `adobe_context_create_signer_with_options`, signed
`tests/fixtures/A.jpg` via `Builder.signAsync()` — dispatched through
koffi's `.async()` so the network round-trip runs off the main thread —
and read the result back:

```
signAsync took 538ms, 49 main-thread heartbeats during the sign
validation_state: Valid
CAWG assertion present: true
```

This is the concrete, working proof of the RFC's central claim: the async
Adobe signer works, off-thread, inside the real rewritten package.

### Pros / cons — for the team, and any other developer evaluating this

**Pros:**
- Real reduction in surface area: ~2754 lines of Rust and a whole native
  build/packaging pipeline gone, replaced by ~1000 lines of TS loading a
  prebuilt library.
- Read path and local/callback signing reach full parity with today's
  Neon binding (Reader/Settings/Signer specs pass in full or in the one
  expected/documented case).
- The Adobe extension — the harder half of this RFC, and the reason the
  async-signer question mattered at all — works, end-to-end, off-thread,
  against real stage IMS.
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
  or land a small upstream PR) and their own pros/cons; there is no third
  option where this package fixes it alone, since routing it through
  Adobe's private `adobe_api` would tie this open source package's core
  functionality to a non-public dependency.
- Trustmark and the generic X.509 CAWG identity path aren't ported (not
  attempted here; both are plausible follow-ups, not blocked on anything
  fundamental).
- Async **JS callback** signers (arbitrary `Promise`-returning callbacks,
  as opposed to Adobe's Rust-side network signer) are no longer supported —
  a breaking change, accepted deliberately per this RFC.
- Async failures lose specific error typing (thread-local last-error race
  in c2pa-rs, documented in `native/error.ts`).

## Appendix: spike sources

Scratch spikes (`spike*.js`) load `libadobe_c2pa.dylib` directly and were run
end-to-end, including a live stage sign producing an "Adobe Inc."-signed,
`validation_state: Valid` asset.

**2026-07-10 session:** `adobe_api`'s `target/release/libadobe_c2pa.dylib` was
stale (built 2026-03-24, predating `adobe_context_create_signer_with_options`
in the current header) — rebuilt via `cargo build --release -p adobe_c2pa`
before re-running spikes; confirm freshness (`nm -gU ... | grep <symbol>`)
before trusting old spike results against this dylib. The `char**` marshal fix
and the null-context-pointee footgun (above) were found using a standalone
Rust harness (`marshal_harness`, mirroring `SignerOptions` with no `adobe_api`
dependency) plus koffi 3.1.1 against Node 22, both in scratch/session-temp
locations, not committed anywhere.
