# @contentauth/c2pa-node

## 0.9.0

### Minor Changes

- b3b3196: Introduce new c2pa-utilities package, and update c2pa-web and c2pa-node to use it.
- f2f6ada: Move the Reader asset size check into `c2pa-utilities`, shared by both `c2pa-web` and `c2pa-node`. `c2pa-node`'s Reader now validates asset size before reading, using its own server-appropriate limit.

  `validateAssetSize` treats a `maxSizeInBytes` of `0` as a request to use the new `DEFAULT_MAX_SIZE_IN_BYTES`, and throws a `RangeError` for non-finite or negative size/limit values.

### Patch Changes

- 2de9ba5: c2pa-rs bump
- facb1f0: Bump c2pa-rs version to 0.90.14
- 1102535: Bump c2pa-rs version to v0.90.10
- 4c8ad00: c2pa-rs version bump to v0.90.12
- b82e854: Bump c2pa-rs to v0.90.15
- 0f42fe8: Consolidate the `SigningAlg` type into `@contentauth/c2pa-utilities` (derived from `@contentauth/c2pa-types`'s schema-generated type). Re-use `ManifestAssertionKind` from `@contentauth/c2pa-types` instead of a duplicate hand-written copy. Fix `c2pa-node`'s `package.json` to list `@contentauth/c2pa-types` as a `dependency` rather than a `devDependency`, matching `c2pa-web`.
- Updated dependencies [f038dc1]
- Updated dependencies [b3b3196]
- Updated dependencies [f2f6ada]
- Updated dependencies [0f42fe8]
  - @contentauth/c2pa-utilities@0.2.0

## 0.8.3

### Patch Changes

- bd63c58: Add updateActions builder methods

## 0.8.2

### Patch Changes

- dc1f034: Bump c2pa-rs version to v0.90.5

## 0.8.1

### Patch Changes

- b558be8: feat: incorporate c2pa builder filter_actions_and_ingredients
- a5a904b: Update c2pa to 0.90.4

## 0.8.0

### Minor Changes

- 684942a: Strip archive metadata assertion when constructing builder from archive

### Patch Changes

- 219c3df: Fix node binary download

## 0.7.0

### Minor Changes

- fc4f6e3: Include new experimental builder reduction methods

## 0.6.4

### Patch Changes

- 2cf74c2: Update ts-deepmerge to 8.0.0

## 0.6.3

### Patch Changes

- 1a492a3: Fix prebuilt native binary distribution.

  - Release workflow now looks up the GitHub release by its real changesets tag
    (`@contentauth/c2pa-node@<version>`) instead of `v<version>`, so binary assets
    actually attach to the release. Previously the tag lookup returned `null`, the
    upload silently POSTed to `/releases/null/assets` and 404'd while the job stayed
    green.
  - Resolve the published version from the c2pa-node entry in `publishedPackages`
    rather than index `[0]`, which is unreliable in multi-package changesets runs.
  - Add `--fail` to the release-id and upload curls so a broken upload fails the job
    instead of passing silently.
  - `postinstall` now downloads from the same scoped tag, so the client fetches the
    correct asset URL.

## 0.6.2

### Patch Changes

- a18cf0e: Update C2PA version to 0.90.0.

## 0.6.1

### Patch Changes

- c5dd375: Update for c2pa 0.89.3

## 0.6.0

### Minor Changes

- 40d779d: Release v0.6.0 from c2pa-node's new home in the c2pa-js monorepo.

> **Note:** As of v0.6.0, development has moved to the
> [contentauth/c2pa-js](https://github.com/contentauth/c2pa-js) monorepo
> under `packages/c2pa-node`. History prior to that migration was preserved
> from [contentauth/c2pa-node-v2](https://github.com/contentauth/c2pa-node-v2)
> (now archived).

## 0.5.5

### Patch Changes

- 1bdc7bf: Update trustmark model url
- f40b882: Fix x86 mac release. Allow custom index.node
- 4ed8b65: Add method for adding redactions to builder

## 0.5.4

### Patch Changes

- c5e18ed: Allow partial verify settings

## 0.5.3

### Patch Changes

- c94044e: export Ingredient from c2pa-types

## 0.5.2

### Patch Changes

- ec86837: Update c2pa crate to 0.77.0

## 0.5.1

### Patch Changes

- df6a49c: Add context to additional methods. Update c2pa crate.

## 0.5.0

### Minor Changes

- 70a7ee3: Add settings to Builder and Reader constructors, remove global settings

## 0.4.2

### Patch Changes

- 26f0c35: Fix settings on tasks. Fix Builder toArchive

## 0.4.1

### Patch Changes

- c6defcc: Add addIngredientFromReader method

## 0.4.0

### Minor Changes

- 9e2fb33: Integrate postCawgValidate into Reader.

### Patch Changes

- 8a87c6d: Make asset in Builder.addIngredient optional. Add Builder.addAction

## 0.3.0

### Minor Changes

- 595304e: Implement AsyncRawSigner so that the rust SDK will handle COSE signing if directCoseHandling is true.

### Patch Changes

- 58defa2: Add setIntent
- fcf2f0f: CAWG reader validation improvements

## 0.2.3

### Patch Changes

- 395019e: Convert package to ES Module
- 945ddb0: Add necessary dev dependencies

## 0.2.2

### Patch Changes

- a483012: Fix postinstall

## 0.2.1

### Patch Changes

- 75515d2: Change github workflow
