[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / LocalSigner

# Class: LocalSigner

Defined in: [Signer.ts:22](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/Signer.ts#L22)

A signer that uses a local certificate and private key to sign data

## Implements

- [`LocalSignerInterface`](../interfaces/LocalSignerInterface.md)

## Methods

### alg()

> **alg**(): [`SigningAlg`](../type-aliases/SigningAlg.md)

Defined in: [Signer.ts:44](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/Signer.ts#L44)

#### Returns

[`SigningAlg`](../type-aliases/SigningAlg.md)

#### Implementation of

[`LocalSignerInterface`](../interfaces/LocalSignerInterface.md).[`alg`](../interfaces/LocalSignerInterface.md#alg)

***

### certs()

> **certs**(): `Buffer`\<`ArrayBufferLike`\>[]

Defined in: [Signer.ts:48](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/Signer.ts#L48)

#### Returns

`Buffer`\<`ArrayBufferLike`\>[]

#### Implementation of

[`LocalSignerInterface`](../interfaces/LocalSignerInterface.md).[`certs`](../interfaces/LocalSignerInterface.md#certs)

***

### reserveSize()

> **reserveSize**(): `number`

Defined in: [Signer.ts:52](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/Signer.ts#L52)

#### Returns

`number`

#### Implementation of

[`LocalSignerInterface`](../interfaces/LocalSignerInterface.md).[`reserveSize`](../interfaces/LocalSignerInterface.md#reservesize)

***

### sign()

> **sign**(`data`): `Buffer`

Defined in: [Signer.ts:40](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/Signer.ts#L40)

#### Parameters

##### data

`Buffer`

#### Returns

`Buffer`

#### Implementation of

[`LocalSignerInterface`](../interfaces/LocalSignerInterface.md).[`sign`](../interfaces/LocalSignerInterface.md#sign)

***

### signer()

> **signer**(): [`LocalSignerInterface`](../interfaces/LocalSignerInterface.md)

Defined in: [Signer.ts:60](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/Signer.ts#L60)

#### Returns

[`LocalSignerInterface`](../interfaces/LocalSignerInterface.md)

#### Implementation of

[`LocalSignerInterface`](../interfaces/LocalSignerInterface.md).[`signer`](../interfaces/LocalSignerInterface.md#signer)

***

### timeAuthorityUrl()

> **timeAuthorityUrl**(): `undefined` \| `string`

Defined in: [Signer.ts:56](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/Signer.ts#L56)

#### Returns

`undefined` \| `string`

#### Implementation of

[`LocalSignerInterface`](../interfaces/LocalSignerInterface.md).[`timeAuthorityUrl`](../interfaces/LocalSignerInterface.md#timeauthorityurl)

***

### newSigner()

> `static` **newSigner**(`certificate`, `privateKey`, `algorithm`, `tsaUrl?`): `LocalSigner`

Defined in: [Signer.ts:25](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/Signer.ts#L25)

#### Parameters

##### certificate

`Buffer`

##### privateKey

`Buffer`

##### algorithm

[`SigningAlg`](../type-aliases/SigningAlg.md)

##### tsaUrl?

`string`

#### Returns

`LocalSigner`
