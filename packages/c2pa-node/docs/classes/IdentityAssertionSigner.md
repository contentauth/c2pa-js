[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / IdentityAssertionSigner

# Class: IdentityAssertionSigner

Defined in: [IdentityAssertion.ts:51](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/IdentityAssertion.ts#L51)

## Implements

- [`IdentityAssertionSignerInterface`](../interfaces/IdentityAssertionSignerInterface.md)

## Methods

### addIdentityAssertion()

> **addIdentityAssertion**(`identityAssertionBuilder`): `void`

Defined in: [IdentityAssertion.ts:61](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/IdentityAssertion.ts#L61)

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

> **signer**(): [`IdentityAssertionSignerInterface`](../interfaces/IdentityAssertionSignerInterface.md)

Defined in: [IdentityAssertion.ts:70](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/IdentityAssertion.ts#L70)

#### Returns

[`IdentityAssertionSignerInterface`](../interfaces/IdentityAssertionSignerInterface.md)

***

### new()

> `static` **new**(`signer`): `IdentityAssertionSigner`

Defined in: [IdentityAssertion.ts:56](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/IdentityAssertion.ts#L56)

#### Parameters

##### signer

[`CallbackSignerInterface`](../interfaces/CallbackSignerInterface.md)

#### Returns

`IdentityAssertionSigner`
