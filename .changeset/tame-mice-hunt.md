---
'@contentauth/c2pa-utilities': minor
'@contentauth/c2pa-node': minor
'@contentauth/c2pa-web': patch
---

Move the Reader format allowlist and asset-too-large validation into `c2pa-utilities`, shared by both `c2pa-web` and `c2pa-node`. `c2pa-node`'s Reader now validates asset format and size before reading, matching `c2pa-web`'s existing behavior, using its own server-appropriate size limit.
