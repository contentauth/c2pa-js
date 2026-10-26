---
"@contentauth/c2pa-node": patch
"@contentauth/c2pa-wasm": patch
"@contentauth/c2pa-web": patch
"@contentauth/c2pa-types": patch
---

Update to c2pa-rs 0.91.7, including patched native TLS certificate verification and roots for the eMudhra incident. JavaScript HTTPS paths still require a patched Node.js runtime or browser independently of the Rust SDK.
