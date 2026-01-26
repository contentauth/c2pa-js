# c2pa-web

The SDK for interacting with [C2PA metadata](https://c2pa.org/) on the web.

As a guiding philosophy, `c2pa-web` attempts to adhere closely to the API paradigms established by [`c2pa-rs`](https://github.com/contentauth/c2pa-rs).

## Installation

```sh
npm install @contentauth/c2pa-web
```

## Quickstart

### Importing

Due to [specific requirements](https://developer.mozilla.org/en-US/docs/WebAssembly/Guides/Loading_and_running) around handling WASM modules, there are two methods of importing the library. One optimizes for performance, the other for convenience.

#### With a separate WASM binary (performance)

The recommended method of using the library requires that the WASM binary be hosted separately, to be fetched over the network at runtime.

With Vite:

```typescript
import { createC2pa } from '@contentauth/c2pa-web';

import wasmSrc from '@contentauth/c2pa-web/resources/c2pa.wasm?url';

const c2pa = createC2pa({ wasmSrc });
```

Use a solution appropriate to your tooling. Alternatively, the binary can be requested from a CDN:

```typescript
import { createC2pa } from '@contentauth/c2pa-web';

// Ensure that [PACKAGE VERSION] matches the currently-installed version of @contentauth/c2pa-web.
const c2pa = await createC2pa({
  wasmSrc:
    'https://cdn.jsdelivr.net/npm/@contentauth/c2pa-web@[PACKAGE VERSION]/dist/resources/c2pa_bg.wasm',
});
```

#### With an inlined WASM binary (convenience)

In environments where it is not possible or not convenient to request a separate resource over the network, the "inline" SDK can be used. The WASM binary is encoded as a base64 string and included in the JavaScript file, so no (additional) network request is necessary. However, this adds _significant_ size to the JavaScript bundle, and cannot take advantage of the higher-performance
[`WebAssembly.compileStreaming()`](https://developer.mozilla.org/en-US/docs/WebAssembly/Reference/JavaScript_interface/compileStreaming_static) API.

```typescript
import { createC2pa } from '@contentauth/c2pa-web/inline';

const c2pa = await createC2pa();
```

### Use

#### Reading C2PA Manifests

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

#### Building C2PA Manifests with Ingredients

The `Builder` API allows you to create C2PA manifests and add ingredients (source assets) to document the provenance chain.

##### Adding Ingredients from Definitions

You can add ingredients using just their metadata when the ingredient assets are referenced externally or stored separately:

```typescript
// Create a new builder
const builder = await c2pa.builder.new();

// Add an ingredient with metadata only
await builder.addIngredient({
  title: 'source-image.jpg',
  format: 'image/jpeg',
  instance_id: 'xmp:iid:12345678',
  document_id: 'xmp:did:87654321',
  relationship: 'parentOf',
});

// Get the manifest definition
const definition = await builder.getDefinition();
console.log(definition.ingredients); // Contains the ingredient

// Clean up
await builder.free();
```

##### Adding Ingredients from Blobs

When you have access to the ingredient asset itself, use `addIngredientFromBlob` to include both the metadata and the asset data:

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

##### Adding Multiple Ingredients

You can add multiple ingredients to document complex provenance chains:

```typescript
const builder = await c2pa.builder.new();

// Add first ingredient
await builder.addIngredient({
  title: 'background.jpg',
  format: 'image/jpeg',
  instance_id: 'background-001',
  relationship: 'componentOf',
});

// Add second ingredient
await builder.addIngredient({
  title: 'overlay.png',
  format: 'image/png',
  instance_id: 'overlay-002',
  relationship: 'componentOf',
});

const definition = await builder.getDefinition();
console.log(definition.ingredients.length); // 2

await builder.free();
```

##### Creating and Reusing Builder Archives

Builder archives allow you to save a builder's state (including ingredients) and reuse it later:

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

##### Ingredient Properties

The `Ingredient` type supports the following properties:

- `title`: Human-readable title for the ingredient
- `format`: MIME type of the ingredient asset (e.g., `'image/jpeg'`)
- `instance_id`: Unique identifier for this specific instance
- `document_id` (optional): Identifier for the source document
- `relationship` (optional): Relationship to the parent asset (`'parentOf'`, `'componentOf'`, etc.)
- `thumbnail` (optional): Thumbnail reference for the ingredient
- `validation_status` (optional): Validation results if the ingredient has C2PA data

For complete type definitions, see the [API reference](https://contentauth.github.io/c2pa-js/modules/_contentauth_c2pa-web.html).

## Api reference

API docs are available [here](https://contentauth.github.io/c2pa-js/modules/_contentauth_c2pa-web.html).

## Development

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
