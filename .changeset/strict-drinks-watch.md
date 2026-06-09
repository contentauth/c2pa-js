---
'@contentauth/c2pa-types': minor
'@contentauth/c2pa-wasm': minor
'@contentauth/c2pa-web': minor
---

Bundle c2pa_worker.js as self-contained ESM so consumers can use workerSrc without a bundler

**Breaking change for `@contentauth/c2pa-web` 0.10.0**: the package export subpath has been renamed from `./worker` to `./c2pa_worker`. Update any import or workerSrc path accordingly.
