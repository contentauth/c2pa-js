[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / ManifestAssertion

# Interface: ManifestAssertion

Defined in: [types.d.ts:149](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L149)

A labeled container for an Assertion value in a Manifest

## Indexable

\[`k`: `string`\]: `unknown`

## Properties

### data

> **data**: `unknown`

Defined in: [types.d.ts:150](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L150)

***

### instance?

> `optional` **instance**: `number`

Defined in: [types.d.ts:154](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L154)

There can be more than one assertion for any label

***

### kind?

> `optional` **kind**: [`ManifestAssertionKind`](../type-aliases/ManifestAssertionKind.md)

Defined in: [types.d.ts:158](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L158)

The [ManifestAssertionKind] for this assertion (as stored in c2pa content)

***

### label

> **label**: `string`

Defined in: [types.d.ts:162](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L162)

An assertion label in reverse domain format
