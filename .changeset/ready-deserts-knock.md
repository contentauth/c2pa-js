---
'@contentauth/c2pa-utilities': minor
'@contentauth/c2pa-node': patch
'@contentauth/c2pa-web': patch
---

Add SdkConfig, a second Context constructor argument for SDK-side configuration, starting with maxSizeInBytes. Each SDK keeps its existing asset size limit as the default, so behavior is unchanged.
