[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / CallbackSigner

# Class: CallbackSigner

Defined in: [Signer.ts:59](https://github.com/contentauth/c2pa-node-v2/blob/92024140271b3589278f2b732abca2c4a33b231a/js-src/Signer.ts#L59)

## Implements

- `CallbackSigner`

## Methods

### alg()

> **alg**(): [`SigningAlg`](../type-aliases/SigningAlg.md)

Defined in: [Signer.ts:80](https://github.com/contentauth/c2pa-node-v2/blob/92024140271b3589278f2b732abca2c4a33b231a/js-src/Signer.ts#L80)

#### Returns

[`SigningAlg`](../type-aliases/SigningAlg.md)

#### Implementation of

`neon.CallbackSigner.alg`

***

### certs()

> **certs**(): `Buffer`\<`ArrayBufferLike`\>[]

Defined in: [Signer.ts:84](https://github.com/contentauth/c2pa-node-v2/blob/92024140271b3589278f2b732abca2c4a33b231a/js-src/Signer.ts#L84)

#### Returns

`Buffer`\<`ArrayBufferLike`\>[]

#### Implementation of

`neon.CallbackSigner.certs`

***

### reserveSize()

> **reserveSize**(): `number`

Defined in: [Signer.ts:88](https://github.com/contentauth/c2pa-node-v2/blob/92024140271b3589278f2b732abca2c4a33b231a/js-src/Signer.ts#L88)

#### Returns

`number`

#### Implementation of

`neon.CallbackSigner.reserveSize`

***

### sign()

> **sign**(`data`): `Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

Defined in: [Signer.ts:76](https://github.com/contentauth/c2pa-node-v2/blob/92024140271b3589278f2b732abca2c4a33b231a/js-src/Signer.ts#L76)

#### Parameters

##### data

`Buffer`

#### Returns

`Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

#### Implementation of

`neon.CallbackSigner.sign`

***

### signer()

> **signer**(): `CallbackSigner`

Defined in: [Signer.ts:62](https://github.com/contentauth/c2pa-node-v2/blob/92024140271b3589278f2b732abca2c4a33b231a/js-src/Signer.ts#L62)

#### Returns

`CallbackSigner`

#### Implementation of

`neon.CallbackSigner.signer`

***

### timeAuthorityUrl()

> **timeAuthorityUrl**(): `undefined` \| `string`

Defined in: [Signer.ts:92](https://github.com/contentauth/c2pa-node-v2/blob/92024140271b3589278f2b732abca2c4a33b231a/js-src/Signer.ts#L92)

#### Returns

`undefined` \| `string`

#### Implementation of

`neon.CallbackSigner.timeAuthorityUrl`

***

### newSigner()

> `static` **newSigner**(`config`, `callback`): `CallbackSigner`

Defined in: [Signer.ts:66](https://github.com/contentauth/c2pa-node-v2/blob/92024140271b3589278f2b732abca2c4a33b231a/js-src/Signer.ts#L66)

#### Parameters

##### config

[`JsCallbackSignerConfig`](../interfaces/JsCallbackSignerConfig.md)

##### callback

(`data`) => `Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

#### Returns

`CallbackSigner`
