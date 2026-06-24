---
"@contentauth/c2pa-node": patch
---

Fix settings objects being silently ignored by `Reader` and `Builder`. Object-form settings were serialized with `JSON.stringify`, which left camelCase keys (e.g. `verifyTrustList`, `trustAnchors`) in place — keys that c2pa-rs does not recognize and silently drops. They are now normalized with `settingsToJson` (camelCase → snake_case) via a shared `normalizeSettings` helper, so settings created with `createTrustSettings`/`createVerifySettings`/`mergeSettings` take effect when passed directly. String settings and already-snake_case objects are unaffected.
