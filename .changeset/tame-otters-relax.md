---
'@contentauth/c2pa-node': patch
'@contentauth/c2pa-web': patch
'@contentauth/c2pa-utilities': minor
---

Consolidate the `SigningAlg` type into `@contentauth/c2pa-utilities` (derived from `@contentauth/c2pa-types`'s schema-generated type). Re-use `ManifestAssertionKind` from `@contentauth/c2pa-types` instead of a duplicate hand-written copy. Fix `c2pa-node`'s `package.json` to list `@contentauth/c2pa-types` as a `dependency` rather than a `devDependency`, matching `c2pa-web`.
