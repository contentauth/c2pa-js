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

The `Reader` class is used to read and validate C2PA manifests from media files. It can parse embedded manifests or fetch remote manifests.

```javascript
import { Reader } from '@contentauth/c2pa-node';

// Read from an asset file
const reader = await Reader.fromAsset(inputAsset);

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

The `Builder` class is the main component for creating and signing C2PA manifests. It provides methods to add assertions, resources, and ingredients to manifests, and handles the signing process. Use the `Signer` class to sign the manifests.

```javascript
import { Builder } from '@contentauth/c2pa-node';

// Create a new builder
const builder = Builder.new();

// Or create from an existing manifest definition
const builder = Builder.withJson(manifestDefinition);

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

The library provides comprehensive settings management for trust configuration, verification settings, and global C2PA settings:

```javascript
import {
  loadC2paSettings,
  loadTrustConfig,
  loadVerifyConfig,
  loadSettingsFromFile,
  loadSettingsFromUrl
} from '@contentauth/c2pa-node';

// Load settings from JSON string
loadC2paSettings('{"trust": {"verify_trust_list": true}}');

// Load settings from file
await loadSettingsFromFile('./c2pa-settings.json');

// Load settings from URL
await loadSettingsFromUrl('https://example.com/c2pa-settings.json');

// Configure trust settings
loadTrustConfig({
  verifyTrustList: true,
  userAnchors: ['anchor1', 'anchor2'],
  trustAnchors: ['trust-anchor1'],
  allowedList: ['allowed-cert1']
});

// Configure verification settings
loadVerifyConfig({
  verifyAfterReading: true,
  verifyAfterSign: true,
  verifyTrust: true,
  ocspFetch: true,
  remoteManifestFetch: true
});
```
