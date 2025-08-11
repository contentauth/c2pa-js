[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / Actor

# Interface: Actor

Defined in: [types.d.ts:346](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/types.d.ts#L346)

Identifies a person responsible for an action

## Indexable

\[`k`: `string`\]: `unknown`

## Properties

### credentials?

> `optional` **credentials**: [`HashedUri`](HashedUri.md)[]

Defined in: [types.d.ts:350](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/types.d.ts#L350)

List of references to W3C Verifiable Credentials

***

### identifier?

> `optional` **identifier**: `string`

Defined in: [types.d.ts:354](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/types.d.ts#L354)

An identifier for a human actor, used when the "type" is `humanEntry.identified`
