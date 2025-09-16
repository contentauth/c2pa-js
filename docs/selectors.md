---
id: selectors
title: Selectors
---

[Selectors](https://github.com/contentauth/c2pa-js/tree/main/packages/c2pa/src/selectors) are convenience functions that return useful data from manifest objects. The selector functions are:

- [`selectEditsAndActivity`](../../js-sdk/api/c2pa.selecteditsandactivity) - Returns a formatted list of manifest edits and activity.
- [`selectProducer`](../../js-sdk/api/c2pa.selectproducer) - Returns information on the producer of an asset.
- [`selectSocialAccounts`](../../js-sdk/api/c2pa.selectsocialaccounts) - Returns social accounts associated with the producer of a manifest, if available.

For instance, you can use [`selectProducer`](../../js-sdk/api/c2pa.selectproducer) to get information on the producer of an asset as follows:

```typescript
import { selectProducer } from 'c2pa';

const producer = selectProducer(manifest);
```

Without using a selector, finding this information requires locating the `stds.schema-org.CreativeWork` assertion and having familiarity with its structure. As you can see, the code is much more complicated:

```typescript
function selectProducer(manifest) {
  const cwAssertion = manifest.assertions.get('stds.schema-org.CreativeWork');
  return assertion.author?.find((x) => !x.hasOwnProperty('@id'));
}
```

Some selectors may involve complex, possibly asynchronous operations. For example, [`selectEditsAndActivity`](../../js-sdk/api/c2pa.selecteditsandactivity) abstracts a complex operation involving multiple manifest assertions and remote resources to return a formatted list of edits and activity described within a manifest:

```typescript
import { selectEditsAndActivity } from 'c2pa';

const editsAndActivity = await selectEditsAndActivity(manifest);
```

The result is an `editsAndActivity` object such as this:

```js
[
  {
    id: 'COLOR_ADJUSTMENTS',
    icon: 'https://cai-assertions.adobe.com/icons/color-palette-dark.svg',
    label: 'Color adjustments',
    description: 'Changed tone, saturation, etc.'
  },
  {
    id: 'IMPORT',
    icon: 'https://cai-assertions.adobe.com/icons/import-dark.svg',
    label: 'Imported assets',
    description: 'Added images, videos, etc.'
  },
  {
    id: 'TRANSFORM',
    icon: 'https://cai-assertions.adobe.com/icons/group-dark.svg',
    label: 'Size and position adjustments',
    description: 'Changed size, orientation, direction, or position'
  }
]
```
