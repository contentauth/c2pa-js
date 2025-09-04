[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / Ingredient

# Interface: Ingredient

Defined in: [types.d.ts:235](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L235)

An `Ingredient` is any external asset that has been used in the creation of an image

## Indexable

\[`k`: `string`\]: `unknown`

## Properties

### active\_manifest?

> `optional` **active\_manifest**: `string`

Defined in: [types.d.ts:243](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L243)

The active manifest label (if one exists)

If this ingredient has a [`ManifestStore`], this will hold the label of the active [`Manifest`]

[`Manifest`]: crate::Manifest [`ManifestStore`]: crate::ManifestStore

***

### data?

> `optional` **data**: [`ResourceRef`](ResourceRef.md)

Defined in: [types.d.ts:247](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L247)

A reference to the actual data of the ingredient

***

### description?

> `optional` **description**: `string`

Defined in: [types.d.ts:251](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L251)

Additional description of the ingredient

***

### document\_id?

> `optional` **document\_id**: `string`

Defined in: [types.d.ts:255](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L255)

Document ID from `xmpMM:DocumentID` in XMP metadata

***

### format?

> `optional` **format**: `string`

Defined in: [types.d.ts:259](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L259)

The format of the source file as a MIME type

***

### hash?

> `optional` **hash**: `string`

Defined in: [types.d.ts:263](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L263)

An optional hash of the asset to prevent duplicates

***

### informational\_URI?

> `optional` **informational\_URI**: `string`

Defined in: [types.d.ts:267](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L267)

URI to an informational page about the ingredient or its data

***

### instance\_id?

> `optional` **instance\_id**: `string`

Defined in: [types.d.ts:271](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L271)

Instance ID from `xmpMM:InstanceID` in XMP metadata

***

### manifest\_data?

> `optional` **manifest\_data**: [`ResourceRef`](ResourceRef.md)

Defined in: [types.d.ts:277](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L277)

A [`ManifestStore`] from the source asset extracted as a binary C2PA blob

[`ManifestStore`]: crate::ManifestStore

***

### metadata?

> `optional` **metadata**: [`Metadata`](Metadata.md)

Defined in: [types.d.ts:283](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L283)

Any additional [`Metadata`] as defined in the C2PA spec

[`Manifest`]: crate::Manifest

***

### provenance?

> `optional` **provenance**: `string`

Defined in: [types.d.ts:287](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L287)

URI from `dcterms:provenance` in XMP metadata

***

### relationship?

> `optional` **relationship**: `"parentOf"` \| `"componentOf"` \| `"inputTo"`

Defined in: [types.d.ts:293](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L293)

Set to `ParentOf` if this is the parent ingredient

There can only be one parent ingredient in the ingredients

***

### resources?

> `optional` **resources**: [`ResourceStore`](ResourceStore.md)

Defined in: [types.d.ts:294](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L294)

***

### thumbnail?

> `optional` **thumbnail**: [`ResourceRef`](ResourceRef.md)

Defined in: [types.d.ts:300](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L300)

A thumbnail image capturing the visual state at the time of import

A tuple of thumbnail MIME format (i.e. `image/jpeg`) and binary bits of the image

***

### title

> **title**: `string`

Defined in: [types.d.ts:304](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L304)

A human-readable title, generally source filename

***

### validation\_status?

> `optional` **validation\_status**: [`ValidationStatus`](ValidationStatus.md)[]

Defined in: [types.d.ts:308](https://github.com/contentauth/c2pa-node-v2/blob/280e70a4878b95c480efb475988df1206fe5da39/js-src/types.d.ts#L308)

Validation results
