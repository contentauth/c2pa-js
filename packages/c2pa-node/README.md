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
