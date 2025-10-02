[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / CallbackSignerInterface

# Interface: CallbackSignerInterface

Defined in: [types.d.ts:115](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L115)

A signer that uses a callback to sign data.

## Methods

### alg()

> **alg**(): [`SigningAlg`](../type-aliases/SigningAlg.md)

Defined in: [types.d.ts:117](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L117)

#### Returns

[`SigningAlg`](../type-aliases/SigningAlg.md)

***

### certs()

> **certs**(): `Buffer`\<`ArrayBufferLike`\>[]

Defined in: [types.d.ts:118](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L118)

#### Returns

`Buffer`\<`ArrayBufferLike`\>[]

***

### reserveSize()

> **reserveSize**(): `number`

Defined in: [types.d.ts:119](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L119)

#### Returns

`number`

***

### sign()

> **sign**(`data`): `Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

Defined in: [types.d.ts:116](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L116)

#### Parameters

##### data

`Buffer`

#### Returns

`Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

***

### signer()

> **signer**(): `unknown`

Defined in: [types.d.ts:121](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L121)

#### Returns

`unknown`

***

### timeAuthorityUrl()

> **timeAuthorityUrl**(): `undefined` \| `string`

Defined in: [types.d.ts:120](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L120)

#### Returns

`undefined` \| `string`
