[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / Builder

# Class: Builder

Defined in: [Builder.ts:17](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/Builder.ts#L17)

## Implements

- `Builder`

## Methods

### addAssertion()

> **addAssertion**(`label`, `assertion`, `assertionKind?`): `void`

Defined in: [Builder.ts:52](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/Builder.ts#L52)

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

`neon.Builder.addAssertion`

***

### addIngredient()

> **addIngredient**(`ingredientJson`, `ingredient`): `Promise`\<`void`\>

Defined in: [Builder.ts:69](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/Builder.ts#L69)

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

`neon.Builder.addIngredient`

***

### addResource()

> **addResource**(`uri`, `resource`): `Promise`\<`void`\>

Defined in: [Builder.ts:65](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/Builder.ts#L65)

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

`neon.Builder.addResource`

***

### getManifestDefinition()

> **getManifestDefinition**(): [`ManifestDefinition`](../interfaces/ManifestDefinition.md)

Defined in: [Builder.ts:184](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/Builder.ts#L184)

Getter for the builder's manifest definition

#### Returns

[`ManifestDefinition`](../interfaces/ManifestDefinition.md)

The manifest definition

#### Implementation of

`neon.Builder.getManifestDefinition`

***

### identitySignAsync()

> **identitySignAsync**(`signer`, `input`, `output`): `Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

Defined in: [Builder.ts:158](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/Builder.ts#L158)

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

`neon.Builder.identitySignAsync`

***

### setNoEmbed()

> **setNoEmbed**(`noEmbed`): `void`

Defined in: [Builder.ts:44](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/Builder.ts#L44)

Set the no embed flag of the manifest

#### Parameters

##### noEmbed

`boolean` = `true`

The no embed flag of the manifest

#### Returns

`void`

#### Implementation of

`neon.Builder.setNoEmbed`

***

### setRemoteUrl()

> **setRemoteUrl**(`remoteUrl`): `void`

Defined in: [Builder.ts:48](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/Builder.ts#L48)

Set the remote URL of the manifest

#### Parameters

##### remoteUrl

`string`

#### Returns

`void`

#### Implementation of

`neon.Builder.setRemoteUrl`

***

### sign()

> **sign**(`signer`, `input`, `output`): `Buffer`

Defined in: [Builder.ts:88](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/Builder.ts#L88)

Sign an asset from a buffer or file

#### Parameters

##### signer

[`LocalSigner`](LocalSigner.md)

The local signer to use

##### input

[`SourceAsset`](../type-aliases/SourceAsset.md)

##### output

[`DestinationAsset`](../type-aliases/DestinationAsset.md)

#### Returns

`Buffer`

the bytes of the c2pa_manifest that was embedded

#### Implementation of

`neon.Builder.sign`

***

### signAsync()

> **signAsync**(`signer`, `input`, `output`): `Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

Defined in: [Builder.ts:132](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/Builder.ts#L132)

Sign an asset from a buffer or file asynchronously, using a
CallbackSigner

#### Parameters

##### signer

[`CallbackSigner`](CallbackSigner.md)

##### input

[`SourceAsset`](../type-aliases/SourceAsset.md)

##### output

[`DestinationAsset`](../type-aliases/DestinationAsset.md)

#### Returns

`Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

the bytes of the c2pa_manifest that was embedded

#### Implementation of

`neon.Builder.signAsync`

***

### signConfigAsync()

> **signConfigAsync**(`callback`, `signerConfig`, `input`, `output`): `Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

Defined in: [Builder.ts:105](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/Builder.ts#L105)

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

`neon.Builder.signConfigAsync`

***

### signFile()

> **signFile**(`signer`, `filePath`, `output`): `Buffer`

Defined in: [Builder.ts:96](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/Builder.ts#L96)

Embed a signed manifest into a stream using the LocalSigner

#### Parameters

##### signer

[`LocalSigner`](LocalSigner.md)

The local signer to use

##### filePath

`string`

##### output

[`DestinationAsset`](../type-aliases/DestinationAsset.md)

#### Returns

`Buffer`

the bytes of the c2pa_manifest that was embedded

#### Implementation of

`neon.Builder.signFile`

***

### toArchive()

> **toArchive**(`asset`): `Promise`\<`void`\>

Defined in: [Builder.ts:80](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/Builder.ts#L80)

Convert the Builder into a archive formatted buffer or file

#### Parameters

##### asset

[`DestinationAsset`](../type-aliases/DestinationAsset.md)

The file or buffer for the archive

#### Returns

`Promise`\<`void`\>

#### Implementation of

`neon.Builder.toArchive`

***

### updateManifestProperty()

> **updateManifestProperty**(`property`, `value`): `void`

Defined in: [Builder.ts:188](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/Builder.ts#L188)

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

`neon.Builder.updateManifestProperty`

***

### fromArchive()

> `static` **fromArchive**(`asset`): `Promise`\<`Builder`\>

Defined in: [Builder.ts:84](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/Builder.ts#L84)

#### Parameters

##### asset

[`SourceAsset`](../type-aliases/SourceAsset.md)

#### Returns

`Promise`\<`Builder`\>

***

### new()

> `static` **new**(): `Builder`

Defined in: [Builder.ts:20](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/Builder.ts#L20)

#### Returns

`Builder`

***

### withJson()

> `static` **withJson**(`json`): `Builder`

Defined in: [Builder.ts:25](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/Builder.ts#L25)

#### Parameters

##### json

[`ManifestDefinition`](../interfaces/ManifestDefinition.md)

#### Returns

`Builder`
