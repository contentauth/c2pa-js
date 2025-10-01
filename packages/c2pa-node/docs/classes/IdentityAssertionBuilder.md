[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / IdentityAssertionBuilder

# Class: IdentityAssertionBuilder

Defined in: [IdentityAssertion.ts:26](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/IdentityAssertion.ts#L26)

## Implements

- [`IdentityAssertionBuilderInterface`](../interfaces/IdentityAssertionBuilderInterface.md)

## Constructors

### Constructor

> **new IdentityAssertionBuilder**(`_builder`): `IdentityAssertionBuilder`

Defined in: [IdentityAssertion.ts:29](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/IdentityAssertion.ts#L29)

#### Parameters

##### \_builder

`unknown`

#### Returns

`IdentityAssertionBuilder`

## Methods

### addReferencedAssertions()

> **addReferencedAssertions**(`referencedAssertions`): `void`

Defined in: [IdentityAssertion.ts:40](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/IdentityAssertion.ts#L40)

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

Defined in: [IdentityAssertion.ts:47](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/IdentityAssertion.ts#L47)

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

> **builder**(): `unknown`

Defined in: [IdentityAssertion.ts:51](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/IdentityAssertion.ts#L51)

Get the underlying IdentityAssertionBuilder

#### Returns

`unknown`

#### Implementation of

[`IdentityAssertionBuilderInterface`](../interfaces/IdentityAssertionBuilderInterface.md).[`builder`](../interfaces/IdentityAssertionBuilderInterface.md#builder)

***

### identityBuilderForCredentialHolder()

> `static` **identityBuilderForCredentialHolder**(`credentialHolder`): `Promise`\<`IdentityAssertionBuilder`\>

Defined in: [IdentityAssertion.ts:31](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/IdentityAssertion.ts#L31)

#### Parameters

##### credentialHolder

[`CallbackCredentialHolderInterface`](../interfaces/CallbackCredentialHolderInterface.md)

#### Returns

`Promise`\<`IdentityAssertionBuilder`\>
