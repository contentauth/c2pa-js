[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / IdentityAssertionBuilder

# Class: IdentityAssertionBuilder

Defined in: [IdentityAssertion.ts:17](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/IdentityAssertion.ts#L17)

## Implements

- `IdentityAssertionBuilder`

## Methods

### addReferencedAssertions()

> **addReferencedAssertions**(`referencedAssertions`): `void`

Defined in: [IdentityAssertion.ts:29](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/IdentityAssertion.ts#L29)

Add assertion labels to consider as referenced_assertions.
If any of these labels match assertions that are present in the partial
claim submitted during signing, they will be added to the
`referenced_assertions` list for this identity assertion.

#### Parameters

##### referencedAssertions

`string`[]

The list of assertion labels to add

#### Returns

`void`

#### Implementation of

`neon.IdentityAssertionBuilder.addReferencedAssertions`

***

### addRoles()

> **addRoles**(`roles`): `void`

Defined in: [IdentityAssertion.ts:36](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/IdentityAssertion.ts#L36)

Add roles to attach to the named actor for this identity assertion.

#### Parameters

##### roles

`string`[]

Named actor roles

#### Returns

`void`

#### Implementation of

`neon.IdentityAssertionBuilder.addRoles`

***

### builder()

> **builder**(): `IdentityAssertionBuilder`

Defined in: [IdentityAssertion.ts:40](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/IdentityAssertion.ts#L40)

Get the underlying IdentityAssertionBuilder

#### Returns

`IdentityAssertionBuilder`

#### Implementation of

`neon.IdentityAssertionBuilder.builder`

***

### identityBuilderForCredentialHolder()

> `static` **identityBuilderForCredentialHolder**(`credentialHolder`): `Promise`\<`IdentityAssertionBuilder`\>

Defined in: [IdentityAssertion.ts:20](https://github.com/contentauth/c2pa-node-v2/blob/c336e36bb30fc393837615821d0e64cbfdcdeea6/js-src/IdentityAssertion.ts#L20)

#### Parameters

##### credentialHolder

[`CallbackSigner`](CallbackSigner.md)

#### Returns

`Promise`\<`IdentityAssertionBuilder`\>
