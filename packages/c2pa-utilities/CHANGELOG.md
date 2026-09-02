# @contentauth/c2pa-utilities

## 0.2.2

### Patch Changes

- afccc92: Update c2pa-rs from 0.90.15->0.90.16
- Updated dependencies [afccc92]
  - @contentauth/c2pa-types@0.7.4

## 0.2.1

### Patch Changes

- a62320c: Republish to fix `@contentauth/c2pa-types` dependency, which was published as the literal string `workspace:*` instead of a resolved version. This happened because 0.2.0 was published manually with `npm publish` as a one-off fix for a CI/OIDC issue, bypassing pnpm's workspace-protocol rewrite that the normal release pipeline relies on. No source changes are included; this release exists solely to get a correctly published package out through `pnpm publish`.

## 0.2.0

### Minor Changes

- b3b3196: Introduce new c2pa-utilities package, and update c2pa-web and c2pa-node to use it.
- f2f6ada: Move the Reader asset size check into `c2pa-utilities`, shared by both `c2pa-web` and `c2pa-node`. `c2pa-node`'s Reader now validates asset size before reading, using its own server-appropriate limit.

  `validateAssetSize` treats a `maxSizeInBytes` of `0` as a request to use the new `DEFAULT_MAX_SIZE_IN_BYTES`, and throws a `RangeError` for non-finite or negative size/limit values.

- 0f42fe8: Consolidate the `SigningAlg` type into `@contentauth/c2pa-utilities` (derived from `@contentauth/c2pa-types`'s schema-generated type). Re-use `ManifestAssertionKind` from `@contentauth/c2pa-types` instead of a duplicate hand-written copy. Fix `c2pa-node`'s `package.json` to list `@contentauth/c2pa-types` as a `dependency` rather than a `devDependency`, matching `c2pa-web`.

### Patch Changes

- f038dc1: Add isRetryableError and fetch as options on FetchWithRetryOptions.
