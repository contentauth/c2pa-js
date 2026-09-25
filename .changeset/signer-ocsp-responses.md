---
'@contentauth/c2pa-node': patch
---

Add `ocspResponses` to `JsCallbackSignerConfig` and `LocalSigner.newSigner` to staple pre-fetched OCSP responses for the signing certificate chain into signatures.
