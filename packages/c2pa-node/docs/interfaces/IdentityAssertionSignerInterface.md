[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / IdentityAssertionSignerInterface

# Interface: IdentityAssertionSignerInterface

Defined in: [types.d.ts:717](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L717)

## Methods

### addIdentityAssertion()

> **addIdentityAssertion**(`identityAssertionBuilder`): `void`

Defined in: [types.d.ts:724](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L724)

Add a IdentityAssertionBuilder  to be used when signing the
next Manifest

IMPORTANT: When sign() is called, the list of
IdentityAssertionBuilders will be cleared.

#### Parameters

##### identityAssertionBuilder

[`IdentityAssertionBuilderInterface`](IdentityAssertionBuilderInterface.md)

#### Returns

`void`
