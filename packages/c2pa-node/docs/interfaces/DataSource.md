[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / DataSource

# Interface: DataSource

Defined in: [types.d.ts:327](https://github.com/contentauth/c2pa-node-v2/blob/92024140271b3589278f2b732abca2c4a33b231a/js-src/types.d.ts#L327)

A description of the source for assertion data

## Indexable

\[`k`: `string`\]: `unknown`

## Properties

### actors?

> `optional` **actors**: [`Actor`](Actor.md)[]

Defined in: [types.d.ts:331](https://github.com/contentauth/c2pa-node-v2/blob/92024140271b3589278f2b732abca2c4a33b231a/js-src/types.d.ts#L331)

A list of [`Actor`]s associated with this source

***

### details?

> `optional` **details**: `string`

Defined in: [types.d.ts:335](https://github.com/contentauth/c2pa-node-v2/blob/92024140271b3589278f2b732abca2c4a33b231a/js-src/types.d.ts#L335)

A human-readable string giving details about the source of the assertion data

***

### type

> **type**: `string`

Defined in: [types.d.ts:339](https://github.com/contentauth/c2pa-node-v2/blob/92024140271b3589278f2b732abca2c4a33b231a/js-src/types.d.ts#L339)

A value from among the enumerated list indicating the source of the assertion
