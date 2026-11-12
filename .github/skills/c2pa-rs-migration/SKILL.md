---
name: c2pa-rs-migration
description: 'Use when preflighting a c2pa-rs branch or tag, upgrading the Rust SDK in c2pa-js, fixing binding/schema compatibility, or validating the resulting published JavaScript packages.'
---

# c2pa-rs migration

Read the [migration and preflight runbook](../../../docs/c2pa-rs-preflight.md)
before editing. It is the authoritative workflow; do not duplicate release pins
or historical migration patches here.

1. Establish current main, branch/worktree state and the requested lifecycle
   stage: Git branch, Git tag, final registry crate or published JavaScript.
   Record immutable source identity and preserve existing features.
2. Follow the runbook through native/WASM adapters, generated schemas, the public
   type facade and affected consumers. Do not invent compatibility aliases for
   removed upstream APIs without explicit authorization.
3. Use fresh isolated builds and exact toolchain versions. Validate types,
   compilation and real binding runtime behavior separately; preserve trust,
   validation, failure and cleanup contracts.
4. Rebuild/repack and repin downstream after changes. For final publication
   readiness, verify actual registry tarballs, native assets and browser assets,
   then test the published binaries without local overrides.
5. Return changed files, source/artifact identities, exact checks and actual
   pass/fail/skipped counts, missing prerequisites and remaining lifecycle gates.
   Keep the final upgrade diff and PR description focused on current changes.

For example, a successful Git-tag probe still requires a registry-source rebuild
when the final crate appears. A passing TypeScript check does not prove a native
addon loads. Neither result authorizes publication, asset replacement or deployment.
