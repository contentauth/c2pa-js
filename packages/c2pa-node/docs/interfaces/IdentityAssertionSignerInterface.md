[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / IdentityAssertionSignerInterface

# Interface: IdentityAssertionSignerInterface

Defined in: [types.d.ts:315](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L315)

## Methods

### addIdentityAssertion()

> **addIdentityAssertion**(`identityAssertionBuilder`): `void`

Defined in: [types.d.ts:322](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L322)

Add a IdentityAssertionBuilder  to be used when signing the
next Manifest

IMPORTANT: When sign() is called, the list of
IdentityAssertionBuilders will be cleared.

#### Parameters

##### identityAssertionBuilder

[`IdentityAssertionBuilderInterface`](IdentityAssertionBuilderInterface.md)

#### Returns

`void`

***

### signer()

> **signer**(): `unknown`

Defined in: [types.d.ts:326](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L326)

#### Returns

`unknown`
