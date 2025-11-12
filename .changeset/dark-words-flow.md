---
'@contentauth/c2pa-wasm': minor
'@contentauth/c2pa-web': minor
---

Update c2pa-rs to 0.71
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

