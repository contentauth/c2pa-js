[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / LocalSignerInterface

# Interface: LocalSignerInterface

Defined in: [types.d.ts:103](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L103)

A signer that uses a local certificate and private key to sign data

## Methods

### alg()

> **alg**(): [`SigningAlg`](../type-aliases/SigningAlg.md)

Defined in: [types.d.ts:105](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L105)

#### Returns

[`SigningAlg`](../type-aliases/SigningAlg.md)

***

### certs()

> **certs**(): `Buffer`\<`ArrayBufferLike`\>[]

Defined in: [types.d.ts:106](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L106)

#### Returns

`Buffer`\<`ArrayBufferLike`\>[]

***

### reserveSize()

> **reserveSize**(): `number`

Defined in: [types.d.ts:107](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L107)

#### Returns

`number`

***

### sign()

> **sign**(`data`): `Buffer`

Defined in: [types.d.ts:104](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L104)

#### Parameters

##### data

`Buffer`

#### Returns

`Buffer`

***

### signer()

> **signer**(): `unknown`

Defined in: [types.d.ts:109](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L109)

#### Returns

`unknown`

***

### timeAuthorityUrl()

> **timeAuthorityUrl**(): `undefined` \| `string`

Defined in: [types.d.ts:108](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L108)

#### Returns

`undefined` \| `string`
