---
"@contentauth/c2pa-web": patch
---

Republish again — `0.14.1` still published with unresolved `workspace:*` dependencies, because the serial-publish patch from #194 was applied to a `@changesets/cli` resolution that the release pipeline never actually invoked (see the patch-targeting fix in this same release). No source changes; this release exists solely to get a correctly published package out now that the patch is wired up correctly.
