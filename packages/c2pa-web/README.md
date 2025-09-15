# c2pa-web

The SDK for interacting with [C2PA metadata](https://c2pa.org/) on the web.

As a guiding philosophy, `c2pa-web` attempts to adhere closely to the API paradigms established by [`c2pa-rs`](https://github.com/contentauth/c2pa-rs).

## Installation

```sh
npm install @contentauth/c2pa-web
```

## Quickstart

```typescript
import { createC2pa } from "@contentauth/c2pa-web";

// Using vite's ?url query parameter - use a solution appropriate to your tooling. 
// This resolves to a WASM binary that must be available for the library to fetch at runtime.
import wasmSrc from "@contentauth/c2pa-web/resources/c2pa.wasm?url";

const response = await fetch("https://spec.c2pa.org/public-testfiles/image/jpeg/adobe-20220124-C.jpg");
const blob = await response.blob();

const reader = await c2pa.reader.fromBlob(blob.type, blob);

const manifestStore = await reader.manifestStore();

console.log(manifestStore);
```

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
