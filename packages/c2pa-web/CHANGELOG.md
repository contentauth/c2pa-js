# @contentauth/c2pa-web

## 0.5.6

### Patch Changes

- b7312c3: Allow settings to be passed to Reader and Builder constructors
- Updated dependencies [b7312c3]
  - @contentauth/c2pa-wasm@0.4.3

## 0.5.5

### Patch Changes

- 827bd7e: add settings required for compliance signing

## 0.5.4

### Patch Changes

- 4f76072: Add Builder method to add ingredient json only
- Updated dependencies [4f76072]
  - @contentauth/c2pa-wasm@0.4.2

## 0.5.3

### Patch Changes

- Updated dependencies [c7ec557]
- Updated dependencies [c7ec557]
  - @contentauth/c2pa-wasm@0.4.1
  - @contentauth/c2pa-types@0.4.1

## 0.5.2

### Patch Changes

- Updated dependencies [3fac969]
  - @contentauth/c2pa-types@0.4.1

## 0.5.1

### Patch Changes

- cc6049c: Allow trust resources to be specified as a URL in settings, to be fetched on SDK initialization.

## 0.5.0

### Minor Changes

- 88b9dfd: Update c2pa-rs to 0.71
  Trust verification now on by default (can be disabled via settings)
  CAWG validation now occurs for all Reader methods
  CAWG validation now includes a network call to verify DID credential state
  Added builder.new()
  Added builder.toArchve() & builder.fromArchive()
  Added builder.setIntent()
  Added builder.addAction()
  Made binary data return types consistent: Uint8Array<ArrayBuffer>
  Renamed reader.resourceToBuffer() to reader.resourceToBytes()
  Fixed bug where reader.fromBlobFragment would throw an error when reading an initial fragment without c2pa data

### Patch Changes

- Updated dependencies [88b9dfd]
- Updated dependencies [88b9dfd]
  - @contentauth/c2pa-wasm@0.4.0
  - @contentauth/c2pa-types@0.4.0

## 0.4.1

### Patch Changes

- Updated dependencies [4d16288]
  - @contentauth/c2pa-types@0.3.1

## 0.4.0

### Minor Changes

- e0e9b89: Reader now returns null (instead of throwing an error) when no content credentials are found

## 0.3.2

### Patch Changes

- 4b08cdc: Add signAndGetManifestBytes() method
- Updated dependencies [4b08cdc]
  - @contentauth/c2pa-wasm@0.3.2

## 0.3.1

### Patch Changes

- 6f34d30: Add builder methods: setRemoteUrl, setNoEmbed, and setThumbnailFromBlob
- Updated dependencies [6f34d30]
  - @contentauth/c2pa-wasm@0.3.1

## 0.3.0

### Minor Changes

- 4c3ccd5: Expose basic building & signing API

### Patch Changes

- Updated dependencies [4c3ccd5]
- Updated dependencies [4c3ccd5]
  - @contentauth/c2pa-types@0.3.0
  - @contentauth/c2pa-wasm@0.3.0

## 0.2.3

### Patch Changes

- 2c499ef: Fix issue which crashes reader.fromBlob() and reader.fromBlobFragment() in Firefox.

## 0.2.2

### Patch Changes

- dda5680: Added @contentauth/c2pa-wasm/inline entrypoint with inlined WASM binary

## 0.2.1

### Patch Changes

- 866ef6c: Add additional type exports
- Updated dependencies [866ef6c]
- Updated dependencies [866ef6c]
  - @contentauth/c2pa-types@0.2.1
  - @contentauth/c2pa-wasm@0.2.1

## 0.2.0

### Minor Changes

- f21c81d: Added reader.manifestStore() and reader.activeManifest() APIs

### Patch Changes

- cd68747: Remove incorrect "development" field from package.json exports in published builds
- cd68747: Update to c2pa-rs 0.62.0 and enable remote manifest fetching
- 1c41d72: Fixed broken package.json exports field
- Updated dependencies [f21c81d]
- Updated dependencies [cd68747]
- Updated dependencies [1c41d72]
  - @contentauth/c2pa-types@0.2.0
  - @contentauth/c2pa-wasm@0.2.0

## 0.1.2

### Patch Changes

- eda667c: Added WASM binary to package.json exports

## 0.1.1

### Patch Changes

- 3868d81: Fix broken dependencies
- Updated dependencies [3868d81]
  - @contentauth/c2pa-wasm@0.1.1

## 0.1.0

### Minor Changes

- e9a7614: Add minimal reader API

### Patch Changes

- Updated dependencies [e9a7614]
  - @contentauth/c2pa-wasm@0.1.0
