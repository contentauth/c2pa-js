---
"@contentauth/c2pa-node": patch
---

Republish to fix `@contentauth/c2pa-utilities` dependency, which resolved to `0.2.0` — the broken version published with an unresolved `workspace:*` dependency of its own (see the `c2pa-utilities` patch in this same release). This release has no source changes; it exists to pick up the corrected `c2pa-utilities` version once published.
