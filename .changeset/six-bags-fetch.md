---
'@contentauth/c2pa-node': patch
'@contentauth/c2pa-web': patch
---

Support optional (empty) mime types for Readers. Prefer supplying the mime type explicitly whenever it's known — omitting it falls back to slower, less reliable byte-based format detection in the native library.
