---
'@contentauth/c2pa-web': patch
'@contentauth/c2pa-wasm': patch
---

Transfer unchanged settings into WASM once and reuse owned `WasmContext` handles across Reader and Builder operations in each web worker, avoiding repeated JSON transfer and parsing. Bound the worker cache to 16 settings entries and free handles on eviction without invalidating live Readers, Builders or pending reads. Recover evicted in-flight worker IDs before construction. Preserve direct JSON-based WASM entry points without a global WASM registry.

Successful trust resolution remains memoized within each Context without automatic expiry. Create a new Context to resolve updated trust resources while existing Readers and Builders retain their original settings.

Only omit settings JSON after the worker acknowledges successful WASM registration, keeping registration failures retryable without discarding contexts when asset or manifest construction fails.
