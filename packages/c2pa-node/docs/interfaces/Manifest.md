[**c2pa-node**](../README.md)

***

[c2pa-node](../README.md) / Manifest

# Interface: Manifest

Defined in: [types.d.ts:66](https://github.com/contentauth/c2pa-node-v2/blob/5303c5fd1e9a72d23f327699b48a7620e901a41c/js-src/types.d.ts#L66)

A Manifest represents all the information in a c2pa manifest

## Indexable

\[`k`: `string`\]: `unknown`

## Properties

### assertions?

> `optional` **assertions**: [`ManifestAssertion`](ManifestAssertion.md)[]

Defined in: [types.d.ts:70](https://github.com/contentauth/c2pa-node-v2/blob/5303c5fd1e9a72d23f327699b48a7620e901a41c/js-src/types.d.ts#L70)

A list of assertions

***

### claim\_generator?

> `optional` **claim\_generator**: `string`

Defined in: [types.d.ts:74](https://github.com/contentauth/c2pa-node-v2/blob/5303c5fd1e9a72d23f327699b48a7620e901a41c/js-src/types.d.ts#L74)

A User Agent formatted string identifying the software/hardware/system produced this claim Spaces are not allowed in names, versions can be specified with product/1.0 syntax

***

### claim\_generator\_hints?

> `optional` **claim\_generator\_hints**: `object`

Defined in: [types.d.ts:75](https://github.com/contentauth/c2pa-node-v2/blob/5303c5fd1e9a72d23f327699b48a7620e901a41c/js-src/types.d.ts#L75)

#### Index Signature

\[`k`: `string`\]: `unknown`

***

### claim\_generator\_info?

> `optional` **claim\_generator\_info**: [`ClaimGeneratorInfo`](ClaimGeneratorInfo.md)[]

Defined in: [types.d.ts:83](https://github.com/contentauth/c2pa-node-v2/blob/5303c5fd1e9a72d23f327699b48a7620e901a41c/js-src/types.d.ts#L83)

A list of claim generator info data identifying the software/hardware/system produced this claim

***

### credentials?

> `optional` **credentials**: `unknown`[]

Defined in: [types.d.ts:87](https://github.com/contentauth/c2pa-node-v2/blob/5303c5fd1e9a72d23f327699b48a7620e901a41c/js-src/types.d.ts#L87)

A List of verified credentials

***

### format?

> `optional` **format**: `string`

Defined in: [types.d.ts:91](https://github.com/contentauth/c2pa-node-v2/blob/5303c5fd1e9a72d23f327699b48a7620e901a41c/js-src/types.d.ts#L91)

The format of the source file as a MIME type

***

### ingredients?

> `optional` **ingredients**: [`Ingredient`](Ingredient.md)[]

Defined in: [types.d.ts:95](https://github.com/contentauth/c2pa-node-v2/blob/5303c5fd1e9a72d23f327699b48a7620e901a41c/js-src/types.d.ts#L95)

A List of ingredients

***

### instance\_id?

> `optional` **instance\_id**: `string`

Defined in: [types.d.ts:99](https://github.com/contentauth/c2pa-node-v2/blob/5303c5fd1e9a72d23f327699b48a7620e901a41c/js-src/types.d.ts#L99)

Instance ID from `xmpMM:InstanceID` in XMP metadata

***

### label?

> `optional` **label**: `string`

Defined in: [types.d.ts:100](https://github.com/contentauth/c2pa-node-v2/blob/5303c5fd1e9a72d23f327699b48a7620e901a41c/js-src/types.d.ts#L100)

***

### redactions?

> `optional` **redactions**: `string`[]

Defined in: [types.d.ts:104](https://github.com/contentauth/c2pa-node-v2/blob/5303c5fd1e9a72d23f327699b48a7620e901a41c/js-src/types.d.ts#L104)

A list of redactions - URIs to a redacted assertions

***

### resources?

> `optional` **resources**: [`ResourceStore`](ResourceStore.md)

Defined in: [types.d.ts:108](https://github.com/contentauth/c2pa-node-v2/blob/5303c5fd1e9a72d23f327699b48a7620e901a41c/js-src/types.d.ts#L108)

container for binary assets (like thumbnails)

***

### signature\_info?

> `optional` **signature\_info**: [`SignatureInfo`](SignatureInfo.md)

Defined in: [types.d.ts:112](https://github.com/contentauth/c2pa-node-v2/blob/5303c5fd1e9a72d23f327699b48a7620e901a41c/js-src/types.d.ts#L112)

Signature data (only used for reporting)

***

### thumbnail?

> `optional` **thumbnail**: [`ResourceRef`](ResourceRef.md)

Defined in: [types.d.ts:113](https://github.com/contentauth/c2pa-node-v2/blob/5303c5fd1e9a72d23f327699b48a7620e901a41c/js-src/types.d.ts#L113)

***

### title?

> `optional` **title**: `string`

Defined in: [types.d.ts:117](https://github.com/contentauth/c2pa-node-v2/blob/5303c5fd1e9a72d23f327699b48a7620e901a41c/js-src/types.d.ts#L117)

A human-readable title, generally source filename

***

### vendor?

> `optional` **vendor**: `string`

Defined in: [types.d.ts:121](https://github.com/contentauth/c2pa-node-v2/blob/5303c5fd1e9a72d23f327699b48a7620e901a41c/js-src/types.d.ts#L121)

Optional prefix added to the generated Manifest Label This is typically Internet domain name for the vendor (i.e. `adobe`)
