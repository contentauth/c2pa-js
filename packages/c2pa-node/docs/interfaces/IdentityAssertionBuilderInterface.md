[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / IdentityAssertionBuilderInterface

# Interface: IdentityAssertionBuilderInterface

Defined in: [types.d.ts:329](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L329)

## Methods

### addReferencedAssertions()

> **addReferencedAssertions**(`referencedAssertions`): `void`

Defined in: [types.d.ts:337](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L337)

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

***

### addRoles()

> **addRoles**(`roles`): `void`

Defined in: [types.d.ts:342](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L342)

Add roles to attach to the named actor for this identity assertion.

#### Parameters

##### roles

`string`[]

Named actor roles

#### Returns

`void`

***

### builder()

> **builder**(): `unknown`

Defined in: [types.d.ts:347](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/types.d.ts#L347)

Get the underlying IdentityAssertionBuilder

#### Returns

`unknown`
