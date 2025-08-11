[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / ManifestStore

# Interface: ManifestStore

Defined in: [types.d.ts:67](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/types.d.ts#L67)

A Container for a set of Manifests and a ValidationStatus list

## Indexable

\[`k`: `string`\]: `unknown`

## Properties

### active\_manifest?

> `optional` **active\_manifest**: `string`

Defined in: [types.d.ts:71](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/types.d.ts#L71)

A label for the active (most recent) manifest in the store

***

### manifests

> **manifests**: `object`

Defined in: [types.d.ts:75](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/types.d.ts#L75)

A HashMap of Manifests

#### Index Signature

\[`k`: `string`\]: [`Manifest`](Manifest.md)

***

### validation\_status?

> `optional` **validation\_status**: [`ValidationStatus`](ValidationStatus.md)[]

Defined in: [types.d.ts:81](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/types.d.ts#L81)

ValidationStatus generated when loading the ManifestStore from an asset
