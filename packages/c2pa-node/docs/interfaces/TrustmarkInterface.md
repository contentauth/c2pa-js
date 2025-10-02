[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / TrustmarkInterface

# Interface: TrustmarkInterface

Defined in: [types.d.ts:350](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L350)

## Methods

### decode()

> **decode**(`image`): `Promise`\<`string`\>

Defined in: [types.d.ts:364](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L364)

Decode a watermark from an image.

#### Parameters

##### image

`Buffer`

image to extract the watermark from (must be in a supported image format like JPEG, PNG, etc.)

#### Returns

`Promise`\<`string`\>

***

### encode()

> **encode**(`image`, `strength`, `watermark?`): `Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

Defined in: [types.d.ts:358](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L358)

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
