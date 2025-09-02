[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / ManifestDefinition

# Interface: ManifestDefinition

Defined in: [types.d.ts:424](https://github.com/contentauth/c2pa-node-v2/blob/1df68df861d38a8c4eb7c634a613532727ec72d3/js-src/types.d.ts#L424)

From ManifestDefinition.d.ts
A Manifest Definition This is used to define a manifest and is used to build a ManifestStore A Manifest is a collection of ingredients and assertions It is used to define a claim that can be signed and embedded into a file

## Indexable

\[`k`: `string`\]: `unknown`

## Properties

### assertions?

> `optional` **assertions**: [`AssertionDefinition`](AssertionDefinition.md)[]

Defined in: [types.d.ts:428](https://github.com/contentauth/c2pa-node-v2/blob/1df68df861d38a8c4eb7c634a613532727ec72d3/js-src/types.d.ts#L428)

A list of assertions

***

### claim\_generator\_info?

> `optional` **claim\_generator\_info**: [`ClaimGeneratorInfo`](ClaimGeneratorInfo.md)[]

Defined in: [types.d.ts:432](https://github.com/contentauth/c2pa-node-v2/blob/1df68df861d38a8c4eb7c634a613532727ec72d3/js-src/types.d.ts#L432)

Clam Generator Info is always required with at least one entry

***

### format?

> `optional` **format**: `string`

Defined in: [types.d.ts:436](https://github.com/contentauth/c2pa-node-v2/blob/1df68df861d38a8c4eb7c634a613532727ec72d3/js-src/types.d.ts#L436)

The format of the source file as a MIME type

***

### ingredients?

> `optional` **ingredients**: [`Ingredient`](Ingredient.md)[]

Defined in: [types.d.ts:440](https://github.com/contentauth/c2pa-node-v2/blob/1df68df861d38a8c4eb7c634a613532727ec72d3/js-src/types.d.ts#L440)

A List of ingredients

***

### instance\_id?

> `optional` **instance\_id**: `string`

Defined in: [types.d.ts:444](https://github.com/contentauth/c2pa-node-v2/blob/1df68df861d38a8c4eb7c634a613532727ec72d3/js-src/types.d.ts#L444)

Instance ID from `xmpMM:InstanceID` in XMP metadata

***

### label?

> `optional` **label**: `string`

Defined in: [types.d.ts:445](https://github.com/contentauth/c2pa-node-v2/blob/1df68df861d38a8c4eb7c634a613532727ec72d3/js-src/types.d.ts#L445)

***

### redactions?

> `optional` **redactions**: `string`[]

Defined in: [types.d.ts:449](https://github.com/contentauth/c2pa-node-v2/blob/1df68df861d38a8c4eb7c634a613532727ec72d3/js-src/types.d.ts#L449)

A list of redactions - URIs to a redacted assertions

***

### thumbnail?

> `optional` **thumbnail**: [`ResourceRef`](ResourceRef.md)

Defined in: [types.d.ts:450](https://github.com/contentauth/c2pa-node-v2/blob/1df68df861d38a8c4eb7c634a613532727ec72d3/js-src/types.d.ts#L450)

***

### title?

> `optional` **title**: `string`

Defined in: [types.d.ts:454](https://github.com/contentauth/c2pa-node-v2/blob/1df68df861d38a8c4eb7c634a613532727ec72d3/js-src/types.d.ts#L454)

A human-readable title, generally source filename

***

### vendor?

> `optional` **vendor**: `string`

Defined in: [types.d.ts:458](https://github.com/contentauth/c2pa-node-v2/blob/1df68df861d38a8c4eb7c634a613532727ec72d3/js-src/types.d.ts#L458)

Optional prefix added to the generated Manifest Label This is typically Internet domain name for the vendor (i.e. `adobe`)
