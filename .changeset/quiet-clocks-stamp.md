---
'@contentauth/c2pa-node': patch
---

Fix `CallbackSigner` silently ignoring `tsaUrl` and `tsaHeaders` when signing with `Builder.signAsync`, `signConfigAsync` or `identitySignAsync`. Since 0.9.8, manifests were signed without an RFC 3161 time-stamp and the TSA was never contacted.
