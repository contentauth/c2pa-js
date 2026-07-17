---
'@contentauth/c2pa-node': patch
---

Fix prebuilt native binary distribution.

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
