[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / IdentityAssertionBuilder

# Class: IdentityAssertionBuilder

Defined in: [IdentityAssertion.ts:21](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/IdentityAssertion.ts#L21)

## Implements

- [`IdentityAssertionBuilderInterface`](../interfaces/IdentityAssertionBuilderInterface.md)

## Methods

### addReferencedAssertions()

> **addReferencedAssertions**(`referencedAssertions`): `void`

Defined in: [IdentityAssertion.ts:35](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/IdentityAssertion.ts#L35)

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

[`IdentityAssertionBuilderInterface`](../interfaces/IdentityAssertionBuilderInterface.md).[`addReferencedAssertions`](../interfaces/IdentityAssertionBuilderInterface.md#addreferencedassertions)

***

### addRoles()

> **addRoles**(`roles`): `void`

Defined in: [IdentityAssertion.ts:42](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/IdentityAssertion.ts#L42)

Add roles to attach to the named actor for this identity assertion.

#### Parameters

##### roles

`string`[]

Named actor roles

#### Returns

`void`

#### Implementation of

[`IdentityAssertionBuilderInterface`](../interfaces/IdentityAssertionBuilderInterface.md).[`addRoles`](../interfaces/IdentityAssertionBuilderInterface.md#addroles)

***

### builder()

> **builder**(): [`IdentityAssertionBuilderInterface`](../interfaces/IdentityAssertionBuilderInterface.md)

Defined in: [IdentityAssertion.ts:46](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/IdentityAssertion.ts#L46)

Get the underlying IdentityAssertionBuilder

#### Returns

[`IdentityAssertionBuilderInterface`](../interfaces/IdentityAssertionBuilderInterface.md)

#### Implementation of

[`IdentityAssertionBuilderInterface`](../interfaces/IdentityAssertionBuilderInterface.md).[`builder`](../interfaces/IdentityAssertionBuilderInterface.md#builder)

***

### identityBuilderForCredentialHolder()

> `static` **identityBuilderForCredentialHolder**(`credentialHolder`): `Promise`\<`IdentityAssertionBuilder`\>

Defined in: [IdentityAssertion.ts:26](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/IdentityAssertion.ts#L26)

#### Parameters

##### credentialHolder

[`CallbackSignerInterface`](../interfaces/CallbackSignerInterface.md)

#### Returns

`Promise`\<`IdentityAssertionBuilder`\>
