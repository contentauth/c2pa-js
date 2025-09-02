[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / LocalSigner

# Class: LocalSigner

Defined in: [Signer.ts:16](https://github.com/contentauth/c2pa-node-v2/blob/1df68df861d38a8c4eb7c634a613532727ec72d3/js-src/Signer.ts#L16)

## Implements

- `LocalSigner`

## Methods

### alg()

> **alg**(): [`SigningAlg`](../type-aliases/SigningAlg.md)

Defined in: [Signer.ts:38](https://github.com/contentauth/c2pa-node-v2/blob/1df68df861d38a8c4eb7c634a613532727ec72d3/js-src/Signer.ts#L38)

#### Returns

[`SigningAlg`](../type-aliases/SigningAlg.md)

#### Implementation of

`neon.LocalSigner.alg`

***

### certs()

> **certs**(): `Buffer`\<`ArrayBufferLike`\>[]

Defined in: [Signer.ts:42](https://github.com/contentauth/c2pa-node-v2/blob/1df68df861d38a8c4eb7c634a613532727ec72d3/js-src/Signer.ts#L42)

#### Returns

`Buffer`\<`ArrayBufferLike`\>[]

#### Implementation of

`neon.LocalSigner.certs`

***

### reserveSize()

> **reserveSize**(): `number`

Defined in: [Signer.ts:46](https://github.com/contentauth/c2pa-node-v2/blob/1df68df861d38a8c4eb7c634a613532727ec72d3/js-src/Signer.ts#L46)

#### Returns

`number`

#### Implementation of

`neon.LocalSigner.reserveSize`

***

### sign()

> **sign**(`data`): `Buffer`

Defined in: [Signer.ts:34](https://github.com/contentauth/c2pa-node-v2/blob/1df68df861d38a8c4eb7c634a613532727ec72d3/js-src/Signer.ts#L34)

#### Parameters

##### data

`Buffer`

#### Returns

`Buffer`

#### Implementation of

`neon.LocalSigner.sign`

***

### signer()

> **signer**(): `LocalSigner`

Defined in: [Signer.ts:54](https://github.com/contentauth/c2pa-node-v2/blob/1df68df861d38a8c4eb7c634a613532727ec72d3/js-src/Signer.ts#L54)

#### Returns

`LocalSigner`

#### Implementation of

`neon.LocalSigner.signer`

***

### timeAuthorityUrl()

> **timeAuthorityUrl**(): `undefined` \| `string`

Defined in: [Signer.ts:50](https://github.com/contentauth/c2pa-node-v2/blob/1df68df861d38a8c4eb7c634a613532727ec72d3/js-src/Signer.ts#L50)

#### Returns

`undefined` \| `string`

#### Implementation of

`neon.LocalSigner.timeAuthorityUrl`

***

### newSigner()

> `static` **newSigner**(`certificate`, `privateKey`, `algorithm`, `tsaUrl?`): `LocalSigner`

Defined in: [Signer.ts:19](https://github.com/contentauth/c2pa-node-v2/blob/1df68df861d38a8c4eb7c634a613532727ec72d3/js-src/Signer.ts#L19)

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
