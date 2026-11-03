# CAI JavaScript library

## Overview

The c2pa-js repository is a monorepo containing JavaScript libraries and tools for working with [C2PA metadata](https://c2pa.org/). It provides these libraries published for production use:

- [**c2pa-web**](https://github.com/contentauth/c2pa-js/blob/main/packages/c2pa-web/README.md): Library for C2PA metadata in the browser. Import and use this package in browser client JavaScript code.
- [**c2pa-node**](https://github.com/contentauth/c2pa-js/blob/main/packages/c2pa-node/README.md): Node.js library that can read and validate C2PA manifest data that is attached to media assets and add signed manifests to media assets.

Versioned API documentation for published releases is available for
[Node.js](https://contentauth.github.io/c2pa-js/node/) and
[web](https://contentauth.github.io/c2pa-js/web/). Use the version selector to
choose a release.

> [!NOTE]
> In June 2026, the c2pa-node-v2 repo was merged into the c2pa-js repo.
> The old `c2pa-js` repository is now in [c2pa-js-legacy](https://github.com/contentauth/c2pa-js-legacy) and is deprecated. If you need to work with C2PA metadata in the browser, use the libraries in this repository instead.

### Learning videos

For video walkthroughs on using the JavaScript library, see the following lessons from the Content Credentials Foundations course:

- [Reading and validating C2PA data with JavaScript in the browser](https://learn.contentauthenticity.org/reading-and-validating-content-credentials)
- [Formatting C2PA data for L1 - L3 disclosures](https://learn.contentauthenticity.org/formatting-c2pa-data-for-display)

## Prerequisites

To use the Node.js library, you need Node.js 22 or later. Use a patched release:
**v22.23.4+ on v22, v24.22.1+ on v24, or v26.12.1+ on v26**. These releases
update the bundled roots and block the compromised eMudhra intermediate public keys.

### TLS trust stores

Native SDK HTTP requests and Trustmark model downloads use Reqwest with Rustls
and share the patched `rustls-webpki` verifier and `webpki-roots` bundle.

The Rust upgrade does **not** update every HTTPS trust path:

- The Node package's binary installer uses `node-fetch`, and shared utilities use the runtime's global `fetch` (or a caller-supplied implementation) for settings and trust-resource URLs. These paths need a patched Node runtime; updating npm HTTP-client packages alone does not update Node's TLS verifier or roots.
- Browser/WASM HTTP requests, including remote manifests, timestamp requests, and WASM loading, use browser networking. Keep the browser and its revocation data current, along with the OS trust store where applicable. A Rust dependency update cannot patch the browser.

No production TLS CA bundle is maintained in this repository. Custom fetch implementations, Node CA overrides (such as `NODE_EXTRA_CA_CERTS`), proxies, and externally supplied binaries remain the deployer's responsibility. C2PA signing trust anchors and test certificates are separate from HTTPS CA roots.

See the [eMudhra incident and patched-client list](https://emudhra.we-have-a-problem.com/) and the upstream Node security releases for [v22.23.4](https://github.com/nodejs/node/releases/tag/v22.23.4), [v24.22.1](https://github.com/nodejs/node/releases/tag/v24.22.1), and [v26.12.1](https://github.com/nodejs/node/releases/tag/v26.12.1).

## Contributing

If you want to contribute to the CAI JavaScript library, see [Contributing to the project](https://github.com/contentauth/c2pa-js/blob/main/docs/project-contributions.md).  For general contribution guidelines, see [CONTRIBUTING.md](https://github.com/contentauth/c2pa-js/blob/main/CONTRIBUTING.md).

## License

This project is licensed under the [MIT license](https://github.com/contentauth/c2pa-js/blob/main/LICENSE).
