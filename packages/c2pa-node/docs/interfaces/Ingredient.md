[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / Ingredient

# Interface: Ingredient

Defined in: [types.d.ts:236](https://github.com/contentauth/c2pa-node-v2/blob/92024140271b3589278f2b732abca2c4a33b231a/js-src/types.d.ts#L236)

An `Ingredient` is any external asset that has been used in the creation of an image

## Indexable

\[`k`: `string`\]: `unknown`

## Properties

### active\_manifest?

> `optional` **active\_manifest**: `string`

Defined in: [types.d.ts:244](https://github.com/contentauth/c2pa-node-v2/blob/92024140271b3589278f2b732abca2c4a33b231a/js-src/types.d.ts#L244)

The active manifest label (if one exists)

If this ingredient has a [`ManifestStore`], this will hold the label of the active [`Manifest`]

[`Manifest`]: crate::Manifest [`ManifestStore`]: crate::ManifestStore

***

### data?

> `optional` **data**: [`ResourceRef`](ResourceRef.md)

Defined in: [types.d.ts:248](https://github.com/contentauth/c2pa-node-v2/blob/92024140271b3589278f2b732abca2c4a33b231a/js-src/types.d.ts#L248)

A reference to the actual data of the ingredient

***

### description?

> `optional` **description**: `string`

Defined in: [types.d.ts:252](https://github.com/contentauth/c2pa-node-v2/blob/92024140271b3589278f2b732abca2c4a33b231a/js-src/types.d.ts#L252)

Additional description of the ingredient

***

### document\_id?

> `optional` **document\_id**: `string`

Defined in: [types.d.ts:256](https://github.com/contentauth/c2pa-node-v2/blob/92024140271b3589278f2b732abca2c4a33b231a/js-src/types.d.ts#L256)

Document ID from `xmpMM:DocumentID` in XMP metadata

***

### format?

> `optional` **format**: `string`

Defined in: [types.d.ts:260](https://github.com/contentauth/c2pa-node-v2/blob/92024140271b3589278f2b732abca2c4a33b231a/js-src/types.d.ts#L260)

The format of the source file as a MIME type

***

### hash?

> `optional` **hash**: `string`

Defined in: [types.d.ts:264](https://github.com/contentauth/c2pa-node-v2/blob/92024140271b3589278f2b732abca2c4a33b231a/js-src/types.d.ts#L264)

An optional hash of the asset to prevent duplicates

***

### informational\_URI?

> `optional` **informational\_URI**: `string`

Defined in: [types.d.ts:268](https://github.com/contentauth/c2pa-node-v2/blob/92024140271b3589278f2b732abca2c4a33b231a/js-src/types.d.ts#L268)

URI to an informational page about the ingredient or its data

***

### instance\_id?

> `optional` **instance\_id**: `string`

Defined in: [types.d.ts:272](https://github.com/contentauth/c2pa-node-v2/blob/92024140271b3589278f2b732abca2c4a33b231a/js-src/types.d.ts#L272)

Instance ID from `xmpMM:InstanceID` in XMP metadata

***

### manifest\_data?

> `optional` **manifest\_data**: [`ResourceRef`](ResourceRef.md)

Defined in: [types.d.ts:278](https://github.com/contentauth/c2pa-node-v2/blob/92024140271b3589278f2b732abca2c4a33b231a/js-src/types.d.ts#L278)

A [`ManifestStore`] from the source asset extracted as a binary C2PA blob

[`ManifestStore`]: crate::ManifestStore

***

### metadata?

> `optional` **metadata**: [`Metadata`](Metadata.md)

Defined in: [types.d.ts:284](https://github.com/contentauth/c2pa-node-v2/blob/92024140271b3589278f2b732abca2c4a33b231a/js-src/types.d.ts#L284)

Any additional [`Metadata`] as defined in the C2PA spec

[`Manifest`]: crate::Manifest

***

### provenance?

> `optional` **provenance**: `string`

Defined in: [types.d.ts:288](https://github.com/contentauth/c2pa-node-v2/blob/92024140271b3589278f2b732abca2c4a33b231a/js-src/types.d.ts#L288)

URI from `dcterms:provenance` in XMP metadata

***

### relationship?

> `optional` **relationship**: `"componentOf"` \| `"parentOf"` \| `"inputTo"`

Defined in: [types.d.ts:294](https://github.com/contentauth/c2pa-node-v2/blob/92024140271b3589278f2b732abca2c4a33b231a/js-src/types.d.ts#L294)

Set to `ParentOf` if this is the parent ingredient

There can only be one parent ingredient in the ingredients

***

### resources?

> `optional` **resources**: [`ResourceStore`](ResourceStore.md)

Defined in: [types.d.ts:295](https://github.com/contentauth/c2pa-node-v2/blob/92024140271b3589278f2b732abca2c4a33b231a/js-src/types.d.ts#L295)

***

### thumbnail?

> `optional` **thumbnail**: [`ResourceRef`](ResourceRef.md)

Defined in: [types.d.ts:301](https://github.com/contentauth/c2pa-node-v2/blob/92024140271b3589278f2b732abca2c4a33b231a/js-src/types.d.ts#L301)

A thumbnail image capturing the visual state at the time of import

A tuple of thumbnail MIME format (i.e. `image/jpeg`) and binary bits of the image

***

### title

> **title**: `string`

Defined in: [types.d.ts:305](https://github.com/contentauth/c2pa-node-v2/blob/92024140271b3589278f2b732abca2c4a33b231a/js-src/types.d.ts#L305)

A human-readable title, generally source filename

***

### validation\_status?

> `optional` **validation\_status**: [`ValidationStatus`](ValidationStatus.md)[]

Defined in: [types.d.ts:309](https://github.com/contentauth/c2pa-node-v2/blob/92024140271b3589278f2b732abca2c4a33b231a/js-src/types.d.ts#L309)

Validation results
