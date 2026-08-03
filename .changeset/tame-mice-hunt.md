---
'@contentauth/c2pa-utilities': minor
'@contentauth/c2pa-node': minor
'@contentauth/c2pa-web': patch
---

Move the Reader asset size check into `c2pa-utilities`, shared by both `c2pa-web` and `c2pa-node`. `c2pa-node`'s Reader now validates asset size before reading, using its own server-appropriate limit.
