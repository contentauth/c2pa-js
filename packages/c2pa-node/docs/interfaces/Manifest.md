[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / Manifest

# Interface: Manifest

Defined in: [types.d.ts:88](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/types.d.ts#L88)

A Manifest represents all the information in a c2pa manifest

## Indexable

\[`k`: `string`\]: `unknown`

## Properties

### assertions?

> `optional` **assertions**: [`ManifestAssertion`](ManifestAssertion.md)[]

Defined in: [types.d.ts:92](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/types.d.ts#L92)

A list of assertions

***

### claim\_generator?

> `optional` **claim\_generator**: `string`

Defined in: [types.d.ts:96](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/types.d.ts#L96)

A User Agent formatted string identifying the software/hardware/system produced this claim Spaces are not allowed in names, versions can be specified with product/1.0 syntax

***

### claim\_generator\_hints?

> `optional` **claim\_generator\_hints**: `object`

Defined in: [types.d.ts:97](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/types.d.ts#L97)

#### Index Signature

\[`k`: `string`\]: `unknown`

***

### claim\_generator\_info?

> `optional` **claim\_generator\_info**: [`ClaimGeneratorInfo`](ClaimGeneratorInfo.md)[]

Defined in: [types.d.ts:105](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/types.d.ts#L105)

A list of claim generator info data identifying the software/hardware/system produced this claim

***

### credentials?

> `optional` **credentials**: `unknown`[]

Defined in: [types.d.ts:109](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/types.d.ts#L109)

A List of verified credentials

***

### format?

> `optional` **format**: `string`

Defined in: [types.d.ts:113](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/types.d.ts#L113)

The format of the source file as a MIME type

***

### ingredients?

> `optional` **ingredients**: [`Ingredient`](Ingredient.md)[]

Defined in: [types.d.ts:117](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/types.d.ts#L117)

A List of ingredients

***

### instance\_id?

> `optional` **instance\_id**: `string`

Defined in: [types.d.ts:121](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/types.d.ts#L121)

Instance ID from `xmpMM:InstanceID` in XMP metadata

***

### label?

> `optional` **label**: `string`

Defined in: [types.d.ts:122](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/types.d.ts#L122)

***

### redactions?

> `optional` **redactions**: `string`[]

Defined in: [types.d.ts:126](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/types.d.ts#L126)

A list of redactions - URIs to a redacted assertions

***

### resources?

> `optional` **resources**: [`ResourceStore`](ResourceStore.md)

Defined in: [types.d.ts:130](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/types.d.ts#L130)

container for binary assets (like thumbnails)

***

### signature\_info?

> `optional` **signature\_info**: [`SignatureInfo`](SignatureInfo.md)

Defined in: [types.d.ts:134](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/types.d.ts#L134)

Signature data (only used for reporting)

***

### thumbnail?

> `optional` **thumbnail**: [`ResourceRef`](ResourceRef.md)

Defined in: [types.d.ts:135](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/types.d.ts#L135)

***

### title?

> `optional` **title**: `string`

Defined in: [types.d.ts:139](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/types.d.ts#L139)

A human-readable title, generally source filename

***

### vendor?

> `optional` **vendor**: `string`

Defined in: [types.d.ts:143](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/types.d.ts#L143)

Optional prefix added to the generated Manifest Label This is typically Internet domain name for the vendor (i.e. `adobe`)
