---
"@contentauth/c2pa-web": patch
---

Republish `c2pa-web` again. `0.14.0`–`0.14.2` all published with unresolved `workspace:*` dependencies and unmerged `publishConfig`. The actual root cause: `packages/c2pa-web` had a stray, long-committed `package-lock.json`, which caused confusion in CI when determining whether to use `npm` or `pnpm` to publish. No source changes; this release exists solely to get a correctly published package out now that the stray lockfile is gone.
