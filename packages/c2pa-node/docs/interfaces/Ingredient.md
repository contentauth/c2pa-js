[**c2pa-node**](../README.md)

***

[c2pa-node](../README.md) / Ingredient

# Interface: Ingredient

Defined in: [types.d.ts:214](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L214)

An `Ingredient` is any external asset that has been used in the creation of an image

## Indexable

\[`k`: `string`\]: `unknown`

## Properties

### active\_manifest?

> `optional` **active\_manifest**: `string`

Defined in: [types.d.ts:222](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L222)

The active manifest label (if one exists)

If this ingredient has a [`ManifestStore`], this will hold the label of the active [`Manifest`]

[`Manifest`]: crate::Manifest [`ManifestStore`]: crate::ManifestStore

***

### data?

> `optional` **data**: [`ResourceRef`](ResourceRef.md)

Defined in: [types.d.ts:226](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L226)

A reference to the actual data of the ingredient

***

### description?

> `optional` **description**: `string`

Defined in: [types.d.ts:230](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L230)

Additional description of the ingredient

***

### document\_id?

> `optional` **document\_id**: `string`

Defined in: [types.d.ts:234](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L234)

Document ID from `xmpMM:DocumentID` in XMP metadata

***

### format?

> `optional` **format**: `string`

Defined in: [types.d.ts:238](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L238)

The format of the source file as a MIME type

***

### hash?

> `optional` **hash**: `string`

Defined in: [types.d.ts:242](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L242)

An optional hash of the asset to prevent duplicates

***

### informational\_URI?

> `optional` **informational\_URI**: `string`

Defined in: [types.d.ts:246](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L246)

URI to an informational page about the ingredient or its data

***

### instance\_id?

> `optional` **instance\_id**: `string`

Defined in: [types.d.ts:250](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L250)

Instance ID from `xmpMM:InstanceID` in XMP metadata

***

### manifest\_data?

> `optional` **manifest\_data**: [`ResourceRef`](ResourceRef.md)

Defined in: [types.d.ts:256](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L256)

A [`ManifestStore`] from the source asset extracted as a binary C2PA blob

[`ManifestStore`]: crate::ManifestStore

***

### metadata?

> `optional` **metadata**: [`Metadata`](Metadata.md)

Defined in: [types.d.ts:262](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L262)

Any additional [`Metadata`] as defined in the C2PA spec

[`Manifest`]: crate::Manifest

***

### provenance?

> `optional` **provenance**: `string`

Defined in: [types.d.ts:266](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L266)

URI from `dcterms:provenance` in XMP metadata

***

### relationship?

> `optional` **relationship**: `"componentOf"` \| `"parentOf"` \| `"inputTo"`

Defined in: [types.d.ts:272](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L272)

Set to `ParentOf` if this is the parent ingredient

There can only be one parent ingredient in the ingredients

***

### resources?

> `optional` **resources**: [`ResourceStore`](ResourceStore.md)

Defined in: [types.d.ts:273](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L273)

***

### thumbnail?

> `optional` **thumbnail**: [`ResourceRef`](ResourceRef.md)

Defined in: [types.d.ts:279](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L279)

A thumbnail image capturing the visual state at the time of import

A tuple of thumbnail MIME format (i.e. `image/jpeg`) and binary bits of the image

***

### title

> **title**: `string`

Defined in: [types.d.ts:283](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L283)

A human-readable title, generally source filename

***

### validation\_status?

> `optional` **validation\_status**: [`ValidationStatus`](ValidationStatus.md)[]

Defined in: [types.d.ts:287](https://github.com/contentauth/c2pa-node-v2/blob/89b34f9846b48a2d62e217587555c0cf0305136a/js-src/types.d.ts#L287)

Validation results
