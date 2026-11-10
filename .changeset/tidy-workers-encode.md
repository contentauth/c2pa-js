---
'@contentauth/c2pa-web': patch
---

Allow `encodeSignerPayload` to accept wrappers that retain the instance's worker capability but replace or omit its reader and builder factories. Ordinary instances remain compatible, and encoding behavior is unchanged.
