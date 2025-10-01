[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / CallbackSigner

# Class: CallbackSigner

Defined in: [Signer.ts:67](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Signer.ts#L67)

A signer that uses a callback to sign data.

## Implements

- [`CallbackSignerInterface`](../interfaces/CallbackSignerInterface.md)

## Constructors

### Constructor

> **new CallbackSigner**(`callbackSigner`): `CallbackSigner`

Defined in: [Signer.ts:68](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Signer.ts#L68)

#### Parameters

##### callbackSigner

`unknown`

#### Returns

`CallbackSigner`

## Methods

### alg()

> **alg**(): [`SigningAlg`](../type-aliases/SigningAlg.md)

Defined in: [Signer.ts:88](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Signer.ts#L88)

#### Returns

[`SigningAlg`](../type-aliases/SigningAlg.md)

#### Implementation of

[`CallbackSignerInterface`](../interfaces/CallbackSignerInterface.md).[`alg`](../interfaces/CallbackSignerInterface.md#alg)

***

### certs()

> **certs**(): `Buffer`\<`ArrayBufferLike`\>[]

Defined in: [Signer.ts:92](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Signer.ts#L92)

#### Returns

`Buffer`\<`ArrayBufferLike`\>[]

#### Implementation of

[`CallbackSignerInterface`](../interfaces/CallbackSignerInterface.md).[`certs`](../interfaces/CallbackSignerInterface.md#certs)

***

### reserveSize()

> **reserveSize**(): `number`

Defined in: [Signer.ts:96](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Signer.ts#L96)

#### Returns

`number`

#### Implementation of

[`CallbackSignerInterface`](../interfaces/CallbackSignerInterface.md).[`reserveSize`](../interfaces/CallbackSignerInterface.md#reservesize)

***

### sign()

> **sign**(`data`): `Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

Defined in: [Signer.ts:84](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Signer.ts#L84)

#### Parameters

##### data

`Buffer`

#### Returns

`Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

#### Implementation of

[`CallbackSignerInterface`](../interfaces/CallbackSignerInterface.md).[`sign`](../interfaces/CallbackSignerInterface.md#sign)

***

### signer()

> **signer**(): `unknown`

Defined in: [Signer.ts:70](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Signer.ts#L70)

#### Returns

`unknown`

#### Implementation of

[`CallbackSignerInterface`](../interfaces/CallbackSignerInterface.md).[`signer`](../interfaces/CallbackSignerInterface.md#signer)

***

### timeAuthorityUrl()

> **timeAuthorityUrl**(): `undefined` \| `string`

Defined in: [Signer.ts:100](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Signer.ts#L100)

#### Returns

`undefined` \| `string`

#### Implementation of

[`CallbackSignerInterface`](../interfaces/CallbackSignerInterface.md).[`timeAuthorityUrl`](../interfaces/CallbackSignerInterface.md#timeauthorityurl)

***

### newSigner()

> `static` **newSigner**(`config`, `callback`): `CallbackSigner`

Defined in: [Signer.ts:74](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Signer.ts#L74)

#### Parameters

##### config

[`JsCallbackSignerConfig`](../interfaces/JsCallbackSignerConfig.md)

##### callback

(`data`) => `Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

#### Returns

`CallbackSigner`
