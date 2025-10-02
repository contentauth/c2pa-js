[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / BuilderInterface

# Interface: BuilderInterface

Defined in: [types.d.ts:175](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L175)

## Methods

### addAssertion()

> **addAssertion**(`label`, `assertion`, `assertionKind?`): `void`

Defined in: [types.d.ts:192](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L192)

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

***

### addIngredient()

> **addIngredient**(`ingredientJson`, `ingredient`): `Promise`\<`void`\>

Defined in: [types.d.ts:209](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L209)

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

Defined in: [types.d.ts:202](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L202)

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

> **getManifestDefinition**(): `Manifest`

Defined in: [types.d.ts:277](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L277)

Getter for the builder's manifest definition

#### Returns

`Manifest`

The manifest definition

***

### setNoEmbed()

> **setNoEmbed**(`noEmbed`): `void`

Defined in: [types.d.ts:180](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L180)

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

Defined in: [types.d.ts:185](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L185)

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

Defined in: [types.d.ts:224](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L224)

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

Defined in: [types.d.ts:254](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L254)

Sign an asset from a buffer or file asynchronously, using a
CallbackSigner

#### Parameters

##### callbackSigner

The CallbackSigner

[`CallbackSignerInterface`](CallbackSignerInterface.md) | [`IdentityAssertionSignerInterface`](IdentityAssertionSignerInterface.md)

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

Defined in: [types.d.ts:239](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L239)

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

Defined in: [types.d.ts:267](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L267)

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

Defined in: [types.d.ts:215](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L215)

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

Defined in: [types.d.ts:283](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L283)

Update a string property of the manifest

#### Parameters

##### property

`string`

##### value

`string` | [`ClaimVersion`](../type-aliases/ClaimVersion.md)

#### Returns

`void`

The manifest definition
