[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / CallbackSigner

# Class: CallbackSigner

Defined in: [Signer.ts:65](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/Signer.ts#L65)

A signer that uses a callback to sign data.

## Implements

- [`CallbackSignerInterface`](../interfaces/CallbackSignerInterface.md)

## Methods

### alg()

> **alg**(): [`SigningAlg`](../type-aliases/SigningAlg.md)

Defined in: [Signer.ts:86](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/Signer.ts#L86)

#### Returns

[`SigningAlg`](../type-aliases/SigningAlg.md)

#### Implementation of

[`CallbackSignerInterface`](../interfaces/CallbackSignerInterface.md).[`alg`](../interfaces/CallbackSignerInterface.md#alg)

***

### certs()

> **certs**(): `Buffer`\<`ArrayBufferLike`\>[]

Defined in: [Signer.ts:90](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/Signer.ts#L90)

#### Returns

`Buffer`\<`ArrayBufferLike`\>[]

#### Implementation of

[`CallbackSignerInterface`](../interfaces/CallbackSignerInterface.md).[`certs`](../interfaces/CallbackSignerInterface.md#certs)

***

### reserveSize()

> **reserveSize**(): `number`

Defined in: [Signer.ts:94](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/Signer.ts#L94)

#### Returns

`number`

#### Implementation of

[`CallbackSignerInterface`](../interfaces/CallbackSignerInterface.md).[`reserveSize`](../interfaces/CallbackSignerInterface.md#reservesize)

***

### sign()

> **sign**(`data`): `Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

Defined in: [Signer.ts:82](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/Signer.ts#L82)

#### Parameters

##### data

`Buffer`

#### Returns

`Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

#### Implementation of

[`CallbackSignerInterface`](../interfaces/CallbackSignerInterface.md).[`sign`](../interfaces/CallbackSignerInterface.md#sign)

***

### signer()

> **signer**(): [`CallbackSignerInterface`](../interfaces/CallbackSignerInterface.md)

Defined in: [Signer.ts:68](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/Signer.ts#L68)

#### Returns

[`CallbackSignerInterface`](../interfaces/CallbackSignerInterface.md)

#### Implementation of

[`CallbackSignerInterface`](../interfaces/CallbackSignerInterface.md).[`signer`](../interfaces/CallbackSignerInterface.md#signer)

***

### timeAuthorityUrl()

> **timeAuthorityUrl**(): `undefined` \| `string`

Defined in: [Signer.ts:98](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/Signer.ts#L98)

#### Returns

`undefined` \| `string`

#### Implementation of

[`CallbackSignerInterface`](../interfaces/CallbackSignerInterface.md).[`timeAuthorityUrl`](../interfaces/CallbackSignerInterface.md#timeauthorityurl)

***

### newSigner()

> `static` **newSigner**(`config`, `callback`): `CallbackSigner`

Defined in: [Signer.ts:72](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/Signer.ts#L72)

#### Parameters

##### config

[`JsCallbackSignerConfig`](../interfaces/JsCallbackSignerConfig.md)

##### callback

(`data`) => `Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

#### Returns

`CallbackSigner`
