---
id: hosting
title: Hosting C2PA assets
---

## Cross-origin (CORS) support

Processing images from a URL or DOM selector requires the
client to download the source image for processing. If the image is not on the [same origin](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy) as the site running the JavaScript library, the server hosting the images must return the following HTTP response headers for cross-origin resource sharing [(CORS)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS):

- [`Access-Control-Allow-Origin`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Origin) must either return the origin of the server running the JavaScript library, or `*` to allow all origins from requests without credentials.
- [`Access-Control-Allow-Methods`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Methods) must include at least the `GET` method.
- [`Access-Control-Allow-Headers`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Headers) must include include `Range` to support [Range requests](#range-requests), in addition to the `Accept-Ranges: bytes` header itself.

The vast majority of major CDNs and hosting providers allow customizing these headers.

### Range requests

Since images can be quite large, the JavaScript library uses [HTTP range requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests) to download the first part of the file (by default, the first 64KB). It then tests if C2PA manifest data exists in this downloaded fragment; if it does, the download proceeds and the JavaScript library processes the rest of the file. This avoids downloading potentially large amounts of data if an image does not contain a manifest.

For this feature to work, the server hosting the images must support HTTP range requests. To check, open
your terminal and enter the following command (assuming you have [curl](https://curl.se/) installed):

```shell
curl -I http://assets.mycdn.com/images/image01.jpg

HTTP/1.1 200 OK
...
Accept-Ranges: bytes
Content-Length: 86405
```

If the response contains `Accept-Ranges: bytes`, then your server is set up to take advantage of this feature.

If the response contains `Accept-Ranges: none` or no `Accept-Ranges` field in the header, the JavaScript library will automatically re-request the image without the `Range` header, forcing a full download of the file.

## Library assets

To reduce the initial bundle size, serve both the Web Worker script and the WebAssembly binary as separate
requests. If you are using a build system, this means you must export them as static assets. For
examples of configuring popular build systems, see the [Quick start guide](../getting-started/quick-start#bringing-in-the-library).

To host the library yourself, expose the static asset files with the following response headers to avoid errors with some browsers:

- `c2pa/dist/assets/wasm/toolkit_bg.wasm`: Serve with `Content-Type: application/wasm` response header.
- `c2pa/dist/c2pa.worker.min.js`: Serve with `Content-Type: text/javascript` response header.

Then pass these URLs to the `createC2pa` function; for example:

```
const c2pa = await createC2pa({
    wasmSrc: 'https://your_static_asset_uri/toolkit_bg.wasm',
    workerSrc: 'https://your_static_asset_uri/c2pa.worker.min.js',
  })
```

Where `your_static_asset_uri` is the URI where you're serving the library asset files.

:::caution
When hosting the library files, make sure you are using the correct version number that aligns with the version of the library you're using.
:::
