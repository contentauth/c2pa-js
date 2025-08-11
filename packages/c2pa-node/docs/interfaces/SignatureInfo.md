[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / SignatureInfo

# Interface: SignatureInfo

Defined in: [types.d.ts:396](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/types.d.ts#L396)

Holds information about a signature

## Indexable

\[`k`: `string`\]: `unknown`

## Properties

### alg?

> `optional` **alg**: [`SigningAlg`](../type-aliases/SigningAlg.md)

Defined in: [types.d.ts:400](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/types.d.ts#L400)

human readable issuing authority for this signature

***

### cert\_serial\_number?

> `optional` **cert\_serial\_number**: `string`

Defined in: [types.d.ts:404](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/types.d.ts#L404)

The serial number of the certificate

***

### issuer?

> `optional` **issuer**: `string`

Defined in: [types.d.ts:408](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/types.d.ts#L408)

human readable issuing authority for this signature

***

### revocation\_status?

> `optional` **revocation\_status**: `boolean`

Defined in: [types.d.ts:412](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/types.d.ts#L412)

revocation status of the certificate

***

### time?

> `optional` **time**: `string`

Defined in: [types.d.ts:416](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/types.d.ts#L416)

the time the signature was created
