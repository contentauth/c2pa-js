---
'@contentauth/c2pa-utilities': minor
'@contentauth/c2pa-node': minor
'@contentauth/c2pa-web': patch
---

Move the Reader format allowlist and asset size validation into `c2pa-utilities`. Update `c2pa-node`'s Reader so that it now validates asset format and size before reading, matching `c2pa-web`'s existing behavior, using its own server-appropriate limits.
