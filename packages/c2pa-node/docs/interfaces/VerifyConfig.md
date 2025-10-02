[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / VerifyConfig

# Interface: VerifyConfig

Defined in: [types.d.ts:394](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L394)

Configuration for verification settings in C2PA.
Controls various verification behaviors and options.

## Properties

### checkIngredientTrust

> **checkIngredientTrust**: `boolean`

Defined in: [types.d.ts:408](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L408)

Whether to check ingredient trust

***

### ocspFetch

> **ocspFetch**: `boolean`

Defined in: [types.d.ts:404](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L404)

Whether to fetch OCSP responses

***

### remoteManifestFetch

> **remoteManifestFetch**: `boolean`

Defined in: [types.d.ts:406](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L406)

Whether to fetch remote manifests

***

### skipIngredientConflictResolution

> **skipIngredientConflictResolution**: `boolean`

Defined in: [types.d.ts:410](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L410)

Whether to skip ingredient conflict resolution

***

### strictV1Validation

> **strictV1Validation**: `boolean`

Defined in: [types.d.ts:412](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L412)

Whether to use strict v1 validation

***

### verifyAfterReading

> **verifyAfterReading**: `boolean`

Defined in: [types.d.ts:396](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L396)

Whether to verify after reading a manifest

***

### verifyAfterSign

> **verifyAfterSign**: `boolean`

Defined in: [types.d.ts:398](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L398)

Whether to verify after signing a manifest

***

### verifyTimestampTrust

> **verifyTimestampTrust**: `boolean`

Defined in: [types.d.ts:402](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L402)

Whether to verify timestamp trust

***

### verifyTrust

> **verifyTrust**: `boolean`

Defined in: [types.d.ts:400](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L400)

Whether to verify trust during validation
