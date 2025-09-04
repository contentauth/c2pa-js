[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / ReaderInterface

# Interface: ReaderInterface

Defined in: [types.d.ts:688](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L688)

## Methods

### isEmbedded()

> **isEmbedded**(): `boolean`

Defined in: [types.d.ts:702](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L702)

Returns true if the the reader was created from an embedded manifest

#### Returns

`boolean`

***

### json()

> **json**(): [`ManifestStore`](ManifestStore.md)

Defined in: [types.d.ts:692](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L692)

Get the JSON representation of the manifest

#### Returns

[`ManifestStore`](ManifestStore.md)

***

### postValidateCawg()

> **postValidateCawg**(): `Promise`\<`void`\>

Defined in: [types.d.ts:714](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L714)

Run CAWG validation

#### Returns

`Promise`\<`void`\>

***

### remoteUrl()

> **remoteUrl**(): `string`

Defined in: [types.d.ts:697](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L697)

Get the remote url of the manifest if this reader obtained the manifest remotely

#### Returns

`string`

***

### resourceToAsset()

> **resourceToAsset**(`uri`, `output`): `Promise`\<`number`\>

Defined in: [types.d.ts:709](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L709)

Write a resource to a buffer or file

#### Parameters

##### uri

`string`

The URI of the resource

##### output

[`DestinationAsset`](../type-aliases/DestinationAsset.md)

#### Returns

`Promise`\<`number`\>
