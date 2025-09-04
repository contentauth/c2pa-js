[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / Builder

# Class: Builder

Defined in: [Builder.ts:29](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/Builder.ts#L29)

## Implements

- [`BuilderInterface`](../interfaces/BuilderInterface.md)

## Methods

### addAssertion()

> **addAssertion**(`label`, `assertion`, `assertionKind?`): `void`

Defined in: [Builder.ts:64](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/Builder.ts#L64)

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

#### Implementation of

[`BuilderInterface`](../interfaces/BuilderInterface.md).[`addAssertion`](../interfaces/BuilderInterface.md#addassertion)

***

### addIngredient()

> **addIngredient**(`ingredientJson`, `ingredient`): `Promise`\<`void`\>

Defined in: [Builder.ts:81](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/Builder.ts#L81)

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

Defined in: [Builder.ts:77](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/Builder.ts#L77)

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

> **getManifestDefinition**(): [`ManifestDefinition`](../interfaces/ManifestDefinition.md)

Defined in: [Builder.ts:196](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/Builder.ts#L196)

Getter for the builder's manifest definition

#### Returns

[`ManifestDefinition`](../interfaces/ManifestDefinition.md)

The manifest definition

#### Implementation of

[`BuilderInterface`](../interfaces/BuilderInterface.md).[`getManifestDefinition`](../interfaces/BuilderInterface.md#getmanifestdefinition)

***

### identitySignAsync()

> **identitySignAsync**(`signer`, `input`, `output`): `Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

Defined in: [Builder.ts:170](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/Builder.ts#L170)

Sign an asset from a buffer or file asynchronously, using an
IdentityAssertionSigner

#### Parameters

##### signer

[`IdentityAssertionSigner`](IdentityAssertionSigner.md)

The IdentityAssertionSigner

##### input

[`SourceAsset`](../type-aliases/SourceAsset.md)

##### output

[`DestinationAsset`](../type-aliases/DestinationAsset.md)

#### Returns

`Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

the bytes of the c2pa_manifest that was embedded

#### Implementation of

[`BuilderInterface`](../interfaces/BuilderInterface.md).[`identitySignAsync`](../interfaces/BuilderInterface.md#identitysignasync)

***

### setNoEmbed()

> **setNoEmbed**(`noEmbed`): `void`

Defined in: [Builder.ts:56](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/Builder.ts#L56)

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

Defined in: [Builder.ts:60](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/Builder.ts#L60)

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

Defined in: [Builder.ts:100](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/Builder.ts#L100)

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

Defined in: [Builder.ts:144](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/Builder.ts#L144)

Sign an asset from a buffer or file asynchronously, using a
CallbackSigner

#### Parameters

##### signer

[`CallbackSignerInterface`](../interfaces/CallbackSignerInterface.md)

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

Defined in: [Builder.ts:117](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/Builder.ts#L117)

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

Defined in: [Builder.ts:108](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/Builder.ts#L108)

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

Defined in: [Builder.ts:92](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/Builder.ts#L92)

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

Defined in: [Builder.ts:200](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/Builder.ts#L200)

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

Defined in: [Builder.ts:96](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/Builder.ts#L96)

#### Parameters

##### asset

[`SourceAsset`](../type-aliases/SourceAsset.md)

#### Returns

`Promise`\<`Builder`\>

***

### new()

> `static` **new**(): `Builder`

Defined in: [Builder.ts:32](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/Builder.ts#L32)

#### Returns

`Builder`

***

### withJson()

> `static` **withJson**(`json`): `Builder`

Defined in: [Builder.ts:37](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/Builder.ts#L37)

#### Parameters

##### json

[`ManifestDefinition`](../interfaces/ManifestDefinition.md)

#### Returns

`Builder`
