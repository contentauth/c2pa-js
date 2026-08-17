---
"@contentauth/c2pa-web": patch
---

Republish to fix `@contentauth/c2pa-types`, `@contentauth/c2pa-utilities`, and `@contentauth/c2pa-wasm` dependencies, which were published as the literal string `workspace:*` instead of resolved versions. This happened because this package's publish ran concurrently with `c2pa-node`'s in the same release, hitting a race in pnpm's workspace-protocol rewrite during `pnpm publish` (now patched to publish serially). No source changes are included; this release exists solely to get a correctly published package out.
