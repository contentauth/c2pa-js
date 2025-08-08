[**c2pa-node**](../README.md)

***

[c2pa-node](../README.md) / ResourceRef

# Interface: ResourceRef

Defined in: [types.d.ts:169](https://github.com/contentauth/c2pa-node-v2/blob/5303c5fd1e9a72d23f327699b48a7620e901a41c/js-src/types.d.ts#L169)

A reference to a resource to be used in JSON serialization

## Indexable

\[`k`: `string`\]: `unknown`

## Properties

### alg?

> `optional` **alg**: `string`

Defined in: [types.d.ts:173](https://github.com/contentauth/c2pa-node-v2/blob/5303c5fd1e9a72d23f327699b48a7620e901a41c/js-src/types.d.ts#L173)

The algorithm used to hash the resource (if applicable)

***

### data\_types?

> `optional` **data\_types**: [`AssetType`](AssetType.md)[]

Defined in: [types.d.ts:177](https://github.com/contentauth/c2pa-node-v2/blob/5303c5fd1e9a72d23f327699b48a7620e901a41c/js-src/types.d.ts#L177)

More detailed data types as defined in the C2PA spec

***

### format

> **format**: `string`

Defined in: [types.d.ts:181](https://github.com/contentauth/c2pa-node-v2/blob/5303c5fd1e9a72d23f327699b48a7620e901a41c/js-src/types.d.ts#L181)

The mime type of the referenced resource

***

### hash?

> `optional` **hash**: `string`

Defined in: [types.d.ts:185](https://github.com/contentauth/c2pa-node-v2/blob/5303c5fd1e9a72d23f327699b48a7620e901a41c/js-src/types.d.ts#L185)

The hash of the resource (if applicable)

***

### identifier

> **identifier**: `string`

Defined in: [types.d.ts:191](https://github.com/contentauth/c2pa-node-v2/blob/5303c5fd1e9a72d23f327699b48a7620e901a41c/js-src/types.d.ts#L191)

A URI that identifies the resource as referenced from the manifest

This may be a JUMBF URI, a file path, a URL or any other string. Relative JUMBF URIs will be resolved with the manifest label. Relative file paths will be resolved with the base path if provided
