[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / CallbackCredentialHolderInterface

# Interface: CallbackCredentialHolderInterface

Defined in: [types.d.ts:124](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L124)

## Methods

### reserveSize()

> **reserveSize**(): `number`

Defined in: [types.d.ts:126](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L126)

#### Returns

`number`

***

### sign()

> **sign**(`payload`): `Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

Defined in: [types.d.ts:127](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L127)

#### Parameters

##### payload

[`SignerPayload`](SignerPayload.md)

#### Returns

`Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

***

### signer()

> **signer**(): `unknown`

Defined in: [types.d.ts:128](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L128)

#### Returns

`unknown`

***

### sigType()

> **sigType**(): `string`

Defined in: [types.d.ts:125](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L125)

#### Returns

`string`
