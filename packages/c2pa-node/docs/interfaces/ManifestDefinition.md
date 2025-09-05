[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / ManifestDefinition

# Interface: ManifestDefinition

Defined in: [types.d.ts:423](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L423)

From ManifestDefinition.d.ts
A Manifest Definition This is used to define a manifest and is used to build a ManifestStore A Manifest is a collection of ingredients and assertions It is used to define a claim that can be signed and embedded into a file

## Indexable

\[`k`: `string`\]: `unknown`

## Properties

### assertions?

> `optional` **assertions**: [`AssertionDefinition`](AssertionDefinition.md)[]

Defined in: [types.d.ts:427](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L427)

A list of assertions

***

### claim\_generator\_info?

> `optional` **claim\_generator\_info**: [`ClaimGeneratorInfo`](ClaimGeneratorInfo.md)[]

Defined in: [types.d.ts:431](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L431)

Clam Generator Info is always required with at least one entry

***

### format?

> `optional` **format**: `string`

Defined in: [types.d.ts:435](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L435)

The format of the source file as a MIME type

***

### ingredients?

> `optional` **ingredients**: [`Ingredient`](Ingredient.md)[]

Defined in: [types.d.ts:439](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L439)

A List of ingredients

***

### instance\_id?

> `optional` **instance\_id**: `string`

Defined in: [types.d.ts:443](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L443)

Instance ID from `xmpMM:InstanceID` in XMP metadata

***

### label?

> `optional` **label**: `string`

Defined in: [types.d.ts:444](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L444)

***

### redactions?

> `optional` **redactions**: `string`[]

Defined in: [types.d.ts:448](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L448)

A list of redactions - URIs to a redacted assertions

***

### thumbnail?

> `optional` **thumbnail**: [`ResourceRef`](ResourceRef.md)

Defined in: [types.d.ts:449](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L449)

***

### title?

> `optional` **title**: `string`

Defined in: [types.d.ts:453](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L453)

A human-readable title, generally source filename

***

### vendor?

> `optional` **vendor**: `string`

Defined in: [types.d.ts:457](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L457)

Optional prefix added to the generated Manifest Label This is typically Internet domain name for the vendor (i.e. `adobe`)
