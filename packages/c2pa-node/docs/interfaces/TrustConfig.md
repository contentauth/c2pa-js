[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / TrustConfig

# Interface: TrustConfig

Defined in: [types.d.ts:377](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L377)

Configuration for trust settings in C2PA.
Controls certificate trust validation and trust anchor management.

## Properties

### allowedList?

> `optional` **allowedList**: `string`

Defined in: [types.d.ts:387](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L387)

Allowed list of certificates (PEM format or base64-encoded certificate hashes)

***

### trustAnchors?

> `optional` **trustAnchors**: `string`

Defined in: [types.d.ts:383](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L383)

Trust anchors for validation (PEM format or base64-encoded certificate hashes)

***

### trustConfig?

> `optional` **trustConfig**: `string`

Defined in: [types.d.ts:385](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L385)

Trust configuration file path

***

### userAnchors?

> `optional` **userAnchors**: `string`

Defined in: [types.d.ts:381](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L381)

User-provided trust anchors (PEM format or base64-encoded certificate hashes)

***

### verifyTrustList

> **verifyTrustList**: `boolean`

Defined in: [types.d.ts:379](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L379)

Whether to verify against the trust list
