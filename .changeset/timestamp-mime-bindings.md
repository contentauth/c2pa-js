---
'@contentauth/c2pa-node': minor
'@contentauth/c2pa-wasm': minor
'@contentauth/c2pa-web': minor
---

Expose `Builder.addTimestamp(manifestLabel)` and static `Reader.supportedMimeTypes()` / `Builder.supportedMimeTypes()`.
Web MIME discovery accepts the `C2pa` instance and returns a Promise; Node MIME discovery is synchronous.
Timestamp requests are queued for signing, preserve existing timestamps, and require a signer with a timestamp authority URL.
The current Web signer has no timestamp authority URL option; the Web binding only queues the request.
