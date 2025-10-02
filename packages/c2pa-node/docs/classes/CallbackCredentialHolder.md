[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / CallbackCredentialHolder

# Class: CallbackCredentialHolder

Defined in: [IdentityAssertion.ts:80](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/IdentityAssertion.ts#L80)

## Implements

- [`CallbackCredentialHolderInterface`](../interfaces/CallbackCredentialHolderInterface.md)

## Constructors

### Constructor

> **new CallbackCredentialHolder**(`callbackCredentialHolder`): `CallbackCredentialHolder`

Defined in: [IdentityAssertion.ts:83](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/IdentityAssertion.ts#L83)

#### Parameters

##### callbackCredentialHolder

`unknown`

#### Returns

`CallbackCredentialHolder`

## Methods

### reserveSize()

> **reserveSize**(): `number`

Defined in: [IdentityAssertion.ts:111](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/IdentityAssertion.ts#L111)

#### Returns

`number`

#### Implementation of

[`CallbackCredentialHolderInterface`](../interfaces/CallbackCredentialHolderInterface.md).[`reserveSize`](../interfaces/CallbackCredentialHolderInterface.md#reservesize)

***

### sign()

> **sign**(`payload`): `Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

Defined in: [IdentityAssertion.ts:104](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/IdentityAssertion.ts#L104)

#### Parameters

##### payload

[`SignerPayload`](../interfaces/SignerPayload.md)

#### Returns

`Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

#### Implementation of

[`CallbackCredentialHolderInterface`](../interfaces/CallbackCredentialHolderInterface.md).[`sign`](../interfaces/CallbackCredentialHolderInterface.md#sign)

***

### signer()

> **signer**(): `unknown`

Defined in: [IdentityAssertion.ts:87](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/IdentityAssertion.ts#L87)

#### Returns

`unknown`

#### Implementation of

[`CallbackCredentialHolderInterface`](../interfaces/CallbackCredentialHolderInterface.md).[`signer`](../interfaces/CallbackCredentialHolderInterface.md#signer)

***

### sigType()

> **sigType**(): `string`

Defined in: [IdentityAssertion.ts:117](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/IdentityAssertion.ts#L117)

#### Returns

`string`

#### Implementation of

[`CallbackCredentialHolderInterface`](../interfaces/CallbackCredentialHolderInterface.md).[`sigType`](../interfaces/CallbackCredentialHolderInterface.md#sigtype)

***

### newCallbackCredentialHolder()

> `static` **newCallbackCredentialHolder**(`reserveSize`, `sigType`, `callback`): `CallbackCredentialHolder`

Defined in: [IdentityAssertion.ts:91](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/IdentityAssertion.ts#L91)

#### Parameters

##### reserveSize

`number`

##### sigType

`string`

##### callback

(`signerPayload`) => `Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

#### Returns

`CallbackCredentialHolder`
