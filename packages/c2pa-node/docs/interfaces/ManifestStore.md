[**c2pa-node**](../README.md)

***

[c2pa-node](../README.md) / ManifestStore

# Interface: ManifestStore

Defined in: [types.d.ts:45](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L45)

A Container for a set of Manifests and a ValidationStatus list

## Indexable

\[`k`: `string`\]: `unknown`

## Properties

### active\_manifest?

> `optional` **active\_manifest**: `string`

Defined in: [types.d.ts:49](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L49)

A label for the active (most recent) manifest in the store

***

### manifests

> **manifests**: `object`

Defined in: [types.d.ts:53](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L53)

A HashMap of Manifests

#### Index Signature

\[`k`: `string`\]: [`Manifest`](Manifest.md)

***

### validation\_status?

> `optional` **validation\_status**: [`ValidationStatus`](ValidationStatus.md)[]

Defined in: [types.d.ts:59](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L59)

ValidationStatus generated when loading the ManifestStore from an asset
