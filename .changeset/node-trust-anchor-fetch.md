---
"@contentauth/c2pa-node": patch
---

Adds support for resolving trust-anchor URLs from `Context` settings before creating Node Readers and Builders via `Context`-based async constructors. This is an additive change; previously, the `Context` path only merged defaults and serialized settings without considering trust-anchor URLs.
