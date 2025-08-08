[**c2pa-node**](../README.md)

***

[c2pa-node](../README.md) / DataSource

# Interface: DataSource

Defined in: [types.d.ts:305](https://github.com/contentauth/c2pa-node-v2/blob/5303c5fd1e9a72d23f327699b48a7620e901a41c/js-src/types.d.ts#L305)

A description of the source for assertion data

## Indexable

\[`k`: `string`\]: `unknown`

## Properties

### actors?

> `optional` **actors**: [`Actor`](Actor.md)[]

Defined in: [types.d.ts:309](https://github.com/contentauth/c2pa-node-v2/blob/5303c5fd1e9a72d23f327699b48a7620e901a41c/js-src/types.d.ts#L309)

A list of [`Actor`]s associated with this source

***

### details?

> `optional` **details**: `string`

Defined in: [types.d.ts:313](https://github.com/contentauth/c2pa-node-v2/blob/5303c5fd1e9a72d23f327699b48a7620e901a41c/js-src/types.d.ts#L313)

A human-readable string giving details about the source of the assertion data

***

### type

> **type**: `string`

Defined in: [types.d.ts:317](https://github.com/contentauth/c2pa-node-v2/blob/5303c5fd1e9a72d23f327699b48a7620e901a41c/js-src/types.d.ts#L317)

A value from among the enumerated list indicating the source of the assertion
