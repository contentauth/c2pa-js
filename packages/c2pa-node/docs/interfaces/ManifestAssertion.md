[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / ManifestAssertion

# Interface: ManifestAssertion

Defined in: [types.d.ts:150](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/types.d.ts#L150)

A labeled container for an Assertion value in a Manifest

## Indexable

\[`k`: `string`\]: `unknown`

## Properties

### data

> **data**: `unknown`

Defined in: [types.d.ts:151](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/types.d.ts#L151)

***

### instance?

> `optional` **instance**: `number`

Defined in: [types.d.ts:155](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/types.d.ts#L155)

There can be more than one assertion for any label

***

### kind?

> `optional` **kind**: [`ManifestAssertionKind`](../type-aliases/ManifestAssertionKind.md)

Defined in: [types.d.ts:159](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/types.d.ts#L159)

The [ManifestAssertionKind] for this assertion (as stored in c2pa content)

***

### label

> **label**: `string`

Defined in: [types.d.ts:163](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/types.d.ts#L163)

An assertion label in reverse domain format
