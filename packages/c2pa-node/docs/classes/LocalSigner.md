[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / LocalSigner

# Class: LocalSigner

Defined in: [Signer.ts:24](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Signer.ts#L24)

A signer that uses a local certificate and private key to sign data

## Implements

- [`LocalSignerInterface`](../interfaces/LocalSignerInterface.md)

## Constructors

### Constructor

> **new LocalSigner**(`localSigner`): `LocalSigner`

Defined in: [Signer.ts:25](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Signer.ts#L25)

#### Parameters

##### localSigner

`unknown`

#### Returns

`LocalSigner`

## Methods

### alg()

> **alg**(): [`SigningAlg`](../type-aliases/SigningAlg.md)

Defined in: [Signer.ts:46](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Signer.ts#L46)

#### Returns

[`SigningAlg`](../type-aliases/SigningAlg.md)

#### Implementation of

[`LocalSignerInterface`](../interfaces/LocalSignerInterface.md).[`alg`](../interfaces/LocalSignerInterface.md#alg)

***

### certs()

> **certs**(): `Buffer`\<`ArrayBufferLike`\>[]

Defined in: [Signer.ts:50](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Signer.ts#L50)

#### Returns

`Buffer`\<`ArrayBufferLike`\>[]

#### Implementation of

[`LocalSignerInterface`](../interfaces/LocalSignerInterface.md).[`certs`](../interfaces/LocalSignerInterface.md#certs)

***

### reserveSize()

> **reserveSize**(): `number`

Defined in: [Signer.ts:54](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Signer.ts#L54)

#### Returns

`number`

#### Implementation of

[`LocalSignerInterface`](../interfaces/LocalSignerInterface.md).[`reserveSize`](../interfaces/LocalSignerInterface.md#reservesize)

***

### sign()

> **sign**(`data`): `Buffer`

Defined in: [Signer.ts:42](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Signer.ts#L42)

#### Parameters

##### data

`Buffer`

#### Returns

`Buffer`

#### Implementation of

[`LocalSignerInterface`](../interfaces/LocalSignerInterface.md).[`sign`](../interfaces/LocalSignerInterface.md#sign)

***

### signer()

> **signer**(): `unknown`

Defined in: [Signer.ts:62](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Signer.ts#L62)

#### Returns

`unknown`

#### Implementation of

[`LocalSignerInterface`](../interfaces/LocalSignerInterface.md).[`signer`](../interfaces/LocalSignerInterface.md#signer)

***

### timeAuthorityUrl()

> **timeAuthorityUrl**(): `undefined` \| `string`

Defined in: [Signer.ts:58](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Signer.ts#L58)

#### Returns

`undefined` \| `string`

#### Implementation of

[`LocalSignerInterface`](../interfaces/LocalSignerInterface.md).[`timeAuthorityUrl`](../interfaces/LocalSignerInterface.md#timeauthorityurl)

***

### newSigner()

> `static` **newSigner**(`certificate`, `privateKey`, `algorithm`, `tsaUrl?`): `LocalSigner`

Defined in: [Signer.ts:27](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Signer.ts#L27)

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
