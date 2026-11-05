# c2pa-utilities

`c2pa-utilities` is a home for shared utilities and libraries used by both `c2pa-web` and `c2pa-node`. Most clients will get these transitively as a dependency of one of those two packages, but `@contentauth/c2pa-utilities` is also published standalone for cases where you want to reuse a piece of it directly.

## Installation

```sh
npm install @contentauth/c2pa-utilities
```

## API reference documentation

Complete API documentation is generated from TypeScript source using [TypeDoc](https://typedoc.org/) and published to [GitHub Pages](https://contentauth.github.io/c2pa-js/modules/_contentauth_c2pa-utilities.html).

## Utilities

### `Context` and `Settings`

`Settings` is a plain, JSON-serializable object configuring SDK behavior around trust anchors, verification options, and `Reader`/`Builder` options.

`Context` is a small, immutable wrapper around `Settings`, and is the recommended way to configure a `Reader`/`Builder`. `Context` objects are passed directly to the call that creates a `Reader`/`Builder` instance, so one running SDK instance can freely create many different `Reader`/`Builder`s, each with its own `Context`. `Context` changes do not propagate, since the `Context` is snapshotted when used to construct a `Reader`/`Builder`. Therefore, it can be safely used to construct multiple instances.

See [`c2pa-web`'s README](../c2pa-web/README.md#configuring-behavior-with-context) for an example.

#### Creating a `Context`

```typescript
import { Context } from '@contentauth/c2pa-utilities';

const context = new Context({
  verify: {
    verifyTrust: true
  },
  trust: {
    trustAnchors: 'https://example.com/trust-anchors.pem'
  }
});
```

#### Combining `Settings`

Each `Context` holds whatever single `Settings` object was passed to its constructor and does not handle any merging of settings. To combine more than one `Settings` source, merge them first with `mergeSettings()`, then construct a `Context` from the single, merged result:

```typescript
import { Context, mergeSettings } from '@contentauth/c2pa-utilities';

const base = { verify: { verifyTrust: true } };
const override = { verify: { verifyAfterSign: true } };

const context = new Context(mergeSettings(base, override));
// context.settings is { verify: { verifyTrust: true, verifyAfterSign: true } }
```

#### Resolving a `Context` to JSON

Settings are passed across the WASM (`c2pa-web`)/native(`c2pa-node`) boundary as a JSON string. `toJson()` resolves any trust-anchor URLs embedded in the settings (fetching and validating them) and serializes the result:

```typescript
const contextJson = await context.toJson();
// '{"verify":{"verify_trust":true},"trust":{"trust_anchors":"-----BEGIN CERTIFICATE-----..."}}'
```

This step is asynchronous, and can throw if a trust-anchor URL fails to resolve. Bindings resolve the settings before constructing the native/WASM `Reader` or `Builder`. Within a `Context`, concurrent calls share the same resolution promise and successful results are memoized; failed resolutions can be retried on a later call.

#### Trust-resource fetching

Concurrent trust-resource fetches using the global `fetch`, the same URL, and the same effective fetch policy share one pending request across settings resolutions. Entries are removed after success or failure; completed responses are not cached by default. Reusing a successfully resolved `Context` still reuses its memoized settings.

Custom `fetch` implementations bypass both shared in-flight and completed-response caches because a wrapper can change its request context (such as authentication headers) without changing its function identity.

Each trust-resource fetch has a fixed 30-second deadline covering network requests, retry delays, and response-body consumption. A timeout aborts the request and rejects all waiting resolutions, without substituting trust data. A later resolution can attempt a new fetch even if a custom implementation ignores cancellation.

Set `ContextOptions.trustFetch` using the third `Context` constructor argument to configure trust fetching. `context.toJson(options)` overrides those defaults for that resolution; `resolveSettings(settings, options)` accepts the same options directly. In addition to the fetch policy options described below:

- `deduplicateInFlight` defaults to `true`; set it to `false` to make independent global-fetch requests.
- `cacheTtlMs` defaults to `0`, disabling completed-response caching. A positive, finite value caches successful global-fetch responses for that many milliseconds. Negative or non-finite values are rejected. Different fetch policies and TTLs use separate cache entries; failures are never cached.
- `requireHttps` defaults to `false` for compatibility; set it to `true` to reject HTTP trust-resource URLs.

```typescript
const context = new Context(settings, undefined, {
  trustFetch: { cacheTtlMs: 60_000, requireHttps: true, maxRetries: 1 }
});
await context.toJson();
```

Custom fetch implementations still honor HTTPS enforcement, numeric option validation, and the deadline, but never participate in shared caching. The trust-resource deadline applies only to trust fetching, not to direct calls to `fetchWithRetry`, `fetchWithRetryRaw`, or `loadSettingsFromUrl`.

#### Building `Settings` directly

`Context` is built on a handful of lower-level `Settings` helpers, which remain available directly for cases that don't need a `Context` at all:

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

// Resolves trust-anchor URLs and serializes to the snake_case JSON string the native SDK expects.
const settingsJson = await resolveSettings(settings);
```

`resolveSettings` is the entry point most direct callers want. It resolves any `trust`/`cawgTrust` URL fields (fetching and inlining the PEM content, retrying transient failures), and returns the result as a snake_case JSON string. `settings` is merged on top of this package's defaults, so `resolveSettings` always returns a value, even when called with `undefined`. To combine more than one `Settings` object first, merge them with `mergeSettings()` before calling `resolveSettings`, as above.

Other exports:

- `createTrustSettings` / `createCawgTrustSettings` / `createVerifySettings` — construct a `Settings` fragment for one section.
- `mergeSettings` — deep-merge any number of `Settings` fragments, with later arguments overriding earlier ones. Nested fields are merged rather than overwritten.
- `settingsToJson` — serialize a `Settings` object to its snake_case JSON form without resolving trust-anchor URLs.
- `snakeCaseify` — the lower-level camelCase-to-snake_case object converter `settingsToJson`/`resolveSettings` use internally.
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

Numeric fetch options must be finite and non-negative. `NaN`, `Infinity`, `-Infinity`, and negative values throw before fetching; infinity does not mean retry forever. `maxRetries` must also be a safe integer. Omitted options retain their defaults.

| Option | Meaning of `0` |
| --- | --- |
| `maxRetries` | One initial attempt, no retries |
| `maxResponseBytes` | Only an empty text response is allowed; not enforced by `fetchWithRetryRaw` |
| `initialRetryDelayMs` | No exponential-delay component; jitter still applies |
| `maxRetryDelayMs` | No backoff delay, including jitter |
| `maxRetryAfterMs` | Reject positive `Retry-After` delays; allow zero or past dates |

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

- A patched [Node.js](https://nodejs.org/) release; see [TLS trust stores](../../README.md#tls-trust-stores).
- [Nx](https://nx.dev/getting-started/intro)
- [pnpm](https://pnpm.io/)

See the [contributor prerequisites](https://github.com/contentauth/c2pa-js/blob/main/docs/project-contributions.md#prerequisites) for details.

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
