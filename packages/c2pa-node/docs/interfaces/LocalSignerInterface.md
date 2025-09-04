[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / LocalSignerInterface

# Interface: LocalSignerInterface

Defined in: [types.d.ts:524](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L524)

A signer that uses a local certificate and private key to sign data

## Methods

### alg()

> **alg**(): [`SigningAlg`](../type-aliases/SigningAlg.md)

Defined in: [types.d.ts:526](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L526)

#### Returns

[`SigningAlg`](../type-aliases/SigningAlg.md)

***

### certs()

> **certs**(): `Buffer`\<`ArrayBufferLike`\>[]

Defined in: [types.d.ts:527](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L527)

#### Returns

`Buffer`\<`ArrayBufferLike`\>[]

***

### reserveSize()

> **reserveSize**(): `number`

Defined in: [types.d.ts:528](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L528)

#### Returns

`number`

***

### sign()

> **sign**(`data`): `Buffer`

Defined in: [types.d.ts:525](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L525)

#### Parameters

##### data

`Buffer`

#### Returns

`Buffer`

***

### signer()

> **signer**(): `LocalSignerInterface`

Defined in: [types.d.ts:530](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L530)

#### Returns

`LocalSignerInterface`

***

### timeAuthorityUrl()

> **timeAuthorityUrl**(): `undefined` \| `string`

Defined in: [types.d.ts:529](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L529)

#### Returns

`undefined` \| `string`
