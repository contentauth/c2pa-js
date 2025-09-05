[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / Manifest

# Interface: Manifest

Defined in: [types.d.ts:87](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L87)

A Manifest represents all the information in a c2pa manifest

## Indexable

\[`k`: `string`\]: `unknown`

## Properties

### assertions?

> `optional` **assertions**: [`ManifestAssertion`](ManifestAssertion.md)[]

Defined in: [types.d.ts:91](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L91)

A list of assertions

***

### claim\_generator?

> `optional` **claim\_generator**: `string`

Defined in: [types.d.ts:95](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L95)

A User Agent formatted string identifying the software/hardware/system produced this claim Spaces are not allowed in names, versions can be specified with product/1.0 syntax

***

### claim\_generator\_hints?

> `optional` **claim\_generator\_hints**: `object`

Defined in: [types.d.ts:96](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L96)

#### Index Signature

\[`k`: `string`\]: `unknown`

***

### claim\_generator\_info?

> `optional` **claim\_generator\_info**: [`ClaimGeneratorInfo`](ClaimGeneratorInfo.md)[]

Defined in: [types.d.ts:104](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L104)

A list of claim generator info data identifying the software/hardware/system produced this claim

***

### credentials?

> `optional` **credentials**: `unknown`[]

Defined in: [types.d.ts:108](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L108)

A List of verified credentials

***

### format?

> `optional` **format**: `string`

Defined in: [types.d.ts:112](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L112)

The format of the source file as a MIME type

***

### ingredients?

> `optional` **ingredients**: [`Ingredient`](Ingredient.md)[]

Defined in: [types.d.ts:116](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L116)

A List of ingredients

***

### instance\_id?

> `optional` **instance\_id**: `string`

Defined in: [types.d.ts:120](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L120)

Instance ID from `xmpMM:InstanceID` in XMP metadata

***

### label?

> `optional` **label**: `string`

Defined in: [types.d.ts:121](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L121)

***

### redactions?

> `optional` **redactions**: `string`[]

Defined in: [types.d.ts:125](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L125)

A list of redactions - URIs to a redacted assertions

***

### resources?

> `optional` **resources**: [`ResourceStore`](ResourceStore.md)

Defined in: [types.d.ts:129](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L129)

container for binary assets (like thumbnails)

***

### signature\_info?

> `optional` **signature\_info**: [`SignatureInfo`](SignatureInfo.md)

Defined in: [types.d.ts:133](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L133)

Signature data (only used for reporting)

***

### thumbnail?

> `optional` **thumbnail**: [`ResourceRef`](ResourceRef.md)

Defined in: [types.d.ts:134](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L134)

***

### title?

> `optional` **title**: `string`

Defined in: [types.d.ts:138](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L138)

A human-readable title, generally source filename

***

### vendor?

> `optional` **vendor**: `string`

Defined in: [types.d.ts:142](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L142)

Optional prefix added to the generated Manifest Label This is typically Internet domain name for the vendor (i.e. `adobe`)
