[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / TrustmarkInterface

# Interface: TrustmarkInterface

Defined in: [types.d.ts:750](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L750)

## Methods

### decode()

> **decode**(`image`): `Promise`\<`string`\>

Defined in: [types.d.ts:764](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L764)

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

Defined in: [types.d.ts:758](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L758)

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
