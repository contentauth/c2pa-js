[**c2pa-node**](../README.md)

***

[c2pa-node](../README.md) / Actor

# Interface: Actor

Defined in: [types.d.ts:324](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L324)

Identifies a person responsible for an action

## Indexable

\[`k`: `string`\]: `unknown`

## Properties

### credentials?

> `optional` **credentials**: [`HashedUri`](HashedUri.md)[]

Defined in: [types.d.ts:328](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L328)

List of references to W3C Verifiable Credentials

***

### identifier?

> `optional` **identifier**: `string`

Defined in: [types.d.ts:332](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L332)

An identifier for a human actor, used when the "type" is `humanEntry.identified`
