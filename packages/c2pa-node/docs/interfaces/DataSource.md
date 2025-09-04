[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / DataSource

# Interface: DataSource

Defined in: [types.d.ts:326](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L326)

A description of the source for assertion data

## Indexable

\[`k`: `string`\]: `unknown`

## Properties

### actors?

> `optional` **actors**: [`Actor`](Actor.md)[]

Defined in: [types.d.ts:330](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L330)

A list of [`Actor`]s associated with this source

***

### details?

> `optional` **details**: `string`

Defined in: [types.d.ts:334](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L334)

A human-readable string giving details about the source of the assertion data

***

### type

> **type**: `string`

Defined in: [types.d.ts:338](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L338)

A value from among the enumerated list indicating the source of the assertion
