# Viewing manifest data

## Initializing the library

The way that you import `wasmSrc` and `workerSrc` varies depending on the build system you use. For more information, see [Quick start](../getting-started/quick-start#bringing-in-the-library).

## Viewing manifest data

If the input provided to [`c2pa.read`](../../js-sdk/api/c2pa.c2pa#methods) has a C2PA manifest and was processed without errors, the returned [`c2paReadResult`](../../js-sdk/api/c2pa.c2pareadresult) contains a [`manifestStore`](../../js-sdk/api/c2pa.c2pareadresult.manifeststore).

The [`manifestStore`](../../js-sdk/api/c2pa.c2pareadresult.manifeststore) object contains a few properties:

- **manifests**: An object containing _all_ manifests found in an asset, keyed by UUID.
- **activeManifest**: A pointer to the latest [`manifest`](../../js-sdk/api/c2pa.manifest) in the manifest store. Effectively the "parent" manifest, this is the likely starting point when inspecting an asset's C2PA data.
- **validationStatus**: A list of any validation errors the library generated when processing an asset. See [Validation](./validation) for more information.

[`Manifest`](../../js-sdk/api/c2pa.manifest) objects contain properties pertaining to an asset's provenance, along with convenient interfaces for [accessing assertion data](../../js-sdk/api/c2pa.assertionaccessor) and [generating a thumbnail](../../js-sdk/api/c2pa.thumbnail).

## Example

This example from the [c2pa-js-examples repo](https://github.com/contentauth/c2pa-js-examples/blob/main/minimal-ts-vite/examples/active-manifest/) demonstrates a basic workflow:

- Reading an image.
- Checking for the presence of a manifest store.
- Displaying the data in the active manifest.

**Example TBD**

_Can we include a simple example that shows how to view the manifest data in the browser?_

_Something like https://github.com/contentauth/c2pa-js-v2/tree/main/packages/c2pa-web#use but maybe a bit more functional, i.e. showing validation errors, etc._


