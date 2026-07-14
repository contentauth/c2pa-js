---
'@contentauth/c2pa-node': patch
'@contentauth/c2pa-types': patch
---

Adapt to the c2pa-raw-crypto split in c2pa-rs ([#2231](https://github.com/contentauth/c2pa-rs/pull/2231)), which moves `SigningAlg` and the raw-signature traits into the new `c2pa-raw-crypto` crate. `c2pa-node` drops the now-removed `AsyncRawSigner`/`RawSigner` impls and signs through the public `AsyncSigner` directly; `c2pa-types` re-exports the generated `SigningAlgSchema` under the original `SigningAlg` name. No public API or behavior changes.
