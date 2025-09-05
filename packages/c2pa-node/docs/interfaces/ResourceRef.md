[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / ResourceRef

# Interface: ResourceRef

Defined in: [types.d.ts:190](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L190)

A reference to a resource to be used in JSON serialization

## Indexable

\[`k`: `string`\]: `unknown`

## Properties

### alg?

> `optional` **alg**: `string`

Defined in: [types.d.ts:194](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L194)

The algorithm used to hash the resource (if applicable)

***

### data\_types?

> `optional` **data\_types**: [`AssetType`](AssetType.md)[]

Defined in: [types.d.ts:198](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L198)

More detailed data types as defined in the C2PA spec

***

### format

> **format**: `string`

Defined in: [types.d.ts:202](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L202)

The mime type of the referenced resource

***

### hash?

> `optional` **hash**: `string`

Defined in: [types.d.ts:206](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L206)

The hash of the resource (if applicable)

***

### identifier

> **identifier**: `string`

Defined in: [types.d.ts:212](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L212)

A URI that identifies the resource as referenced from the manifest

This may be a JUMBF URI, a file path, a URL or any other string. Relative JUMBF URIs will be resolved with the manifest label. Relative file paths will be resolved with the base path if provided
