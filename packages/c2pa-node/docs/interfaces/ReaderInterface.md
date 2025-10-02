[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / ReaderInterface

# Interface: ReaderInterface

Defined in: [types.d.ts:286](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L286)

## Methods

### isEmbedded()

> **isEmbedded**(): `boolean`

Defined in: [types.d.ts:300](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L300)

Returns true if the the reader was created from an embedded manifest

#### Returns

`boolean`

***

### json()

> **json**(): `ManifestStore`

Defined in: [types.d.ts:290](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L290)

Get the JSON representation of the manifest

#### Returns

`ManifestStore`

***

### postValidateCawg()

> **postValidateCawg**(): `Promise`\<`void`\>

Defined in: [types.d.ts:312](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L312)

Run CAWG validation

#### Returns

`Promise`\<`void`\>

***

### remoteUrl()

> **remoteUrl**(): `string`

Defined in: [types.d.ts:295](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L295)

Get the remote url of the manifest if this reader obtained the manifest remotely

#### Returns

`string`

***

### resourceToAsset()

> **resourceToAsset**(`uri`, `output`): `Promise`\<`number`\>

Defined in: [types.d.ts:307](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L307)

Write a resource to a buffer or file

#### Parameters

##### uri

`string`

The URI of the resource

##### output

[`DestinationAsset`](../type-aliases/DestinationAsset.md)

#### Returns

`Promise`\<`number`\>
