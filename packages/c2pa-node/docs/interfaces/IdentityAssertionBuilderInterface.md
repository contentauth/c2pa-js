[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / IdentityAssertionBuilderInterface

# Interface: IdentityAssertionBuilderInterface

Defined in: [types.d.ts:729](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L729)

## Methods

### addReferencedAssertions()

> **addReferencedAssertions**(`referencedAssertions`): `void`

Defined in: [types.d.ts:737](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L737)

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

Defined in: [types.d.ts:742](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L742)

Add roles to attach to the named actor for this identity assertion.

#### Parameters

##### roles

`string`[]

Named actor roles

#### Returns

`void`

***

### builder()

> **builder**(): `IdentityAssertionBuilderInterface`

Defined in: [types.d.ts:747](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L747)

Get the underlying IdentityAssertionBuilder

#### Returns

`IdentityAssertionBuilderInterface`
