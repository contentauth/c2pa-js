# Preflighting a c2pa-rs release candidate

This branch is a compatibility probe, not a production dependency update.
The workspace selects `c2pa-rs` branch `0.92.0-rc`; `Cargo.lock` records the
tested revision `fb05f755f792d78ff15827ec6c14f1ea91b272c2`.
Do not publish packages or merge the Git dependency as a release.

## Reproduce the probe

1. Start a clean branch/worktree from current `origin/main`, not an older probe.
   Preserve unrelated local changes.
2. Read the [prerequisites](./project-contributions.md#prerequisites) and
   [WASM tooling requirements](../packages/c2pa-wasm/README.md#prerequisites).
   Match `wasm-bindgen-cli` to the resolved crate in `Cargo.lock`.
3. Use a Git dependency in the root workspace `Cargo.toml`, retaining the existing
   feature flags. Regenerate the lockfile with `cargo update -p c2pa`.
   Record the resolved commit, not just the moving branch name.
4. Install workspace dependencies with `pnpm install --frozen-lockfile`, then run:

   ```sh
   cargo check --locked --all-targets -p c2pa-node -p c2pa-types
   cargo check --locked --all-targets -p c2pa-wasm --target wasm32-unknown-unknown
   ```

5. Regenerate types through `pnpm exec nx build c2pa-types`. Update the
   hand-maintained export facade when upstream schema names change; do not edit
   generated schemas or types. Check consumers in both Node and browser packages.
6. Install browser test prerequisites from `packages/c2pa-web` with
   `pnpm exec playwright install`. For WASM tests, put a ChromeDriver matching the
   installed Chrome version on `PATH`; an incompatible cached driver is a tooling
   failure, not a compatibility result.
7. Rebuild and test all library consumers, without reusing earlier build results:

   ```sh
   NX_SKIP_NX_CACHE=true pnpm ci:check
   cargo +nightly fmt --all -- --check
   ```

   Build the local native addon; a downloaded stable binary does not test the
   candidate Rust code. Use the normal WASM pipeline so its integrity metadata
   matches its binary. Preserve network access needed by native dependencies and
   provision Trustmark model fixtures before interpreting inference failures.

8. Add regression coverage for observed API or behavior changes. Record exact
   commands, passed/skipped counts, missing prerequisites and unresolved failures
   in the draft preflight PR. A compile check is not a runtime test.

## Compatibility changes in this candidate

- The Node identity signer forwards the caller's `Context` to the new
  `AsyncSigner::send_timestamp_request` signature. WASM uses upstream's default
  implementation and needs no matching override.
- Upstream removed `RegionOfInterest.role` and its generated `Role` enum.
  The public `Role` export retains the old union as a deprecated compatibility
  type; it does not restore the removed Rust field.
- Created and gathered actions may occupy separate assertions. Consumers must
  not assume the first actions assertion contains every action.
- JSON byte strings in assertions use the explicit `b64'…'` representation;
  decoded CAWG signer-payload hashes are byte arrays.
- Unknown CAWG revocation status is omitted, not reported as `true`.
- The legacy CAWG test certificate lacks the policy required by the RC's
  stricter X.509 trust model. Even with its anchor configured, the manifest
  signature can be trusted while the identity credential is untrusted and the
  overall state is `Valid`, not `Trusted`. Tests retain this distinction rather
  than bypassing certificate policy checks.

## Downstream validation and rollback

Build and pack all five libraries from the same immutable c2pa-js commit.
Downstream probes must replace direct and transitive C2PA dependencies together,
verify native/WASM/worker artifacts, and prevent an install hook from replacing a
candidate addon with a stable binary sharing its package version.
Keep probes opt-in and prevent candidate publication.

Discarding this isolated probe branch restores the stable dependency path; no
data migration is involved. Once upstream publishes, make a separate registry
dependency update, regenerate locks, rebuild consumers and repeat validation.

## Candidates for a future skill or script

- Resolve the Rust branch to a full commit and validate the locked source.
- Derive toolchain requirements from the selected source and lockfile.
- Run native/WASM checks, regenerate types, and validate every library consumer.
- Distinguish environment prerequisites from reproducible compatibility failures.
- Capture immutable revisions, artifact hashes and actual test outcomes.
- Pack a coherent downstream candidate and provide explicit activation/rollback
  and publication guards, without enabling source probes in ordinary CI.
