---
'@contentauth/c2pa-node': minor
'@contentauth/c2pa-wasm': minor
'@contentauth/c2pa-web': minor
---

Expose typed SignerPayload encoding backed by Rust's `c2pa_cbor`: Node provides synchronous `encodeSignerPayload(payload): Uint8Array`, while Web provides `encodeSignerPayload(c2pa, payload): Promise<Uint8Array>` through the supplied instance's existing worker. Both bindings use the CAWG wire field names, encode hashes as byte strings, and omit empty roles and absent hash algorithms. Web Wasm instantiation remains worker-only, and input hash buffers are not detached.
