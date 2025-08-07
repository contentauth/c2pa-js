[**c2pa-node**](../README.md)

***

[c2pa-node](../README.md) / ManifestAssertion

# Interface: ManifestAssertion

Defined in: [types.d.ts:128](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L128)

A labeled container for an Assertion value in a Manifest

## Indexable

\[`k`: `string`\]: `unknown`

## Properties

### data

> **data**: `unknown`

Defined in: [types.d.ts:129](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L129)

***

### instance?

> `optional` **instance**: `number`

Defined in: [types.d.ts:133](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L133)

There can be more than one assertion for any label

***

### kind?

> `optional` **kind**: [`ManifestAssertionKind`](../type-aliases/ManifestAssertionKind.md)

Defined in: [types.d.ts:137](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L137)

The [ManifestAssertionKind] for this assertion (as stored in c2pa content)

***

### label

> **label**: `string`

Defined in: [types.d.ts:141](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L141)

An assertion label in reverse domain format
