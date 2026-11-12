# Migrating c2pa-rs into c2pa-js

Use this runbook for an upstream branch/tag preflight, a final crate upgrade, or
verification of the resulting published JavaScript packages. It is a workflow,
not a record of one release. Derive versions, features and tools from the selected
source; do not copy pins or compatibility decisions from an earlier probe.

Read the [contribution guide](./project-contributions.md),
[contributor rules](../CONTRIBUTING.md), and the affected package READMEs:
[Node](../packages/c2pa-node/README.md),
[WASM](../packages/c2pa-wasm/README.md),
[web](../packages/c2pa-web/README.md),
[types](../packages/c2pa-types/README.md), and
[utilities](../packages/c2pa-utilities/README.md).

## 1. Establish scope and provenance

Inspect the current branch, dirty files, worktrees and latest upstream main before
editing. Preserve unrelated work. For example, from the repository root:

```sh
git status --short
git branch --show-current
git worktree list
git fetch origin main
git log -1 --format=fuller origin/main
```

Create a fresh, isolated branch/worktree from that main revision, not an old
probe. Record its base SHA and the starting dependency/lockfile state. Keep
scratch reports and downstream probes outside the final upgrade diff, never in
system temporary directories.

Track each stage separately:

| Stage                 | Required identity                                                                         | Completion gate                                                    |
| --------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Upstream branch probe | Repository URL, branch and full resolved Git SHA                                          | Compatibility evidence only; no release dependency                 |
| Upstream tag probe    | Tag and full resolved commit SHA                                                          | Re-resolve and retest; a tag name alone is not immutable evidence  |
| Final registry crate  | Exact crate version, registry source and lockfile checksum                                | Fresh registry-source build and regression tests                   |
| Published JavaScript  | c2pa-js commit, exact package versions, tarball integrity and native/WASM artifact hashes | Clean-install runtime validation of the actual published artifacts |

For a Git probe, select the source in the root workspace `Cargo.toml` and update
`Cargo.lock` with Cargo. Record and preferably pin the resolved full revision;
verify the locked source matches it. Preserve the existing `features` and
`default-features` setting unless a deliberate, reviewed change is necessary.
Inspect upstream release notes and the selected source's manifests, not moving
main, for API changes and minimum supported Rust version (MSRV).

Use `cargo metadata --locked --format-version 1` to verify the resolved package
source and manifest location. Compare upstream requirements with the workspace
MSRV and transitive dependency requirements. A successful build on a newer Rust
compiler does not prove the declared minimum still works.

Once the final crate is available, replace Git/path/patch overrides with the
intended registry dependency, regenerate the lockfile and verify its version,
source and checksum. Do not assume the final crate is identical to a tested tag,
even when the version label matches. Repeat the affected validation gates.

## 2. Trace the binding and consumer changes

Review the upstream delta against the starting SDK, then follow each affected
API through its actual adapters and consumers:

| Surface           | Review points                                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| Native            | `packages/c2pa-node/src/`, native registrations, `js-src/` wrappers and public exports                           |
| WASM/browser      | `packages/c2pa-wasm/src/`, generated bindings, web worker messages, main and inline entry points                 |
| Schema/types      | `packages/c2pa-types/src/`, `build.ts`, generated schemas/types and the hand-maintained `index.ts` export facade |
| Shared/downstream | Utilities, imports and call sites in both Node and web, plus affected tools and external SDK consumers           |

Regenerate types with `pnpm exec nx build c2pa-types`; edit the schema sources or
generator when needed, not generated output. Remove stale facade exports and
consumer imports when upstream removes a type. **Do not invent compatibility
aliases, retained unions or replacement fields for removed upstream APIs without
explicit authorization.** An alias cannot restore removed runtime behavior.
Document intentional public API changes and include affected consumer tests.

Preserve validation, error propagation, failure and cleanup contracts. Keep
Node's native error conversion distinct from WASM reader errors, including the
`JsString` handling needed by Firefox workers. Check `Context` propagation,
settings resolution, signer callbacks and resource disposal on success and
rejection; do not convert failures into successful defaults.

Review changed snapshots as evidence, not as instructions to accept new output:

- Test action semantics across all applicable actions assertions. Created and
  gathered actions can be split; aggregate them rather than checking only the
  first assertion or relying on assertion order.
- Test serialization and deserialization, including byte/string encodings,
  signer-payload hashes and optional fields. Preserve the distinction between an
  absent/unknown status and a boolean result; do not manufacture a positive
  revocation result for an omitted field.
- Test manifest-signature trust and identity-credential trust separately.
  Configuring an anchor does not bypass certificate-policy requirements or
  guarantee an overall trusted state. Explain changed expectations from upstream
  behavior; never weaken production trust policy to make an old fixture pass.

## 3. Prepare reproducible builds

Use the [current prerequisites](./project-contributions.md#prerequisites) and
[WASM requirements](../packages/c2pa-wasm/README.md#prerequisites). Record exact
Node, pnpm, Rust, nightly rustfmt, wasm-pack and wasm-bindgen-cli versions.
Use `packageManager` for pnpm; derive Rust requirements from the selected source.
Match **wasm-bindgen-cli exactly to the resolved wasm-bindgen crate in
`Cargo.lock`**, not a remembered CLI version. Keep manifests, lockfiles, setup
documentation and CI installation aligned if requirements change.

In the fresh worktree, install with `pnpm install --frozen-lockfile`. Do not copy
`node_modules`, native addons, WASM `pkg/`, generated types or build outputs from
another checkout. Shared dependency stores are acceptable only when resolved
versions and integrity checks still match. Use an isolated Rust target directory
and bypass Nx task caches for the final evidence run; disabling Nx caching does
not invalidate Cargo's incremental output. Build caches must distinguish source,
features, toolchain, target and native platform/libc baseline.

Install Playwright browsers by running `pnpm exec playwright install` from
`packages/c2pa-web`. Provision the headless Chrome/ChromeDriver combination used
by WASM tests; check executable versions and PATH, including stale cached drivers.
Provision writable Trustmark model caches and required network access for native
dependencies and fixtures. A missing model, blocked download or mismatched driver
is a prerequisite failure, not proof of SDK incompatibility or a passing test.

Build the local native addon through the Node package's build pipeline. A
downloaded stable addon does not test candidate Rust. Build WASM through its Nx
pipeline so JavaScript glue, binary and generated `WASM_SRI` agree; never replace
the binary or integrity value independently.

## 4. Validate compilation, types and runtime separately

Start with the smallest checks that expose the affected Rust boundaries:

```sh
cargo check --locked --all-targets -p c2pa-node -p c2pa-types
cargo check --locked --all-targets -p c2pa-wasm --target wasm32-unknown-unknown
pnpm exec nx build c2pa-types
```

Confirm consumer targets with `pnpm exec nx show project <project>`. Run explicit
TypeScript checks for affected consumers, including the public export facade:
for example, `pnpm exec nx typecheck c2pa-web` and
`pnpm exec nx typecheck @contentauth/c2pa-utilities`. Node's `build:ts` also invokes
TypeScript. A TypeScript check cannot establish native/WASM runtime compatibility,
and `cargo check` cannot establish JavaScript type or runtime correctness.

Run nearby regressions, then the cross-package gate for an SDK migration:

```sh
NX_SKIP_NX_CACHE=true pnpm ci:check
cargo +nightly fmt --all -- --check
```

`ci:check` runs library lint, test and build targets; do not assume it also runs
every explicit typecheck target. Exercise real native and WASM bindings, browser
workers, both web entry points, reading, signing and affected error/cleanup paths.
Do not substitute mocks or successful compilation for these runtime results.

Record each command, source revision, platform/toolchain, pass/fail/skipped counts,
skip reasons and unresolved failures. Report tests that were not run separately
from runner-reported skips. Never turn a prerequisite failure or skipped suite
into a pass, or infer counts from an earlier run.

## 5. Pack and repin downstream probes

Build and pack all five libraries from one immutable c2pa-js commit. Record the
tarball paths and hashes. In a separate fresh downstream worktree, replace direct
and transitive C2PA dependencies together and inspect the resulting lockfile and
dependency graph; a local top-level package can otherwise coexist with stale
registry copies.

Verify which native binary is actually loaded. Prevent install hooks from
replacing a candidate addon with a stable download sharing its package version.
If using the documented `C2PA_LIBRARY_PATH` override, point it at the exact
candidate addon and record its hash; remove the override when testing published
installation. Verify WASM, worker and inline assets also come from the candidate,
not a bundler cache or older hosted URL. Run downstream typechecks and real
read/sign/error workflows, not just package resolution.

Keep activation opt-in and rollback explicit: restore the prior package
specifications and lockfile, unset overrides and reinstall/rebuild. After
merging current main into the migration branch, changing the upstream branch/tag,
or fixing an adapter, rebuild and repack, then **repin downstream to the new
immutable commit/artifacts and rerun affected checks**. Old downstream evidence
does not validate the updated candidate.

## 6. Verify publication and native availability

Publishing or deploying is not authorized by this runbook. Do not publish,
republish, replace release assets or deploy downstream services without explicit
authorization. Keep source probes out of normal publication and deployment paths.

For an authorized release, check availability independently:

- Public registry metadata names the intended exact versions and tarball
  integrity; downloading/unpacking those tarballs confirms declarations, exports
  and required runtime assets. Metadata alone is not an installation test.
- Native GitHub release assets exist for every supported target with the expected
  names and hashes. npm publication can finish before native binaries are ready.
- The real consumer registry/proxy, CDN and asset URLs serve those versions and
  bytes; public availability does not prove a corporate proxy cache is current.
- Linux release builds use the oldest supported glibc **build baseline** from the
  current release workflow, not an arbitrary newest runner or cached newer build.
  Verify produced symbol requirements and load/run on the supported runtime
  baseline. The build image, glibc requirements and supported runtime OS are
  separate compatibility claims.

For missing native assets, follow the current
[manual native recovery procedure](https://github.com/contentauth/c2pa-js/blob/main/.github/RELEASING.md).
This canonical link also works on older branches without that file. Re-running
the entire release workflow after npm publication may publish nothing and skip
native rebuilding. Use the documented exact-version/target recovery and dry-run
mode; preserve existing assets by default. Replacement requires separate explicit
authorization, not an assumption that retrying is harmless.

Finally, install the **published** packages in a clean consumer environment,
without local binary overrides or workspace resolution. Verify the addon actually
loads and performs read/sign operations on supported platforms, and the published
WASM/worker/inline paths execute in browsers. Include the oldest supported Linux
runtime in native verification. Report actual results and skipped counts; a local
source build or a recovery upload is not final published-binary validation.

## 7. Prepare the final upgrade diff

Start the final registry upgrade from current main or integrate current main
before final validation; do not blindly merge the historical probe. Keep only the
dependency/lockfile, required adapter/facade/consumer/test changes, current public
documentation and a changeset for affected packages (`pnpm changeset`).

Remove probe-only Git/path overrides, local tarball references, environment
wiring, publication blockers added solely for the probe, temporary scripts and
release-specific notes from the final upgrade PR. Preserve normal safety guards.
Keep investigation history and full logs in the draft PR or external session
notes, not in production source. Rebuild and revalidate the final registry path.

Use the [PR template](../.github/PULL_REQUEST_TEMPLATE) with a concise description
of the **current diff**: overview, concrete changes, exact testing and applicable
cross-package drift checks. Update it after changes; do not retain superseded
compatibility claims. Distinguish preflight success, final-crate validation and
published-package readiness rather than claiming the whole lifecycle is complete
from one successful gate.
