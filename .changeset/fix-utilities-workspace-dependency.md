---
"@contentauth/c2pa-utilities": patch
---

Republish to fix `@contentauth/c2pa-types` dependency, which was published as the literal string `workspace:*` instead of a resolved version. This happened because 0.2.0 was published manually with `npm publish` as a one-off fix for a CI/OIDC issue, bypassing pnpm's workspace-protocol rewrite that the normal release pipeline relies on. No source changes are included; this release exists solely to get a correctly published package out through `pnpm publish`.
