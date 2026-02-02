# C2PA Node.js library

The [c2pa-node-v2](https://github.com/contentauth/c2pa-node-v2) repository implements a Node.js API that can:
- Read and validate C2PA data from media files in supported formats.
- Add signed manifests to media files in supported formats.

**WARNING**: This is an early version of this library, and there may be bugs and unimplemented features.

## Prerequisites

To use the C2PA Node library, you must install:
- A [supported version of Node](https://github.com/neon-bindings/neon#platform-support).
- [Rust](https://www.rust-lang.org/tools/install).

If you need to manage multiple versions of Node on your machine, use a tool such as [nvm](https://github.com/nvm-sh/nvm).

## Installation

### Installing for use in an app

Using npm:

```sh
$ npm install @contentauth/c2pa-node
```

Using Yarn:

```sh
$ yarn add @contentauth/c2pa-node
```

Using pnpm:

```sh
$ pnpm add @contentauth/c2pa-node
```

This command will download precompiled binaries for the following systems:

- Linux x86_64
- Linux aarch64 (ARM)
- macOS aarch64 (Apple Silicon)
- macOS x86_64 (Intel Mac)
- Windows x86
- Windows ARM

## Components

### Reader

The `Reader` class is used to read and validate C2PA manifests from media files. It can parse embedded manifests or fetch remote manifests. Refer to the [Rust SDK](https://github.com/contentauth/c2pa-rs) for the list of settings and their effects.

```javascript
import { Reader } from '@contentauth/c2pa-node';

// Read from an asset file
const reader = await Reader.fromAsset(inputAsset);

// Read with custom settings
const settings = {
  verify: {
    verify_after_reading: false,
    verify_trust: true
  }
};
const reader = await Reader.fromAsset(inputAsset, settings);

// Read from manifest data and asset
const reader = await Reader.fromManifestDataAndAsset(manifestData, asset);

// Get the manifest store as JSON
const manifestStore = reader.json();

// Get the active manifest
const activeManifest = reader.getActive();

// Check if manifest is embedded
const isEmbedded = reader.isEmbedded();

// Get remote URL if applicable
const remoteUrl = reader.remoteUrl();
```

### Builder

The `Builder` class is the main component for creating and signing C2PA manifests. It provides methods to add assertions, resources, and ingredients to manifests, and handles the signing process. Use the `Signer` class to sign the manifests. Refer to the [Rust SDK](https://github.com/contentauth/c2pa-rs) for the list of settings and their effects.

```javascript
import { Builder } from '@contentauth/c2pa-node';

// Create a new builder
const builder = Builder.new();

// Create with custom settings
const settings = {
  builder: {
    generate_c2pa_archive: true
  }
};
const builder = Builder.new(settings);

// Or create from an existing manifest definition
const builder = Builder.withJson(manifestDefinition);

// Or create with both manifest and settings
const builder = Builder.withJson(manifestDefinition, settings);

// Add assertions to the manifest
builder.addAssertion('c2pa.actions', actionsAssertion);

// Add resources
await builder.addResource('resource://example', resourceAsset);

// Sign the manifest
const manifest = builder.sign(signer, inputAsset, outputAsset);
```

#### Setting Builder Intent

The builder intent describes the type of operation being performed on the asset. This influences how the manifest is structured and what assertions are automatically added.

`create`: This is a new digital creation, a DigitalSourceType is required. The Manifest must not have a parent ingredient. A `c2pa.created` action will be added if not provided.

`edit`: This is an edit of a pre-existing parent asset. The Manifest must have a parent ingredient. A parent ingredient will be generated from the source stream if not otherwise provided. A `c2pa.opened` action will be tied to the parent ingredient.

`update`: A restricted version of Edit for non-editorial changes. There must be only one ingredient, as a parent. No changes can be made to the hashed content of the parent. There are additional restrictions on the types of changes that can be made.

```javascript
const builder = Builder.new();

builder.setIntent({
  create: 'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia',
});

builder.setIntent('edit');

builder.setIntent('update');
```

The `create` intent accepts a `DigitalSourceType` that describes the origin of the asset. Common values include:

- `'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia'` - AI-generated content
- `'http://cv.iptc.org/newscodes/digitalsourcetype/digitalCapture'` - Digital camera capture
- `'http://cv.iptc.org/newscodes/digitalsourcetype/composite'` - Composite of multiple sources

For a complete list of digital source types, see the [C2PA specification](https://c2pa.org/specifications/specifications/2.2/specs/C2PA_Specification.html#_digital_source_type) and [IPTC digital source type vocabulary](https://cv.iptc.org/newscodes/digitalsourcetype).

For more details on builder intents, see the [c2pa-rs Builder documentation](https://docs.rs/c2pa/latest/c2pa/struct.Builder.html).

#### Adding Ingredients from Assets

When you have access to the ingredient asset, use `addIngredient` with an asset to include both the metadata and the asset data:

```javascript
import * as fs from "node:fs/promises";

// Load the ingredient asset
const ingredientBuffer = await fs.readFile('path/to/source-image.jpg');

// Create a builder
const builder = Builder.new();

// Add the ingredient with its asset
await builder.addIngredient(
  JSON.stringify({
    title: 'source-image.jpg',
    format: 'image/jpeg',
    instance_id: 'ingredient-123',
    relationship: 'parentOf',
  }),
  {
    buffer: ingredientBuffer,
    mimeType: 'image/jpeg',
  }
);

const definition = builder.getManifestDefinition();
console.log(definition.ingredients); // Contains the ingredient with embedded data
```

#### Adding Multiple Ingredients

You can add multiple ingredients to document complex provenance chains:

```javascript
const builder = Builder.new();

// Load ingredient assets
const background = await fs.promises.readFile('background.jpg');
const overlay = await fs.promises.readFile('overlay.png');

// Add first ingredient
await builder.addIngredient(
  JSON.stringify({
    title: 'background.jpg',
    format: 'image/jpeg',
    instance_id: 'background-001',
    relationship: 'componentOf',
  }),
  {
    buffer: background,
    mimeType: 'image/jpeg',
  }
);

// Add second ingredient
await builder.addIngredient(
  JSON.stringify({
    title: 'overlay.png',
    format: 'image/png',
    instance_id: 'overlay-002',
    relationship: 'componentOf',
  }),
  {
    buffer: overlay,
    mimeType: 'image/png',
  }
);

const definition = builder.getManifestDefinition();
console.log(definition.ingredients.length); // 2
```

#### Adding Ingredients from Readers

You can also add ingredients directly from a `Reader` object, which automatically includes the C2PA data:

```javascript
// Read an existing C2PA asset
const sourceReader = await Reader.fromAsset({
  path: 'source-image.jpg',
});

// Create a builder
const builder = Builder.new();

// Add ingredient from reader
const ingredient = builder.addIngredientFromReader(sourceReader);

console.log(ingredient.title); // Contains ingredient metadata
```

#### Creating and Reusing Builder Archives

Builder archives allow you to save a builder's state (including ingredients) and reuse it later:

```javascript
// Create a builder with ingredients
const builder = Builder.new();

const ingredientBuffer = await fs.promises.readFile('source.jpg');
await builder.addIngredient(
  JSON.stringify({
    title: 'source.jpg',
    format: 'image/jpeg',
    instance_id: 'source-123',
  }),
  {
    buffer: ingredientBuffer,
    mimeType: 'image/jpeg',
  }
);

// Save as an archive
await builder.toArchive({ path: 'builder-archive.zip' });

// Later, recreate the builder from the archive
const restoredBuilder = await Builder.fromArchive({ path: 'builder-archive.zip' });

// The ingredients are preserved
const definition = restoredBuilder.getManifestDefinition();
console.log(definition.ingredients); // Contains the ingredient
```

For complete type definitions, see the [@contentauth/c2pa-types](https://www.npmjs.com/package/@contentauth/c2pa-types) package.

### Signers

The library provides several types of signers for different use cases:

#### LocalSigner

For local signing with certificates and private keys:

```javascript
import { LocalSigner } from '@contentauth/c2pa-node';

// Create a local signer with certificate and private key
const signer = LocalSigner.newSigner(
  certificateBuffer,
  privateKeyBuffer,
  'es256', // signing algorithm
  'https://timestamp.example.com' // optional TSA URL
);

// Sign data
const signature = signer.sign(dataBuffer);
```

#### CallbackSigner

For custom signing implementations using callbacks:

```javascript
import { CallbackSigner } from '@contentauth/c2pa-node';

// Create a callback signer
const signer = CallbackSigner.newSigner(
  {
    alg: 'es256',
    certs: [certificateBuffer],
    reserveSize: 1024, // Reserved size in bytes for the C2PA Claim Signature box.
    tsaUrl: 'https://timestamp.example.com'
  },
  async (data) => {
    // Custom signing logic
    return await customSigningFunction(data);
  }
);
```

### Identity Assertion Components

For working with identity assertions and CAWG (Content Authenticity Working Group) identities:

#### IdentityAssertionBuilder

Builds identity assertions with roles and referenced assertions:

```javascript
import { IdentityAssertionBuilder, CallbackCredentialHolder } from '@contentauth/c2pa-node';

// Create a credential holder
const credentialHolder = CallbackCredentialHolder.newCallbackCredentialHolder(
  1024,     // reserveSize
  'es256',  // sigType
  async (payload) => {
    // Custom signing logic for identity assertions
    return await signIdentityPayload(payload);
  }
);

// Create an identity assertion builder
const identityBuilder = await IdentityAssertionBuilder.identityBuilderForCredentialHolder(
  credentialHolder
);

// Add roles and referenced assertions
identityBuilder.addRoles(['photographer', 'editor']);
identityBuilder.addReferencedAssertions(['c2pa.actions']);
```

#### IdentityAssertionSigner

Signs manifests with identity assertions:

```javascript
import { IdentityAssertionSigner } from '@contentauth/c2pa-node';

// Create an identity assertion signer
const identitySigner = IdentityAssertionSigner.new(callbackSigner);

// Add identity assertion
identitySigner.addIdentityAssertion(identityBuilder);

// Use with Builder for signing
const manifest = await builder.signAsync(identitySigner, inputAsset, outputAsset);
```

### Trustmark

The `Trustmark` class provides functionality for encoding and decoding trustmarks in images:

```javascript
import { Trustmark } from '@contentauth/c2pa-node';

// Create a trustmark instance
const trustmark = await Trustmark.newTrustmark({
  // trustmark configuration
});

// Encode a trustmark into an image
const encodedImage = await trustmark.encode(
  imageBuffer,
  0.5, // strength
  'watermark-text' // optional watermark
);

// Decode a trustmark from an image
const decodedData = await trustmark.decode(imageBuffer);
```

### Settings and Configuration

The library provides comprehensive settings management that can be configured per Reader/Builder instance or using helper functions. Refer to the [Rust SDK](https://github.com/contentauth/c2pa-rs) for the list of settings and their effects.

#### Per-Instance Settings

Settings can be passed directly to `Reader` and `Builder` constructors:

```javascript
import { Reader, Builder } from '@contentauth/c2pa-node';

// Create settings object
const settings = {
  verify: {
    verify_after_reading: false,
    verify_after_sign: false,
    verify_trust: true,
    ocsp_fetch: true
  },
  trust: {
    verify_trust_list: true,
    trust_anchors: "path/to/anchors.pem"
  }
};

// Pass settings to Reader
const reader = await Reader.fromAsset(inputAsset, settings);

// Pass settings to Builder
const builder = Builder.new(settings);

// Settings can also be JSON strings
const settingsJson = JSON.stringify(settings);
const builder2 = Builder.new(settingsJson);
```

#### Settings Helper Functions

The library provides helper functions to create and manage settings objects:

```javascript
import {
  createTrustSettings,
  createCawgTrustSettings,
  createVerifySettings,
  mergeSettings,
  settingsToJson,
  loadSettingsFromFile,
  loadSettingsFromUrl
} from '@contentauth/c2pa-node';

// Create trust settings
const trustSettings = createTrustSettings({
  verifyTrustList: true,
  userAnchors: "path/to/user-anchors.pem",
  trustAnchors: "path/to/trust-anchors.pem",
  allowedList: "path/to/allowed-list.pem"
});

// Create CAWG trust settings
const cawgTrustSettings = createCawgTrustSettings({
  verifyTrustList: true,
  trustAnchors: "path/to/cawg-anchors.pem"
});

// Create verify settings
const verifySettings = createVerifySettings({
  verifyAfterReading: false,
  verifyAfterSign: false,
  verifyTrust: true,
  verifyTimestampTrust: true,
  ocspFetch: true,
  remoteManifestFetch: true,
  skipIngredientConflictResolution: false,
  strictV1Validation: false
});

// Merge multiple settings
const combinedSettings = mergeSettings(trustSettings, verifySettings);

// Convert settings to JSON string
const jsonString = settingsToJson(combinedSettings);

// Load settings from file (JSON or TOML)
const fileSettings = await loadSettingsFromFile('./c2pa-settings.toml');
const reader = await Reader.fromAsset(inputAsset, fileSettings);

// Load settings from URL
const urlSettings = await loadSettingsFromUrl('https://example.com/c2pa-settings.json');
const builder = Builder.new(urlSettings);
```

#### Available Settings

**Trust Settings:**
- `verifyTrustList` - Whether to verify against the trust list
- `userAnchors` - User-provided trust anchors (PEM format or path)
- `trustAnchors` - Trust anchors for validation (PEM format or path)
- `trustConfig` - Path to trust configuration file
- `allowedList` - Allowed list of certificates (PEM format or path)

**Verify Settings:**
- `verifyAfterReading` - Whether to verify after reading a manifest
- `verifyAfterSign` - Whether to verify after signing a manifest
- `verifyTrust` - Whether to verify trust during validation
- `verifyTimestampTrust` - Whether to verify timestamp trust
- `ocspFetch` - Whether to fetch OCSP responses
- `remoteManifestFetch` - Whether to fetch remote manifests
- `skipIngredientConflictResolution` - Whether to skip ingredient conflict resolution
- `strictV1Validation` - Whether to use strict v1 validation

**Builder Settings:**
- `generate_c2pa_archive` - Whether to generate C2PA archive format

**Note:** Settings are passed as per-instance configuration. There are no global settings that affect all Readers and Builders.
