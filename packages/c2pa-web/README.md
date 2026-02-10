# c2pa-web

The SDK for interacting with [C2PA metadata](https://c2pa.org/) on the web.

As a guiding philosophy, `c2pa-web` attempts to adhere closely to the API paradigms established by [`c2pa-rs`](https://github.com/contentauth/c2pa-rs).

## Installation

```sh
npm install @contentauth/c2pa-web
```

## Importing the library

There are two ways to import the library, due to [specific requirements](https://developer.mozilla.org/en-US/docs/WebAssembly/Guides/Loading_and_running) for handling Wasm modules: 
- Using a separate Wasm binary, which provides better performance.
- Using an inline Wasm binary, which is more convenient. 

### Using a separate Wasm binary

The recommended way to import the library is to fetch the Wasm binary over the network at runtime. 
This requires that the Wasm binary be hosted separately.

With Vite:

```typescript
import { createC2pa } from '@contentauth/c2pa-web';

import wasmSrc from '@contentauth/c2pa-web/resources/c2pa.wasm?url';

const c2pa = createC2pa({ wasmSrc });
```

Use a solution appropriate to your tooling. Alternatively, you can request the binary from a CDN:

```typescript
import { createC2pa } from '@contentauth/c2pa-web';

// Ensure that [PACKAGE VERSION] matches the currently-installed version of @contentauth/c2pa-web.
const c2pa = await createC2pa({
  wasmSrc:
    'https://cdn.jsdelivr.net/npm/@contentauth/c2pa-web@[PACKAGE VERSION]/dist/resources/c2pa_bg.wasm',
});
```

### Using an inline Wasm binary

Where it is not possible or convenient to request a separate resource over the network, use the `@contentauth/c2pa-web/inline` package, which has the Wasm binary encoded as a base64 string in the JavaScript file. 

Using this package does not require an additional network request. However, it adds _significant_ size to the JavaScript bundle, and cannot take advantage of the higher-performance
[`WebAssembly.compileStreaming()`](https://developer.mozilla.org/en-US/docs/WebAssembly/Reference/JavaScript_interface/compileStreaming_static) API.

```typescript
import { createC2pa } from '@contentauth/c2pa-web/inline';

const c2pa = await createC2pa();
```

## Using the library

See also the [API reference documentation](https://contentauth.github.io/c2pa-js/modules/_contentauth_c2pa-web.html).

### Reading C2PA manifests

Fetch an image and provide it to the `Reader`:

```typescript
const response = await fetch(
  'https://spec.c2pa.org/public-testfiles/image/jpeg/adobe-20220124-C.jpg'
);
const blob = await response.blob();

const reader = await c2pa.reader.fromBlob(blob.type, blob);

const manifestStore = await reader.manifestStore();

console.log(manifestStore);

// Free SDK objects when they are no longer needed to avoid memory leaks.
await reader.free();
```

### Building C2PA manifests with ingredients

Use the `Builder` API to create C2PA manifests and add ingredients (source assets) to document the provenance chain.

#### Setting builder intent

The builder intent describes the type of operation being performed on the asset. This influences how the manifest is structured and what assertions are automatically added.  Use one of these intents:
- `create`: Indicates the asset is a new digital creation, a DigitalSourceType is required. The Manifest must not have have a parent ingredient. A `c2pa.created` action will be added if not provided.
- `edit`: Indicates the asset is an edit of a pre-existing parent asset. The Manifest must have a parent ingredient. A parent ingredient will be generated from the source stream if not otherwise provided. A `c2pa.opened action will be tied to the parent ingredient.
- `update`: A restricted version of `edit` for non-editorial changes. There must be only one ingredient, as a parent. No changes can be made to the hashed content of the parent. There are additional restrictions on the types of changes that can be made.

```typescript
const builder = await c2pa.builder.new();

await builder.setIntent({
  create: 'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia',
});

await builder.setIntent('edit');

await builder.setIntent('update');
```

The `create` intent accepts a `DigitalSourceType` that describes the origin of the asset. Common values include:

- `'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia'` - AI-generated content
- `'http://cv.iptc.org/newscodes/digitalsourcetype/digitalCapture'` - Digital camera capture
- `'http://cv.iptc.org/newscodes/digitalsourcetype/composite'` - Composite of multiple sources

For a complete list of digital source types, see the [C2PA specification](https://c2pa.org/specifications/specifications/2.2/specs/C2PA_Specification.html#_digital_source_type) and [IPTC digital source type vocabulary](https://cv.iptc.org/newscodes/digitalsourcetype).

For more details on builder intents, see the [c2pa-rs Builder documentation](https://docs.rs/c2pa/latest/c2pa/struct.Builder.html).

#### Adding ingredients from blobs

When you have access to the ingredient asset, use `addIngredientFromBlob` to include both the metadata and the asset data:

```typescript
// Fetch or load the ingredient asset
const ingredientResponse = await fetch('path/to/source-image.jpg');
const ingredientBlob = await ingredientResponse.blob();

// Create a builder
const builder = await c2pa.builder.new();

// Add the ingredient with its blob
await builder.addIngredientFromBlob(
  {
    title: 'source-image.jpg',
    format: 'image/jpeg',
    instance_id: 'ingredient-123',
    relationship: 'parentOf',
  },
  'image/jpeg', // Format
  ingredientBlob // The actual asset bytes
);

const definition = await builder.getDefinition();
console.log(definition.ingredients); // Contains the ingredient with embedded data

await builder.free();
```

#### Adding multiple ingredients

You can add multiple ingredients to document complex provenance chains:

```typescript
const builder = await c2pa.builder.new();

// Fetch ingredient assets
const background = await fetch('background.jpg').then((r) => r.blob());
const overlay = await fetch('overlay.png').then((r) => r.blob());

// Add first ingredient
await builder.addIngredientFromBlob(
  {
    title: 'background.jpg',
    format: 'image/jpeg',
    instance_id: 'background-001',
    relationship: 'componentOf',
  },
  'image/jpeg',
  background
);

// Add second ingredient
await builder.addIngredientFromBlob(
  {
    title: 'overlay.png',
    format: 'image/png',
    instance_id: 'overlay-002',
    relationship: 'componentOf',
  },
  'image/png',
  overlay
);

const definition = await builder.getDefinition();
console.log(definition.ingredients.length); // 2

await builder.free();
```

#### Creating and reusing builder archives

Use a builder archive to save a builder's state (including ingredients) and reuse it later:

```typescript
// Create a builder with ingredients
const builder = await c2pa.builder.new();

const ingredientBlob = await fetch('source.jpg').then((r) => r.blob());
await builder.addIngredientFromBlob(
  {
    title: 'source.jpg',
    format: 'image/jpeg',
    instance_id: 'source-123',
  },
  'image/jpeg',
  ingredientBlob
);

// Save as an archive
const archive = await builder.toArchive();
await builder.free();

// Later, recreate the builder from the archive
const restoredBuilder = await c2pa.builder.fromArchive(new Blob([archive]));

// The ingredients are preserved
const definition = await restoredBuilder.getDefinition();
console.log(definition.ingredients); // Contains the ingredient

await restoredBuilder.free();
```

#### Ingredient properties

The `Ingredient` type supports a number of properties, including:

- `title`: Human-readable title for the ingredient.
- `format`: MIME type of the ingredient asset (e.g., `'image/jpeg'`).
- `instance_id`: Unique identifier for this specific instance.
- `document_id` (optional): Identifier for the source document.
- `relationship` (optional): Relationship to the parent asset (`'parentOf'`, `'componentOf'`, etc.)
- `thumbnail` (optional): Thumbnail reference for the ingredient.
- `validation_status` (optional): Validation results if the ingredient has C2PA data.

For the full list, see the [API reference](https://contentauth.github.io/c2pa-js/interfaces/_contentauth_c2pa-web.index.Ingredient.html).

## Library development

### Prerequsities

Ensure the repo-wide prerequisites [NX](https://nx.dev/getting-started/intro) and [pnpm](https://pnpm.io/) are installed.

[`c2pa-wasm`'s prerequisites](https://github.com/contentauth/c2pa-js-v2/tree/main/packages/c2pa-wasm) must also be installed.

### Building

To build the library:

```sh
nx build c2pa-web
```

### Testing

This library relies on [Vitest](https://vitest.dev/) to run its tests in a headless browser. Before the tests can be run, the test browser binaries must be installed:

```sh
pnpx playwright install
```

To run the tests:

```
nx test c2pa-web
```
