[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / Trustmark

# Class: Trustmark

Defined in: [Trustmark.ts:16](https://github.com/contentauth/c2pa-node-v2/blob/8bb2490bb1f0c6c00c0930669451a7750cccfebc/js-src/Trustmark.ts#L16)

## Implements

- `Trustmark`

## Methods

### decode()

> **decode**(`image`): `Promise`\<`string`\>

Defined in: [Trustmark.ts:37](https://github.com/contentauth/c2pa-node-v2/blob/8bb2490bb1f0c6c00c0930669451a7750cccfebc/js-src/Trustmark.ts#L37)

Decode a watermark from an image.

#### Parameters

##### image

`Buffer`

image to extract the watermark from (must be in a supported image format like JPEG, PNG, etc.)

#### Returns

`Promise`\<`string`\>

#### Implementation of

`neon.Trustmark.decode`

***

### encode()

> **encode**(`image`, `strength`, `watermark?`): `Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

Defined in: [Trustmark.ts:24](https://github.com/contentauth/c2pa-node-v2/blob/8bb2490bb1f0c6c00c0930669451a7750cccfebc/js-src/Trustmark.ts#L24)

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

`neon.Trustmark.encode`

***

### newTrustmark()

> `static` **newTrustmark**(`config`): `Promise`\<`Trustmark`\>

Defined in: [Trustmark.ts:19](https://github.com/contentauth/c2pa-node-v2/blob/8bb2490bb1f0c6c00c0930669451a7750cccfebc/js-src/Trustmark.ts#L19)

#### Parameters

##### config

[`TrustmarkConfig`](../interfaces/TrustmarkConfig.md)

#### Returns

`Promise`\<`Trustmark`\>
