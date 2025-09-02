[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / ResourceRef

# Interface: ResourceRef

Defined in: [types.d.ts:191](https://github.com/contentauth/c2pa-node-v2/blob/92024140271b3589278f2b732abca2c4a33b231a/js-src/types.d.ts#L191)

A reference to a resource to be used in JSON serialization

## Indexable

\[`k`: `string`\]: `unknown`

## Properties

### alg?

> `optional` **alg**: `string`

Defined in: [types.d.ts:195](https://github.com/contentauth/c2pa-node-v2/blob/92024140271b3589278f2b732abca2c4a33b231a/js-src/types.d.ts#L195)

The algorithm used to hash the resource (if applicable)

***

### data\_types?

> `optional` **data\_types**: [`AssetType`](AssetType.md)[]

Defined in: [types.d.ts:199](https://github.com/contentauth/c2pa-node-v2/blob/92024140271b3589278f2b732abca2c4a33b231a/js-src/types.d.ts#L199)

More detailed data types as defined in the C2PA spec

***

### format

> **format**: `string`

Defined in: [types.d.ts:203](https://github.com/contentauth/c2pa-node-v2/blob/92024140271b3589278f2b732abca2c4a33b231a/js-src/types.d.ts#L203)

The mime type of the referenced resource

***

### hash?

> `optional` **hash**: `string`

Defined in: [types.d.ts:207](https://github.com/contentauth/c2pa-node-v2/blob/92024140271b3589278f2b732abca2c4a33b231a/js-src/types.d.ts#L207)

The hash of the resource (if applicable)

***

### identifier

> **identifier**: `string`

Defined in: [types.d.ts:213](https://github.com/contentauth/c2pa-node-v2/blob/92024140271b3589278f2b732abca2c4a33b231a/js-src/types.d.ts#L213)

A URI that identifies the resource as referenced from the manifest

This may be a JUMBF URI, a file path, a URL or any other string. Relative JUMBF URIs will be resolved with the manifest label. Relative file paths will be resolved with the base path if provided
