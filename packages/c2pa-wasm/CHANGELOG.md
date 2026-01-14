# @contentauth/c2pa-wasm

## 0.4.3

### Patch Changes

- b7312c3: Allow settings to be passed to Reader and Builder constructors

## 0.4.2

### Patch Changes

- 4f76072: Add Builder method to add ingredient json only

## 0.4.1

### Patch Changes

- c7ec557: Fix broken type

## 0.4.0

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

## 0.3.2

### Patch Changes

- 4b08cdc: Add signAndGetManifestBytes() method

## 0.3.1

### Patch Changes

- 6f34d30: Add builder methods: setRemoteUrl, setNoEmbed, and setThumbnailFromBlob

## 0.3.0

### Minor Changes

- 4c3ccd5: Expose basic building & signing API

## 0.2.1

### Patch Changes

- 866ef6c: Update wasm-bindgen to 0.2.101

## 0.2.0

### Minor Changes

- f21c81d: Added reader.manifestStore() and reader.activeManifest() APIs

### Patch Changes

- cd68747: Update to c2pa-rs 0.62.0 and enable remote manifest fetching
- 1c41d72: Fixed broken package.json exports field

## 0.1.1

### Patch Changes

- 3868d81: Fix broken dependencies

## 0.1.0

### Minor Changes

- e9a7614: Add minimal reader API
