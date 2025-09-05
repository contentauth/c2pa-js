[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / Actor

# Interface: Actor

Defined in: [types.d.ts:345](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L345)

Identifies a person responsible for an action

## Indexable

\[`k`: `string`\]: `unknown`

## Properties

### credentials?

> `optional` **credentials**: [`HashedUri`](HashedUri.md)[]

Defined in: [types.d.ts:349](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L349)

List of references to W3C Verifiable Credentials

***

### identifier?

> `optional` **identifier**: `string`

Defined in: [types.d.ts:353](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L353)

An identifier for a human actor, used when the "type" is `humanEntry.identified`
