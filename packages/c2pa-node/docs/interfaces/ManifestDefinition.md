[**c2pa-node**](../README.md)

***

[c2pa-node](../README.md) / ManifestDefinition

# Interface: ManifestDefinition

Defined in: [types.d.ts:402](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L402)

From ManifestDefinition.d.ts
A Manifest Definition This is used to define a manifest and is used to build a ManifestStore A Manifest is a collection of ingredients and assertions It is used to define a claim that can be signed and embedded into a file

## Indexable

\[`k`: `string`\]: `unknown`

## Properties

### assertions?

> `optional` **assertions**: [`AssertionDefinition`](AssertionDefinition.md)[]

Defined in: [types.d.ts:406](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L406)

A list of assertions

***

### claim\_generator\_info?

> `optional` **claim\_generator\_info**: [`ClaimGeneratorInfo`](ClaimGeneratorInfo.md)[]

Defined in: [types.d.ts:410](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L410)

Clam Generator Info is always required with at least one entry

***

### format?

> `optional` **format**: `string`

Defined in: [types.d.ts:414](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L414)

The format of the source file as a MIME type

***

### ingredients?

> `optional` **ingredients**: [`Ingredient`](Ingredient.md)[]

Defined in: [types.d.ts:418](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L418)

A List of ingredients

***

### instance\_id?

> `optional` **instance\_id**: `string`

Defined in: [types.d.ts:422](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L422)

Instance ID from `xmpMM:InstanceID` in XMP metadata

***

### label?

> `optional` **label**: `string`

Defined in: [types.d.ts:423](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L423)

***

### redactions?

> `optional` **redactions**: `string`[]

Defined in: [types.d.ts:427](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L427)

A list of redactions - URIs to a redacted assertions

***

### thumbnail?

> `optional` **thumbnail**: [`ResourceRef`](ResourceRef.md)

Defined in: [types.d.ts:428](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L428)

***

### title?

> `optional` **title**: `string`

Defined in: [types.d.ts:432](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L432)

A human-readable title, generally source filename

***

### vendor?

> `optional` **vendor**: `string`

Defined in: [types.d.ts:436](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L436)

Optional prefix added to the generated Manifest Label This is typically Internet domain name for the vendor (i.e. `adobe`)
