# c2pa-utilities

`c2pa-utilities` is a home for shared utilities and libraries used by both `c2pa-web` and `c2pa-node`. Most clients will get these transitively as a dependency of one of those two packages, but `@contentauth/c2pa-utilities` is also published standalone for cases where you want to reuse a piece of it directly.

## Installation

```sh
npm install @contentauth/c2pa-utilities
```

## API Reference Documentation

Complete API documentation is generated from TypeScript source using [TypeDoc](https://typedoc.org/) and published to [GitHub Pages](https://contentauth.github.io/c2pa-js/modules/_contentauth_c2pa-utilities.html).

## Utilities

### Settings

Helpers for building, merging, and serializing the `Settings` object consumed by `c2pa-web`'s and `c2pa-node`'s `Reader`/`Builder` constructors.

```typescript
import {
  createTrustSettings,
  createVerifySettings,
  mergeSettings,
  resolveSettings
} from '@contentauth/c2pa-utilities';

const trustSettings = createTrustSettings({
  trustAnchors: 'https://example.com/anchors.pem'
});

const verifySettings = createVerifySettings({
  verifyTrust: true,
  verifyAfterReading: true
});

const settings = mergeSettings(trustSettings, verifySettings);

// Merges any override on top of base, fetches trust-anchor URLs, and serializes
// to the snake_case JSON string the native SDK expects.
const settingsJson = await resolveSettings(settings, undefined);
```

`resolveSettings` is the top-level entry point most callers want: it deep-merges `overrideSettings` on top of `baseSettings`, resolves any `trust`/`cawgTrust` fields that are URLs (fetching and inlining the PEM content, retrying transient failures), and returns the result as a snake_case JSON string. Pass `undefined` for either argument to skip that step; passing `undefined` for both returns `undefined`.

Other exports:

- `createTrustSettings` / `createCawgTrustSettings` / `createVerifySettings` — construct a `Settings` fragment for one section.
- `mergeSettings` — deep-merge any number of `Settings` fragments, with later arguments overriding earlier ones. Nested fields are merged rather than overwritten.
- `settingsToJson` — serialize a `Settings` object to its snake_case JSON form without resolving trust-anchor URLs.
- `loadSettingsFromUrl` — fetch a settings JSON document from a URL, with retry.
- `resolveTrustSettings` — resolve just a `TrustSettings` object's URL fields in place; used internally by `resolveSettings`.

### Fetch with retry

`fetchWithRetry` and `fetchWithRetryRaw` wrap `fetch` with exponential backoff, `Retry-After` handling, and (for `fetchWithRetry`) a response size cap. The retry mechanism is fixed; however, policy details such as retry count, backoff timing, which statuses/errors are retryable, and the maximum honored `Retry-After` delay are configurable per call via `FetchWithRetryOptions`.

```typescript
import { fetchWithRetry, fetchWithRetryRaw } from '@contentauth/c2pa-utilities';

// GET as text, retrying on network errors, 429, and 5xx, capped at 1 MB by default.
const text = await fetchWithRetry('https://example.com/anchors.pem');

// For other methods, headers, or bodies, or to handle the response yourself, use fetchWithRetryRaw.
const response = await fetchWithRetryRaw('https://example.com/upload', {
  method: 'POST',
  body: payload
});
```

Both functions accept an `FetchWithRetryOptions` object to override the defaults:

```typescript
await fetchWithRetry(url, {
  maxRetries: 5,
  initialRetryDelayMs: 500,
  maxRetryDelayMs: 5_000,
  maxRetryAfterMs: 60_000,
  maxResponseBytes: 5 * 1024 * 1024,
  isRetryableStatus: (status) => status === 429 || status >= 500,
  isRetryableError: (error) => true,
  fetch: myFetchImplementation
});
```

An `AbortError` is never retried, and a malformed URL throws immediately rather than being retried.

### Asset size validation

`validateAssetSize` is the shared size check used by both `Reader` implementations before reading an asset.

```typescript
import { validateAssetSize, AssetTooLargeError, DEFAULT_MAX_SIZE_IN_BYTES } from '@contentauth/c2pa-utilities';

try {
  validateAssetSize(sizeInBytes, maxSizeInBytes); // pass 0 to use DEFAULT_MAX_SIZE_IN_BYTES
} catch (e) {
  if (e instanceof AssetTooLargeError) {
    // asset exceeds the resolved limit
  }
}
```

### Signing algorithm

`SigningAlg` is the lowercase signing algorithm type accepted/produced by the core native library at the signer construction boundary (e.g. `Signer.newSigner(cert, key, alg)`). It's derived from the PascalCase `SigningAlg` exported by `@contentauth/c2pa-types`, which describes the casing used when a manifest's `SignatureInfo.alg` is serialized.

## Library development

### Prerequisites

Ensure the repo-wide prerequisites are installed:

- [Node.js](https://nodejs.org/) v22.22+
- [Nx](https://nx.dev/getting-started/intro)
- [pnpm](https://pnpm.io/)

See the [c2pa-js README](../../README.md#prerequisites) for details.

### Building

To build:

```sh
nx build c2pa-utilities
```

### Testing

This library uses [Vitest](https://vitest.dev/), with [msw](https://mswjs.io/) to mock `fetch` in the settings and fetch-with-retry tests.

To run the tests:

```sh
nx test c2pa-utilities
```
