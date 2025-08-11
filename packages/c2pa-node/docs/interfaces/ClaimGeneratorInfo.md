[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / ClaimGeneratorInfo

# Interface: ClaimGeneratorInfo

Defined in: [types.d.ts:172](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/types.d.ts#L172)

Description of the claim generator, or the software used in generating the claim

This structure is also used for actions softwareAgent

## Indexable

\[`k`: `string`\]: `unknown`

## Properties

### icon?

> `optional` **icon**: [`UriOrResource`](../type-aliases/UriOrResource.md)

Defined in: [types.d.ts:176](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/types.d.ts#L176)

hashed URI to the icon (either embedded or remote)

***

### name

> **name**: `string`

Defined in: [types.d.ts:180](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/types.d.ts#L180)

A human readable string naming the claim_generator

***

### version?

> `optional` **version**: `string`

Defined in: [types.d.ts:184](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/types.d.ts#L184)

A human readable string of the product's version
