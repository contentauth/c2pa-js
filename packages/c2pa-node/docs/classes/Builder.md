[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / Builder

# Class: Builder

Defined in: [Builder.ts:31](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Builder.ts#L31)

## Implements

- [`BuilderInterface`](../interfaces/BuilderInterface.md)

## Methods

### addAssertion()

> **addAssertion**(`label`, `assertion`, `assertionKind?`): `void`

Defined in: [Builder.ts:66](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Builder.ts#L66)

Add CBOR assertion to the builder

#### Parameters

##### label

`string`

The label of the assertion

##### assertion

`unknown`

The assertion, should be a string if the type is JSON, otherwise a JS Object

##### assertionKind?

[`ManifestAssertionKind`](../type-aliases/ManifestAssertionKind.md)

The type of assertion

#### Returns

`void`

#### Implementation of

[`BuilderInterface`](../interfaces/BuilderInterface.md).[`addAssertion`](../interfaces/BuilderInterface.md#addassertion)

***

### addIngredient()

> **addIngredient**(`ingredientJson`, `ingredient`): `Promise`\<`void`\>

Defined in: [Builder.ts:83](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Builder.ts#L83)

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

#### Implementation of

[`BuilderInterface`](../interfaces/BuilderInterface.md).[`addIngredient`](../interfaces/BuilderInterface.md#addingredient)

***

### addResource()

> **addResource**(`uri`, `resource`): `Promise`\<`void`\>

Defined in: [Builder.ts:79](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Builder.ts#L79)

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

#### Implementation of

[`BuilderInterface`](../interfaces/BuilderInterface.md).[`addResource`](../interfaces/BuilderInterface.md#addresource)

***

### getManifestDefinition()

> **getManifestDefinition**(): `Manifest`

Defined in: [Builder.ts:177](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Builder.ts#L177)

Getter for the builder's manifest definition

#### Returns

`Manifest`

The manifest definition

#### Implementation of

[`BuilderInterface`](../interfaces/BuilderInterface.md).[`getManifestDefinition`](../interfaces/BuilderInterface.md#getmanifestdefinition)

***

### setNoEmbed()

> **setNoEmbed**(`noEmbed`): `void`

Defined in: [Builder.ts:58](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Builder.ts#L58)

Set the no embed flag of the manifest

#### Parameters

##### noEmbed

`boolean` = `true`

The no embed flag of the manifest

#### Returns

`void`

#### Implementation of

[`BuilderInterface`](../interfaces/BuilderInterface.md).[`setNoEmbed`](../interfaces/BuilderInterface.md#setnoembed)

***

### setRemoteUrl()

> **setRemoteUrl**(`remoteUrl`): `void`

Defined in: [Builder.ts:62](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Builder.ts#L62)

Set the remote URL of the manifest

#### Parameters

##### remoteUrl

`string`

#### Returns

`void`

#### Implementation of

[`BuilderInterface`](../interfaces/BuilderInterface.md).[`setRemoteUrl`](../interfaces/BuilderInterface.md#setremoteurl)

***

### sign()

> **sign**(`signer`, `input`, `output`): `Buffer`

Defined in: [Builder.ts:102](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Builder.ts#L102)

Sign an asset from a buffer or file

#### Parameters

##### signer

[`LocalSignerInterface`](../interfaces/LocalSignerInterface.md)

The local signer to use

##### input

[`SourceAsset`](../type-aliases/SourceAsset.md)

##### output

[`DestinationAsset`](../type-aliases/DestinationAsset.md)

#### Returns

`Buffer`

the bytes of the c2pa_manifest that was embedded

#### Implementation of

[`BuilderInterface`](../interfaces/BuilderInterface.md).[`sign`](../interfaces/BuilderInterface.md#sign)

***

### signAsync()

> **signAsync**(`signer`, `input`, `output`): `Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

Defined in: [Builder.ts:146](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Builder.ts#L146)

Sign an asset from a buffer or file asynchronously, using a
CallbackSigner

#### Parameters

##### signer

[`CallbackSignerInterface`](../interfaces/CallbackSignerInterface.md) | [`IdentityAssertionSignerInterface`](../interfaces/IdentityAssertionSignerInterface.md)

##### input

[`SourceAsset`](../type-aliases/SourceAsset.md)

##### output

[`DestinationAsset`](../type-aliases/DestinationAsset.md)

#### Returns

`Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

the bytes of the c2pa_manifest that was embedded

#### Implementation of

[`BuilderInterface`](../interfaces/BuilderInterface.md).[`signAsync`](../interfaces/BuilderInterface.md#signasync)

***

### signConfigAsync()

> **signConfigAsync**(`callback`, `signerConfig`, `input`, `output`): `Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

Defined in: [Builder.ts:119](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Builder.ts#L119)

Sign an asset from a buffer or file asynchronously, using a callback
and not passing a private key

#### Parameters

##### callback

(`data`) => `Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

The callback function to sign the asset

##### signerConfig

[`JsCallbackSignerConfig`](../interfaces/JsCallbackSignerConfig.md)

The configuration for the signer

##### input

[`SourceAsset`](../type-aliases/SourceAsset.md)

##### output

[`DestinationAsset`](../type-aliases/DestinationAsset.md)

#### Returns

`Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

the bytes of the c2pa_manifest that was embedded

#### Implementation of

[`BuilderInterface`](../interfaces/BuilderInterface.md).[`signConfigAsync`](../interfaces/BuilderInterface.md#signconfigasync)

***

### signFile()

> **signFile**(`signer`, `filePath`, `output`): `Buffer`

Defined in: [Builder.ts:110](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Builder.ts#L110)

Embed a signed manifest into a stream using the LocalSigner

#### Parameters

##### signer

[`LocalSignerInterface`](../interfaces/LocalSignerInterface.md)

The local signer to use

##### filePath

`string`

##### output

[`DestinationAsset`](../type-aliases/DestinationAsset.md)

#### Returns

`Buffer`

the bytes of the c2pa_manifest that was embedded

#### Implementation of

[`BuilderInterface`](../interfaces/BuilderInterface.md).[`signFile`](../interfaces/BuilderInterface.md#signfile)

***

### toArchive()

> **toArchive**(`asset`): `Promise`\<`void`\>

Defined in: [Builder.ts:94](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Builder.ts#L94)

Convert the Builder into a archive formatted buffer or file

#### Parameters

##### asset

[`DestinationAsset`](../type-aliases/DestinationAsset.md)

The file or buffer for the archive

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`BuilderInterface`](../interfaces/BuilderInterface.md).[`toArchive`](../interfaces/BuilderInterface.md#toarchive)

***

### updateManifestProperty()

> **updateManifestProperty**(`property`, `value`): `void`

Defined in: [Builder.ts:181](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Builder.ts#L181)

Update a string property of the manifest

#### Parameters

##### property

`string`

##### value

[`ClaimVersion`](../type-aliases/ClaimVersion.md)

#### Returns

`void`

The manifest definition

#### Implementation of

[`BuilderInterface`](../interfaces/BuilderInterface.md).[`updateManifestProperty`](../interfaces/BuilderInterface.md#updatemanifestproperty)

***

### fromArchive()

> `static` **fromArchive**(`asset`): `Promise`\<`Builder`\>

Defined in: [Builder.ts:98](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Builder.ts#L98)

#### Parameters

##### asset

[`SourceAsset`](../type-aliases/SourceAsset.md)

#### Returns

`Promise`\<`Builder`\>

***

### new()

> `static` **new**(): `Builder`

Defined in: [Builder.ts:34](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Builder.ts#L34)

#### Returns

`Builder`

***

### withJson()

> `static` **withJson**(`json`): `Builder`

Defined in: [Builder.ts:39](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Builder.ts#L39)

#### Parameters

##### json

`Manifest`

#### Returns

`Builder`
