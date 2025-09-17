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

Fetch an image and provide it to the `Reader`:

```typescript
const response = await fetch(
  'https://spec.c2pa.org/public-testfiles/image/jpeg/adobe-20220124-C.jpg'
);
const blob = await response.blob();

const reader = await c2pa.reader.fromBlob(blob.type, blob);

const manifestStore = await reader.manifestStore();

console.log(manifestStore);
```

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
