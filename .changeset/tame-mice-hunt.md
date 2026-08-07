---
'@contentauth/c2pa-utilities': minor
'@contentauth/c2pa-node': minor
'@contentauth/c2pa-web': patch
---

Move the Reader asset size check into `c2pa-utilities`, shared by both `c2pa-web` and `c2pa-node`. `c2pa-node`'s Reader now validates asset size before reading, using its own server-appropriate limit.

`validateAssetSize` treats a `maxSizeInBytes` of `0` as a request to use the new `DEFAULT_MAX_SIZE_IN_BYTES`, and throws a `RangeError` for non-finite or negative size/limit values.
