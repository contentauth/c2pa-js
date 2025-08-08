[**c2pa-node**](../README.md)

***

[c2pa-node](../README.md) / Reader

# Class: Reader

Defined in: [Reader.ts:16](https://github.com/contentauth/c2pa-node-v2/blob/5303c5fd1e9a72d23f327699b48a7620e901a41c/js-src/Reader.ts#L16)

## Implements

- `Reader`

## Methods

### activeLabel()

> **activeLabel**(): `undefined` \| `string`

Defined in: [Reader.ts:56](https://github.com/contentauth/c2pa-node-v2/blob/5303c5fd1e9a72d23f327699b48a7620e901a41c/js-src/Reader.ts#L56)

#### Returns

`undefined` \| `string`

***

### getActive()

> **getActive**(): `undefined` \| [`Manifest`](../interfaces/Manifest.md)

Defined in: [Reader.ts:61](https://github.com/contentauth/c2pa-node-v2/blob/5303c5fd1e9a72d23f327699b48a7620e901a41c/js-src/Reader.ts#L61)

#### Returns

`undefined` \| [`Manifest`](../interfaces/Manifest.md)

***

### isEmbedded()

> **isEmbedded**(): `boolean`

Defined in: [Reader.ts:27](https://github.com/contentauth/c2pa-node-v2/blob/5303c5fd1e9a72d23f327699b48a7620e901a41c/js-src/Reader.ts#L27)

Returns true if the the reader was created from an embedded manifest

#### Returns

`boolean`

#### Implementation of

`neon.Reader.isEmbedded`

***

### json()

> **json**(): [`ManifestStore`](../interfaces/ManifestStore.md)

Defined in: [Reader.ts:19](https://github.com/contentauth/c2pa-node-v2/blob/5303c5fd1e9a72d23f327699b48a7620e901a41c/js-src/Reader.ts#L19)

Get the JSON representation of the manifest

#### Returns

[`ManifestStore`](../interfaces/ManifestStore.md)

#### Implementation of

`neon.Reader.json`

***

### postValidateCawg()

> **postValidateCawg**(): `Promise`\<`void`\>

Defined in: [Reader.ts:72](https://github.com/contentauth/c2pa-node-v2/blob/5303c5fd1e9a72d23f327699b48a7620e901a41c/js-src/Reader.ts#L72)

Run CAWG validation

#### Returns

`Promise`\<`void`\>

#### Implementation of

`neon.Reader.postValidateCawg`

***

### remoteUrl()

> **remoteUrl**(): `string`

Defined in: [Reader.ts:23](https://github.com/contentauth/c2pa-node-v2/blob/5303c5fd1e9a72d23f327699b48a7620e901a41c/js-src/Reader.ts#L23)

Get the remote url of the manifest if this reader obtained the manifest remotely

#### Returns

`string`

#### Implementation of

`neon.Reader.remoteUrl`

***

### resourceToAsset()

> **resourceToAsset**(`uri`, `asset`): `Promise`\<`number`\>

Defined in: [Reader.ts:31](https://github.com/contentauth/c2pa-node-v2/blob/5303c5fd1e9a72d23f327699b48a7620e901a41c/js-src/Reader.ts#L31)

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

`neon.Reader.resourceToAsset`

***

### fromAsset()

> `static` **fromAsset**(`asset`): `Promise`\<`Reader`\>

Defined in: [Reader.ts:38](https://github.com/contentauth/c2pa-node-v2/blob/5303c5fd1e9a72d23f327699b48a7620e901a41c/js-src/Reader.ts#L38)

#### Parameters

##### asset

[`SourceAsset`](../type-aliases/SourceAsset.md)

#### Returns

`Promise`\<`Reader`\>

***

### fromManifestDataAndAsset()

> `static` **fromManifestDataAndAsset**(`manifestData`, `asset`): `Promise`\<`Reader`\>

Defined in: [Reader.ts:43](https://github.com/contentauth/c2pa-node-v2/blob/5303c5fd1e9a72d23f327699b48a7620e901a41c/js-src/Reader.ts#L43)

#### Parameters

##### manifestData

`Buffer`

##### asset

[`SourceAsset`](../type-aliases/SourceAsset.md)

#### Returns

`Promise`\<`Reader`\>
