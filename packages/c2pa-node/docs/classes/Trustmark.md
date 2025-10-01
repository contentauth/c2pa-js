[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / Trustmark

# Class: Trustmark

Defined in: [Trustmark.ts:21](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Trustmark.ts#L21)

## Implements

- [`TrustmarkInterface`](../interfaces/TrustmarkInterface.md)

## Constructors

### Constructor

> **new Trustmark**(`trustmark`): `Trustmark`

Defined in: [Trustmark.ts:22](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Trustmark.ts#L22)

#### Parameters

##### trustmark

`unknown`

#### Returns

`Trustmark`

## Methods

### decode()

> **decode**(`image`): `Promise`\<`string`\>

Defined in: [Trustmark.ts:42](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Trustmark.ts#L42)

Decode a watermark from an image.

#### Parameters

##### image

`Buffer`

image to extract the watermark from (must be in a supported image format like JPEG, PNG, etc.)

#### Returns

`Promise`\<`string`\>

#### Implementation of

[`TrustmarkInterface`](../interfaces/TrustmarkInterface.md).[`decode`](../interfaces/TrustmarkInterface.md#decode)

***

### encode()

> **encode**(`image`, `strength`, `watermark?`): `Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

Defined in: [Trustmark.ts:29](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Trustmark.ts#L29)

Encode a watermark into an image.

#### Parameters

##### image

`Buffer`

image to be watermarked

##### strength

`number`

number between 0 and 1 indicating how strongly the watermark should be applied

##### watermark?

`string`

optional bitstring to be encoded, automatically generated if not provided

#### Returns

`Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

raw pixel data in RGB8 format (width * height * 3 bytes)

#### Implementation of

[`TrustmarkInterface`](../interfaces/TrustmarkInterface.md).[`encode`](../interfaces/TrustmarkInterface.md#encode)

***

### newTrustmark()

> `static` **newTrustmark**(`config`): `Promise`\<`Trustmark`\>

Defined in: [Trustmark.ts:24](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Trustmark.ts#L24)

#### Parameters

##### config

[`TrustmarkConfig`](../interfaces/TrustmarkConfig.md)

#### Returns

`Promise`\<`Trustmark`\>
