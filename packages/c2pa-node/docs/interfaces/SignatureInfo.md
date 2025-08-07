[**c2pa-node**](../README.md)

***

[c2pa-node](../README.md) / SignatureInfo

# Interface: SignatureInfo

Defined in: [types.d.ts:374](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L374)

Holds information about a signature

## Indexable

\[`k`: `string`\]: `unknown`

## Properties

### alg?

> `optional` **alg**: [`SigningAlg`](../type-aliases/SigningAlg.md)

Defined in: [types.d.ts:378](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L378)

human readable issuing authority for this signature

***

### cert\_serial\_number?

> `optional` **cert\_serial\_number**: `string`

Defined in: [types.d.ts:382](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L382)

The serial number of the certificate

***

### issuer?

> `optional` **issuer**: `string`

Defined in: [types.d.ts:386](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L386)

human readable issuing authority for this signature

***

### revocation\_status?

> `optional` **revocation\_status**: `boolean`

Defined in: [types.d.ts:390](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L390)

revocation status of the certificate

***

### time?

> `optional` **time**: `string`

Defined in: [types.d.ts:394](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L394)

the time the signature was created
