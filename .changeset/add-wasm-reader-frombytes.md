---
"@contentauth/c2pa-wasm": minor
---

Add `WasmReader.fromBytes(format, bytes, settings?)`. Unlike `fromBlob`, this entry point reads the asset from an in-memory buffer and does not use any browser-only Web APIs (`Blob`, `FileReaderSync`), so C2PA verification can run in non-browser JavaScript runtimes such as Node.js, Deno, Bun, and Cloudflare Workers (workerd).
