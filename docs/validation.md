# Validation

Part of processing an asset involves [validating the manifests](https://c2pa.org/specifications/specifications/1.4/specs/C2PA_Specification.html#_validation) that it contains. During validation, errors can occur in the active manifest and in ingredients.

## Validation errors in the active manifest

When [c2pa.read](../api/c2pa.c2pa#methods) loads C2PA assets, it validates the current manifest and assigns any [failure codes](https://c2pa.org/specifications/specifications/1.4/specs/C2PA_Specification.html#_failure_codes) to the `manifestStore.validationStatus` array.

Manifest validation errors can occur when:

- The bits of an asset were edited after it was signed.
- A claim or assertion was missing or tampered with.
- The manifest was signed with an invalid credential.

## Validation errors in ingredients

[Ingredients](../../introduction#key-concepts) are validated when they are imported into an asset. The results of this are stored in the manifest in the ingredient's [`validationStatus`](https://c2pa.org/specifications/specifications/1.4/specs/C2PA_Specification.html#_existing_manifests) object, which contains both [success](https://c2pa.org/specifications/specifications/1.4/specs/C2PA_Specification.html#_success_codes) and [failure](https://c2pa.org/specifications/specifications/1.4/specs/C2PA_Specification.html#_failure_codes) codes that represent the results of all of the validation checks that took place.

Access validation errors in ingredients in JavaScript code as follows:

```typescript
manifest.ingredients.forEach((ingredient) => {
  console.log('validationStatus', data.ingredient.validationStatus);
});
```

:::note
The `validationStatus` array only reports failure `validationStatus` codes since success codes are informational only.
:::

## Asset processing errors

Errors can also occur when trying to process an asset, which will throw a JavaScript error when calling [c2pa.read](../api/c2pa.c2pa#methods). Capture these errors by surrounding `c2pa.read` in a `try...catch` block. For example:

```typescript
try {
  const { manifestStore } = await c2pa.read(sampleImage);
  console.log('manifestStore', manifestStore);
} catch (err) {
  console.error('Error reading image:', err);
}
```

Errors have a name that corresponds with an [`c2pa::Error` enum variant](https://docs.rs/c2pa/latest/c2pa/enum.Error.html), surrounded with `C2pa()`, for instance `C2pa(UnsupportedType)`.

Events that can cause an error include passing in an asset that:

- Is not a supported file type (for example, `image/jpeg`, `image/png`).
- Contains corrupted data.
