---
'@contentauth/c2pa-web': patch
'@contentauth/c2pa-wasm': patch
---

Reuse equivalent WASM contexts across Reader and Builder operations in each web worker.

Successful trust resolution remains memoized within each Context without automatic expiry. Create a new Context to resolve updated trust resources while existing Readers and Builders retain their original settings.
