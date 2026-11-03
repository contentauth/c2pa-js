# Recovering missing c2pa-node binaries

The Release workflow normally builds native binaries after publishing a new
`@contentauth/c2pa-node` version. Re-running the entire workflow after npm
publication does not rebuild binaries, because Changesets has nothing to publish.

To recover missing binaries without publishing another npm version:

1. Open **Actions > Release > Run workflow** on GitHub.
2. Select **main** so the workflow includes the manual rebuild mode.
3. Enter the already-published version, such as `0.9.10`, without a `v` prefix.
4. Select the missing native target, or **all** to build every supported target.
5. Click **Run workflow**.

The workflow checks out the exact `@contentauth/c2pa-node@<version>` tag, verifies
the version on the public npm registry, and uploads binaries to that version's
existing GitHub release. It does not publish npm packages or documentation.
Existing release assets are left unchanged; selecting **all** still builds those
targets but skips their uploads.

Leaving the version empty preserves the manual documentation-only workflow.

## Dry runs (verification without upload)
To verify a rebuild before uploading release assets, enter a version and enable
**dry-run**. The workflow still checks out the release tag, verifies npm
availability, builds and packages the binary, and looks up the existing GitHub
release, but skips the upload step. Dry runs do not modify release assets.
Before merging workflow changes, select the feature branch instead of **main**;
the binary source still comes from the specified release tag.
