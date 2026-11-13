---
'@contentauth/c2pa-web': patch
'@contentauth/c2pa-wasm': patch
---

Register unchanged settings in WASM once and reuse opaque context IDs across Reader and Builder operations in each web worker, avoiding repeated JSON transfer and parsing. Bound caches to 16 settings entries without invalidating live Readers or Builders, and preserve direct JSON-based WASM entry points.

Successful trust resolution remains memoized within each Context without automatic expiry. Create a new Context to resolve updated trust resources while existing Readers and Builders retain their original settings.
