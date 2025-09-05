[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / CallbackSignerInterface

# Interface: CallbackSignerInterface

Defined in: [types.d.ts:536](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L536)

A signer that uses a callback to sign data.

## Methods

### alg()

> **alg**(): [`SigningAlg`](../type-aliases/SigningAlg.md)

Defined in: [types.d.ts:538](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L538)

#### Returns

[`SigningAlg`](../type-aliases/SigningAlg.md)

***

### certs()

> **certs**(): `Buffer`\<`ArrayBufferLike`\>[]

Defined in: [types.d.ts:539](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L539)

#### Returns

`Buffer`\<`ArrayBufferLike`\>[]

***

### reserveSize()

> **reserveSize**(): `number`

Defined in: [types.d.ts:540](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L540)

#### Returns

`number`

***

### sign()

> **sign**(`data`): `Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

Defined in: [types.d.ts:537](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L537)

#### Parameters

##### data

`Buffer`

#### Returns

`Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

***

### signer()

> **signer**(): `CallbackSignerInterface`

Defined in: [types.d.ts:542](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L542)

#### Returns

`CallbackSignerInterface`

***

### timeAuthorityUrl()

> **timeAuthorityUrl**(): `undefined` \| `string`

Defined in: [types.d.ts:541](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L541)

#### Returns

`undefined` \| `string`
