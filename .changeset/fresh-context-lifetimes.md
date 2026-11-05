---
'@contentauth/c2pa-utilities': patch
---

Expire memoized Context settings at the earliest resolved trust-resource cache deadline. Preserve existing cached lifetimes across Contexts, share concurrent refreshes, and reject refresh failures without substituting expired trust data.
