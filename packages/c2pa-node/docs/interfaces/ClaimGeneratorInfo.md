[**c2pa-node**](../README.md)

***

[c2pa-node](../README.md) / ClaimGeneratorInfo

# Interface: ClaimGeneratorInfo

Defined in: [types.d.ts:150](https://github.com/contentauth/c2pa-node-v2/blob/5303c5fd1e9a72d23f327699b48a7620e901a41c/js-src/types.d.ts#L150)

Description of the claim generator, or the software used in generating the claim

This structure is also used for actions softwareAgent

## Indexable

\[`k`: `string`\]: `unknown`

## Properties

### icon?

> `optional` **icon**: [`UriOrResource`](../type-aliases/UriOrResource.md)

Defined in: [types.d.ts:154](https://github.com/contentauth/c2pa-node-v2/blob/5303c5fd1e9a72d23f327699b48a7620e901a41c/js-src/types.d.ts#L154)

hashed URI to the icon (either embedded or remote)

***

### name

> **name**: `string`

Defined in: [types.d.ts:158](https://github.com/contentauth/c2pa-node-v2/blob/5303c5fd1e9a72d23f327699b48a7620e901a41c/js-src/types.d.ts#L158)

A human readable string naming the claim_generator

***

### version?

> `optional` **version**: `string`

Defined in: [types.d.ts:162](https://github.com/contentauth/c2pa-node-v2/blob/5303c5fd1e9a72d23f327699b48a7620e901a41c/js-src/types.d.ts#L162)

A human readable string of the product's version
