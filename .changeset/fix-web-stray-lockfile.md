---
"@contentauth/c2pa-web": patch
---

Republish again. `0.14.0`–`0.14.2` all published with unresolved `workspace:*` dependencies and unmerged `publishConfig`. The actual root cause: `packages/c2pa-web` had a stray, long-committed `package-lock.json` left over from before this repo standardized on pnpm. `changeset publish` detects the package manager per-package by walking up from that package's own directory, found this lockfile before ever reaching the real root `pnpm-lock.yaml`, and published this package with plain `npm publish` instead of `pnpm publish` — skipping every pnpm publish-time manifest transformation (workspace-protocol rewriting and `publishConfig` merging alike). This was never a concurrency issue; the serial-publish patch from #194/#196 never had anything to do with this package's failures. No source changes; this release exists solely to get a correctly published package out now that the stray lockfile is gone.
