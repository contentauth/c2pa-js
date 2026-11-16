---
name: c2pa-rs-migration
description: 'Use when preflighting a c2pa-rs branch or tag, upgrading the Rust SDK in c2pa-js, fixing binding/schema compatibility, or validating the resulting published JavaScript packages.'
---

# c2pa-rs migration

Read the [migration and preflight runbook](../../../docs/c2pa-rs-preflight.md)
before editing, together with the repository instructions. It uses existing
Cargo, pnpm and Nx tooling; it does not install a migration runner.

1. Establish the requested outcome: new Git preflight, existing PR refresh,
   registry crate upgrade, or published-package verification. Start new work
   from current main; preserve and update an existing migration branch rather
   than creating a competing one. Record immutable source identity and the
   applicable stop condition.
2. Set up the selected source's tools and dependencies before running generation
   or builds. Preserve features and the repository's build output layout.
3. Trace changes through native/WASM adapters, generated schemas, the public type
   facade and affected consumers. Do not invent compatibility aliases for removed
   upstream APIs without explicit authorization. Validate types, compilation and
   real runtime behavior separately; preserve trust, errors and cleanup.
4. When a downstream probe is requested, build/pack one committed upstream head,
   verify installed bytes and invalidate stale same-version candidate caches.
   Repin after upstream changes. Test actual registry/native/WASM artifacts when
   available; source-probe results do not prove published-package readiness.
5. Return changed files, source/artifact identities, exact checks and actual
   pass/fail/skipped counts, missing prerequisites and remaining lifecycle gates.
   Keep the final upgrade diff and PR description focused on current changes.
   Stop at the requested stage; do not publish or replace assets implicitly.

For example, a successful Git-tag probe still requires a registry-source rebuild
when the final crate appears. A passing TypeScript check does not prove that the
published native addon loads on the supported Linux baseline.
