[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / SignatureInfo

# Interface: SignatureInfo

Defined in: [types.d.ts:395](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L395)

Holds information about a signature

## Indexable

\[`k`: `string`\]: `unknown`

## Properties

### alg?

> `optional` **alg**: [`SigningAlg`](../type-aliases/SigningAlg.md)

Defined in: [types.d.ts:399](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L399)

human readable issuing authority for this signature

***

### cert\_serial\_number?

> `optional` **cert\_serial\_number**: `string`

Defined in: [types.d.ts:403](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L403)

The serial number of the certificate

***

### issuer?

> `optional` **issuer**: `string`

Defined in: [types.d.ts:407](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L407)

human readable issuing authority for this signature

***

### revocation\_status?

> `optional` **revocation\_status**: `boolean`

Defined in: [types.d.ts:411](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L411)

revocation status of the certificate

***

### time?

> `optional` **time**: `string`

Defined in: [types.d.ts:415](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L415)

the time the signature was created
