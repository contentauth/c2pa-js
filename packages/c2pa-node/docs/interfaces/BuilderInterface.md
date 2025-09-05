[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / BuilderInterface

# Interface: BuilderInterface

Defined in: [types.d.ts:564](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L564)

## Methods

### addAssertion()

> **addAssertion**(`label`, `assertion`, `assertionKind?`): `void`

Defined in: [types.d.ts:580](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L580)

Add CBOR assertion to the builder

#### Parameters

##### label

`string`

The label of the assertion

##### assertion

`string`

The CBOR encoded assertion

##### assertionKind?

[`ManifestAssertionKind`](../type-aliases/ManifestAssertionKind.md)

#### Returns

`void`

***

### addIngredient()

> **addIngredient**(`ingredientJson`, `ingredient`): `Promise`\<`void`\>

Defined in: [types.d.ts:597](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L597)

Add an ingredient from a buffer or file

#### Parameters

##### ingredientJson

`string`

The JSON representation of the ingredient

##### ingredient

[`SourceAsset`](../type-aliases/SourceAsset.md)

The source and format of the ingredient

#### Returns

`Promise`\<`void`\>

***

### addResource()

> **addResource**(`uri`, `resource`): `Promise`\<`void`\>

Defined in: [types.d.ts:590](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L590)

Add a resource from a buffer or file

#### Parameters

##### uri

`string`

The URI of the resource

##### resource

[`SourceAsset`](../type-aliases/SourceAsset.md)

The source and format of the resource

#### Returns

`Promise`\<`void`\>

***

### getManifestDefinition()

> **getManifestDefinition**(): [`ManifestDefinition`](ManifestDefinition.md)

Defined in: [types.d.ts:679](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L679)

Getter for the builder's manifest definition

#### Returns

[`ManifestDefinition`](ManifestDefinition.md)

The manifest definition

***

### identitySignAsync()

> **identitySignAsync**(`callbackSigner`, `input`, `output`): `Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

Defined in: [types.d.ts:669](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L669)

Sign an asset from a buffer or file asynchronously, using an
IdentityAssertionSigner

#### Parameters

##### callbackSigner

[`IdentityAssertionSignerInterface`](IdentityAssertionSignerInterface.md)

##### input

[`SourceAsset`](../type-aliases/SourceAsset.md)

##### output

[`DestinationAsset`](../type-aliases/DestinationAsset.md)

#### Returns

`Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

the bytes of the c2pa_manifest that was embedded

***

### setNoEmbed()

> **setNoEmbed**(`noEmbed`): `void`

Defined in: [types.d.ts:569](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L569)

Set the no embed flag of the manifest

#### Parameters

##### noEmbed

`boolean`

The no embed flag of the manifest

#### Returns

`void`

***

### setRemoteUrl()

> **setRemoteUrl**(`url`): `void`

Defined in: [types.d.ts:574](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L574)

Set the remote URL of the manifest

#### Parameters

##### url

`string`

The remote URL of the manifest

#### Returns

`void`

***

### sign()

> **sign**(`signer`, `input`, `output`): `Buffer`

Defined in: [types.d.ts:612](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L612)

Sign an asset from a buffer or file

#### Parameters

##### signer

[`LocalSignerInterface`](LocalSignerInterface.md)

The local signer to use

##### input

[`SourceAsset`](../type-aliases/SourceAsset.md)

##### output

[`DestinationAsset`](../type-aliases/DestinationAsset.md)

#### Returns

`Buffer`

the bytes of the c2pa_manifest that was embedded

***

### signAsync()

> **signAsync**(`callbackSigner`, `input`, `output`): `Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

Defined in: [types.d.ts:642](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L642)

Sign an asset from a buffer or file asynchronously, using a
CallbackSigner

#### Parameters

##### callbackSigner

[`CallbackSignerInterface`](CallbackSignerInterface.md)

The CallbackSigner

##### input

[`SourceAsset`](../type-aliases/SourceAsset.md)

##### output

[`DestinationAsset`](../type-aliases/DestinationAsset.md)

#### Returns

`Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

the bytes of the c2pa_manifest that was embedded

***

### signConfigAsync()

> **signConfigAsync**(`callback`, `signerConfig`, `input`, `output`): `Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

Defined in: [types.d.ts:627](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L627)

Sign an asset from a buffer or file asynchronously, using a callback
and not passing a private key

#### Parameters

##### callback

(`data`) => `Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

The callback function to sign the asset

##### signerConfig

[`JsCallbackSignerConfig`](JsCallbackSignerConfig.md)

The configuration for the signer

##### input

[`SourceAsset`](../type-aliases/SourceAsset.md)

##### output

[`DestinationAsset`](../type-aliases/DestinationAsset.md)

#### Returns

`Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

the bytes of the c2pa_manifest that was embedded

***

### signFile()

> **signFile**(`signer`, `filePath`, `output`): `Buffer`

Defined in: [types.d.ts:655](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L655)

Embed a signed manifest into a stream using the LocalSigner

#### Parameters

##### signer

[`LocalSignerInterface`](LocalSignerInterface.md)

The local signer to use

##### filePath

`string`

##### output

[`DestinationAsset`](../type-aliases/DestinationAsset.md)

#### Returns

`Buffer`

the bytes of the c2pa_manifest that was embedded

***

### toArchive()

> **toArchive**(`asset`): `Promise`\<`void`\>

Defined in: [types.d.ts:603](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L603)

Convert the Builder into a archive formatted buffer or file

#### Parameters

##### asset

[`DestinationAsset`](../type-aliases/DestinationAsset.md)

The file or buffer for the archive

#### Returns

`Promise`\<`void`\>

***

### updateManifestProperty()

> **updateManifestProperty**(`property`, `value`): `void`

Defined in: [types.d.ts:685](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L685)

Update a string property of the manifest

#### Parameters

##### property

`string`

##### value

`string` | [`ClaimVersion`](../type-aliases/ClaimVersion.md)

#### Returns

`void`

The manifest definition
