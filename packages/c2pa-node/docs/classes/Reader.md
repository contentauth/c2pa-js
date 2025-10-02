[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / Reader

# Class: Reader

Defined in: [Reader.ts:24](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Reader.ts#L24)

## Implements

- [`ReaderInterface`](../interfaces/ReaderInterface.md)

## Constructors

### Constructor

> **new Reader**(`reader`): `Reader`

Defined in: [Reader.ts:25](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Reader.ts#L25)

#### Parameters

##### reader

`unknown`

#### Returns

`Reader`

## Methods

### activeLabel()

> **activeLabel**(): `undefined` \| `string`

Defined in: [Reader.ts:61](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Reader.ts#L61)

#### Returns

`undefined` \| `string`

***

### getActive()

> **getActive**(): `undefined` \| `Manifest`

Defined in: [Reader.ts:66](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Reader.ts#L66)

#### Returns

`undefined` \| `Manifest`

***

### isEmbedded()

> **isEmbedded**(): `boolean`

Defined in: [Reader.ts:35](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Reader.ts#L35)

Returns true if the the reader was created from an embedded manifest

#### Returns

`boolean`

#### Implementation of

[`ReaderInterface`](../interfaces/ReaderInterface.md).[`isEmbedded`](../interfaces/ReaderInterface.md#isembedded)

***

### json()

> **json**(): `ManifestStore`

Defined in: [Reader.ts:27](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Reader.ts#L27)

Get the JSON representation of the manifest

#### Returns

`ManifestStore`

#### Implementation of

[`ReaderInterface`](../interfaces/ReaderInterface.md).[`json`](../interfaces/ReaderInterface.md#json)

***

### postValidateCawg()

> **postValidateCawg**(): `Promise`\<`void`\>

Defined in: [Reader.ts:77](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Reader.ts#L77)

Run CAWG validation

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`ReaderInterface`](../interfaces/ReaderInterface.md).[`postValidateCawg`](../interfaces/ReaderInterface.md#postvalidatecawg)

***

### remoteUrl()

> **remoteUrl**(): `string`

Defined in: [Reader.ts:31](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Reader.ts#L31)

Get the remote url of the manifest if this reader obtained the manifest remotely

#### Returns

`string`

#### Implementation of

[`ReaderInterface`](../interfaces/ReaderInterface.md).[`remoteUrl`](../interfaces/ReaderInterface.md#remoteurl)

***

### resourceToAsset()

> **resourceToAsset**(`uri`, `asset`): `Promise`\<`number`\>

Defined in: [Reader.ts:39](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Reader.ts#L39)

Write a resource to a buffer or file

#### Parameters

##### uri

`string`

The URI of the resource

##### asset

[`DestinationAsset`](../type-aliases/DestinationAsset.md)

#### Returns

`Promise`\<`number`\>

#### Implementation of

[`ReaderInterface`](../interfaces/ReaderInterface.md).[`resourceToAsset`](../interfaces/ReaderInterface.md#resourcetoasset)

***

### fromAsset()

> `static` **fromAsset**(`asset`): `Promise`\<`Reader`\>

Defined in: [Reader.ts:43](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Reader.ts#L43)

#### Parameters

##### asset

[`SourceAsset`](../type-aliases/SourceAsset.md)

#### Returns

`Promise`\<`Reader`\>

***

### fromManifestDataAndAsset()

> `static` **fromManifestDataAndAsset**(`manifestData`, `asset`): `Promise`\<`Reader`\>

Defined in: [Reader.ts:48](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Reader.ts#L48)

#### Parameters

##### manifestData

`Buffer`

##### asset

[`SourceAsset`](../type-aliases/SourceAsset.md)

#### Returns

`Promise`\<`Reader`\>
