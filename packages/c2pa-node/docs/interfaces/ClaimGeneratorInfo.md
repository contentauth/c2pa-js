[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / ClaimGeneratorInfo

# Interface: ClaimGeneratorInfo

Defined in: [types.d.ts:171](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L171)

Description of the claim generator, or the software used in generating the claim

This structure is also used for actions softwareAgent

## Indexable

\[`k`: `string`\]: `unknown`

## Properties

### icon?

> `optional` **icon**: [`UriOrResource`](../type-aliases/UriOrResource.md)

Defined in: [types.d.ts:175](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L175)

hashed URI to the icon (either embedded or remote)

***

### name

> **name**: `string`

Defined in: [types.d.ts:179](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L179)

A human readable string naming the claim_generator

***

### version?

> `optional` **version**: `string`

Defined in: [types.d.ts:183](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L183)

A human readable string of the product's version
