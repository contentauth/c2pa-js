[**c2pa-node**](../README.md)

***

[c2pa-node](../README.md) / IdentityAssertionSigner

# Class: IdentityAssertionSigner

Defined in: [IdentityAssertion.ts:45](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/IdentityAssertion.ts#L45)

## Implements

- `IdentityAssertionSigner`

## Methods

### addIdentityAssertion()

> **addIdentityAssertion**(`identityAssertionBuilder`): `void`

Defined in: [IdentityAssertion.ts:53](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/IdentityAssertion.ts#L53)

Add a IdentityAssertionBuilder  to be used when signing the
next Manifest

IMPORTANT: When sign() is called, the list of
IdentityAssertionBuilders will be cleared.

#### Parameters

##### identityAssertionBuilder

[`IdentityAssertionBuilder`](IdentityAssertionBuilder.md)

#### Returns

`void`

#### Implementation of

`neon.IdentityAssertionSigner.addIdentityAssertion`

***

### signer()

> **signer**(): `IdentityAssertionSigner`

Defined in: [IdentityAssertion.ts:62](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/IdentityAssertion.ts#L62)

#### Returns

`IdentityAssertionSigner`

***

### new()

> `static` **new**(`signer`): `IdentityAssertionSigner`

Defined in: [IdentityAssertion.ts:48](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/IdentityAssertion.ts#L48)

#### Parameters

##### signer

[`CallbackSigner`](CallbackSigner.md)

#### Returns

`IdentityAssertionSigner`
