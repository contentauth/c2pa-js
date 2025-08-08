[**c2pa-node**](../README.md)

***

[c2pa-node](../README.md) / builderSignConfigAsync

# Function: builderSignConfigAsync()

> **builderSignConfigAsync**(`callback`, `signerConfig`, `input`, `output`): `Promise`\<`Buffer`\<`ArrayBufferLike`\> \| \{ `manifest`: `Buffer`; `signedAsset`: `Buffer`; \}\>

Defined in: [types.d.ts:760](https://github.com/contentauth/c2pa-node-v2/blob/5303c5fd1e9a72d23f327699b48a7620e901a41c/js-src/types.d.ts#L760)

## Parameters

### callback

(`data`) => `Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

### signerConfig

[`JsCallbackSignerConfig`](../interfaces/JsCallbackSignerConfig.md)

### input

[`SourceAsset`](../type-aliases/SourceAsset.md)

### output

[`DestinationAsset`](../type-aliases/DestinationAsset.md)

## Returns

`Promise`\<`Buffer`\<`ArrayBufferLike`\> \| \{ `manifest`: `Buffer`; `signedAsset`: `Buffer`; \}\>
