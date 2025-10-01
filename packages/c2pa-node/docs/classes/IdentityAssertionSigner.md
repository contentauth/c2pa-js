[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / IdentityAssertionSigner

# Class: IdentityAssertionSigner

Defined in: [IdentityAssertion.ts:56](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/IdentityAssertion.ts#L56)

## Implements

- [`IdentityAssertionSignerInterface`](../interfaces/IdentityAssertionSignerInterface.md)

## Constructors

### Constructor

> **new IdentityAssertionSigner**(`_signer`): `IdentityAssertionSigner`

Defined in: [IdentityAssertion.ts:59](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/IdentityAssertion.ts#L59)

#### Parameters

##### \_signer

`unknown`

#### Returns

`IdentityAssertionSigner`

## Methods

### addIdentityAssertion()

> **addIdentityAssertion**(`identityAssertionBuilder`): `void`

Defined in: [IdentityAssertion.ts:66](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/IdentityAssertion.ts#L66)

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

[`IdentityAssertionSignerInterface`](../interfaces/IdentityAssertionSignerInterface.md).[`addIdentityAssertion`](../interfaces/IdentityAssertionSignerInterface.md#addidentityassertion)

***

### signer()

> **signer**(): `unknown`

Defined in: [IdentityAssertion.ts:75](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/IdentityAssertion.ts#L75)

#### Returns

`unknown`

#### Implementation of

[`IdentityAssertionSignerInterface`](../interfaces/IdentityAssertionSignerInterface.md).[`signer`](../interfaces/IdentityAssertionSignerInterface.md#signer)

***

### new()

> `static` **new**(`signer`): `IdentityAssertionSigner`

Defined in: [IdentityAssertion.ts:61](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/IdentityAssertion.ts#L61)

#### Parameters

##### signer

`unknown`

#### Returns

`IdentityAssertionSigner`
