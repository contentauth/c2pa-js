// Copyright 2025 Adobe
// All Rights Reserved.
//
// NOTICE: Adobe permits you to use, modify, and distribute this file in
// accordance with the terms of the Adobe license agreement accompanying
// it.

//! HTTP Range-backed asset transports for the WASM reader.
//!
//! A [`WasmRangeReader`] implements only [`SyncRangeTransport`]. The SDK layers its
//! window cache, coalescing, short-read handling, and length discovery on top, so
//! this module holds just the synchronous XHR transport.

use std::cell::Cell;
use std::io::Error as IoError;
use std::num::NonZeroU64;

use async_trait::async_trait;
use c2pa::asset_transport::{
    http_range::{self, RangeResponse},
    AssetRef, AssetRequest, AssetTransportError, AsyncRangeAssetTransport, AsyncRangeTransport,
    ObjectVersion, RangeChunk, RangeConfig, RangeInfo, SyncRangeAssetTransport,
    SyncRangeTransport,
};
use js_sys::{Function, JsString, Uint8Array};
use wasm_bindgen::{JsCast, JsValue};
use wasm_bindgen_futures::JsFuture;
use web_sys::{Request, Response, XmlHttpRequest, XmlHttpRequestResponseType};

/// `bytes=0-0`: the one-byte probe both `info` paths use to learn the object length
/// from `Content-Range`.
const ONE_BYTE: NonZeroU64 = NonZeroU64::MIN;

/// A synchronous random-access byte source over HTTP Range requests.
///
/// Only valid inside a Web Worker: it relies on synchronous XHR, which is
/// forbidden on the main thread.
pub(crate) struct WasmRangeReader {
    url: String,
    on_fetch: Option<Function>,
    /// The object length once `info` has probed for it. `validate_status` needs it to
    /// tell a whole-object `200` from an origin that ignored `Range`.
    total: Cell<Option<u64>>,
}

impl WasmRangeReader {
    fn new(url: String, on_fetch: Option<Function>) -> Self {
        Self {
            url,
            on_fetch,
            total: Cell::new(None),
        }
    }

}

impl SyncRangeTransport for WasmRangeReader {
    fn info(&self) -> Result<RangeInfo, AssetTransportError> {
        let (probe, total) = fetch_range(&self.url, 0, ONE_BYTE, None, None)?;
        let len = total.ok_or_else(|| {
            AssetTransportError::other(IoError::other("range source did not report a total length (missing Content-Range)"))
        })?;
        self.total.set(Some(len));
        let info = RangeInfo::new(len);
        Ok(match probe.version {
            Some(version) => info.with_version(version),
            None => info,
        })
    }

    fn read_range(
        &self,
        offset: u64,
        len: u64,
        expect: Option<&ObjectVersion>,
    ) -> Result<RangeChunk, AssetTransportError> {
        if len == 0 {
            return Ok(RangeChunk::new(offset, Vec::new()));
        }
        let Some(len) = NonZeroU64::new(len) else {
            return Ok(RangeChunk::new(offset, Vec::new()));
        };
        let expect_token = expect.map(|v| v.to_string());
        let (chunk, total) = fetch_range(
            &self.url,
            offset,
            len,
            self.total.get(),
            expect_token.as_deref(),
        )?;
        fire_on_fetch(&self.on_fetch, offset, chunk.bytes.len() as u64, total.unwrap_or(0));
        Ok(chunk)
    }
}

/// Builds a [`SyncRangeAssetTransport`] that serves any URL reference over synchronous
/// HTTP Range requests, reporting each fetch through `on_fetch`.
pub(crate) fn http_range_source(
    on_fetch: Option<Function>,
) -> SyncRangeAssetTransport<impl Fn(&AssetRequest<'_>) -> Result<WasmRangeReader, AssetTransportError>> {
    SyncRangeAssetTransport::new(move |request: &AssetRequest<'_>| {
        Ok(WasmRangeReader::new(request_url(request)?, on_fetch.clone()))
    })
}

/// Extracts a URL from a request reference. A range source only understands URI
/// or opaque string references.
fn request_url(request: &AssetRequest<'_>) -> Result<String, AssetTransportError> {
    match request.reference {
        AssetRef::Uri(u) | AssetRef::Custom(u) => Ok(u.to_owned()),
        _ => Err(AssetTransportError::UnsupportedReference),
    }
}

fn fire_on_fetch(on_fetch: &Option<Function>, offset: u64, length: u64, total: u64) {
    if let Some(cb) = on_fetch {
        let _ = cb.call3(
            &JsValue::NULL,
            &JsValue::from_f64(offset as f64),
            &JsValue::from_f64(length as f64),
            &JsValue::from_f64(total as f64),
        );
    }
}

/// An asynchronous random-access byte source over HTTP Range requests using
/// `fetch`. Unlike [`WasmRangeReader`] it does not use synchronous XHR, so the SDK
/// can drive manifest discovery over it on the main thread — no Web Worker.
pub(crate) struct WasmAsyncRangeReader {
    url: String,
    on_fetch: Option<Function>,
    /// The object length once `info_async` has probed for it, for the same reason as
    /// on [`WasmRangeReader`].
    total: Cell<Option<u64>>,
}

impl WasmAsyncRangeReader {
    fn new(url: String, on_fetch: Option<Function>) -> Self {
        Self {
            url,
            on_fetch,
            total: Cell::new(None),
        }
    }
}

#[async_trait(?Send)]
impl AsyncRangeTransport for WasmAsyncRangeReader {
    async fn info_async(&self) -> Result<RangeInfo, AssetTransportError> {
        let (probe, total) = fetch_range_async(&self.url, 0, ONE_BYTE, None, None).await?;
        let len = total.ok_or_else(|| {
            AssetTransportError::other(IoError::other("range source did not report a total length (missing Content-Range)"))
        })?;
        self.total.set(Some(len));
        let info = RangeInfo::new(len);
        Ok(match probe.version {
            Some(version) => info.with_version(version),
            None => info,
        })
    }

    async fn read_range_async(
        &self,
        offset: u64,
        len: u64,
        expect: Option<&ObjectVersion>,
    ) -> Result<RangeChunk, AssetTransportError> {
        if len == 0 {
            return Ok(RangeChunk::new(offset, Vec::new()));
        }
        let Some(len) = NonZeroU64::new(len) else {
            return Ok(RangeChunk::new(offset, Vec::new()));
        };
        let expect_token = expect.map(|v| v.to_string());
        let (chunk, total) = fetch_range_async(
            &self.url,
            offset,
            len,
            self.total.get(),
            expect_token.as_deref(),
        )
        .await?;
        fire_on_fetch(&self.on_fetch, offset, chunk.bytes.len() as u64, total.unwrap_or(0));
        Ok(chunk)
    }
}

/// Turns the JavaScript `wholeObjectLimit` option into a range configuration.
///
/// The option is a byte count, `"unbounded"` for a host that can hold any object, or
/// `"disabled"` to refuse the rung outright. The window and cache keep their tuned
/// defaults either way.
pub(crate) fn whole_object_config(limit: Option<&str>) -> Result<RangeConfig, JsString> {
    Ok(match limit {
        None => RangeConfig::default(),
        Some("unbounded") => RangeConfig::default().with_unbounded_whole_object(),
        Some("disabled") => RangeConfig::default().with_max_whole_object(None),
        Some(other) => {
            let bytes = other.parse::<u64>().map_err(|_| {
                JsString::from(format!(
                    "wholeObjectLimit must be a byte count, \"unbounded\" or \"disabled\", got {other}"
                ))
            })?;
            RangeConfig::default().with_max_whole_object(Some(bytes))
        }
    })
}

/// Builds an asynchronous range source.
///
/// The SDK's adapter owns the plumbing: this only maps a request to a reader, which
/// costs no I/O because `WasmAsyncRangeReader` probes lazily in `info_async`.
pub(crate) fn async_http_range_source(
    on_fetch: Option<Function>,
    config: RangeConfig,
) -> AsyncRangeAssetTransport<
    impl Fn(&AssetRequest<'_>) -> Result<WasmAsyncRangeReader, AssetTransportError>,
> {
    AsyncRangeAssetTransport::new(move |request: &AssetRequest<'_>| {
        let url = request_url(request)?;
        Ok(WasmAsyncRangeReader::new(url, on_fetch.clone()))
    })
    .with_config(config)
}

/// Asynchronous HTTP Range GET via `fetch`, valid on the main thread.
///
/// Collects the response and hands it to the SDK, which owns every rule that decides
/// whether it is usable at the requested offset. Returns the accepted chunk and the
/// object length when the response stated one.
async fn fetch_range_async(
    url: &str,
    start: u64,
    len: NonZeroU64,
    known_total: Option<u64>,
    expect_version: Option<&str>,
) -> Result<(RangeChunk, Option<u64>), AssetTransportError> {
    let request = Request::new_with_str(url).map_err(js_to_ase)?;
    // `Range` and, when the read is pinned to a version, `If-Range`. The SDK builds
    // both: it owns the inclusive-position arithmetic and the RFC 9110 13.1.5 rule
    // that only a quoted entity-tag may be sent as `If-Range`.
    for (name, value) in http_range::headers(start, len, expect_version)? {
        request.headers().set(name, &value).map_err(js_to_ase)?;
    }

    // Resolve `fetch` off the global object: a service worker and a workerd
    // isolate have no `window`, and those are the runtimes that need this path.
    let global = js_sys::global();
    let fetch_fn = js_sys::Reflect::get(&global, &JsValue::from_str("fetch"))
        .map_err(js_to_ase)?
        .dyn_into::<Function>()
        .map_err(|_| AssetTransportError::other(IoError::other("no global `fetch` available")))?;
    let promise = fetch_fn
        .call1(&global, &request)
        .map_err(js_to_ase)?
        .dyn_into::<js_sys::Promise>()
        .map_err(|_| AssetTransportError::other(IoError::other("`fetch` did not return a Promise")))?;
    let resp_value = JsFuture::from(promise).await.map_err(js_to_ase)?;
    let resp: Response = resp_value
        .dyn_into()
        .map_err(|_| AssetTransportError::other(IoError::other("fetch did not return a Response")))?;

    let headers = resp.headers();
    let raw = RangeResponse {
        status: resp.status(),
        content_range: headers.get("Content-Range").ok().flatten(),
        etag: headers.get("ETag").ok().flatten(),
        last_modified: headers.get("Last-Modified").ok().flatten(),
        content_encoding: headers.get("Content-Encoding").ok().flatten(),
        body: {
            let buf = JsFuture::from(resp.array_buffer().map_err(js_to_ase)?)
                .await
                .map_err(js_to_ase)?;
            let u8 = Uint8Array::new(&buf);
            let mut bytes = vec![0u8; u8.byte_length() as usize];
            u8.copy_to(&mut bytes);
            bytes
        },
    };

    accept(raw, url, start, len, known_total, expect_version)
}

/// Hands a collected response to the SDK's range contract, keeping the object length
/// the response stated, which `into_chunk` consumes.
fn accept(
    raw: RangeResponse,
    url: &str,
    start: u64,
    len: NonZeroU64,
    known_total: Option<u64>,
    expect_version: Option<&str>,
) -> Result<(RangeChunk, Option<u64>), AssetTransportError> {
    let total = known_total.or_else(|| raw.total());
    let expect = expect_version.map(ObjectVersion::new);
    let chunk = raw.into_chunk(url, (start, len), total, expect.as_ref())?;
    Ok((chunk, total))
}

fn js_to_ase(e: JsValue) -> AssetTransportError {
    AssetTransportError::other(IoError::other(format!("{e:?}")))
}

/// Synchronous HTTP Range GET via XMLHttpRequest. Only valid inside a Web Worker
/// (synchronous XHR with `responseType` is forbidden on the main thread).
///
/// The blocking twin of [`fetch_range_async`], with the same rules applied by the SDK.
fn fetch_range(
    url: &str,
    start: u64,
    len: NonZeroU64,
    known_total: Option<u64>,
    expect_version: Option<&str>,
) -> Result<(RangeChunk, Option<u64>), AssetTransportError> {
    let xhr = XmlHttpRequest::new().map_err(js_to_ase)?;
    xhr.open_with_async("GET", url, false).map_err(js_to_ase)?;
    for (name, value) in http_range::headers(start, len, expect_version)? {
        xhr.set_request_header(name, &value).map_err(js_to_ase)?;
    }
    xhr.set_response_type(XmlHttpRequestResponseType::Arraybuffer);
    xhr.send().map_err(js_to_ase)?;

    let raw = RangeResponse {
        status: xhr.status().map_err(js_to_ase)?,
        content_range: xhr.get_response_header("Content-Range").ok().flatten(),
        etag: xhr.get_response_header("ETag").ok().flatten(),
        last_modified: xhr.get_response_header("Last-Modified").ok().flatten(),
        content_encoding: xhr.get_response_header("Content-Encoding").ok().flatten(),
        body: {
            let resp = xhr.response().map_err(js_to_ase)?;
            let u8 = Uint8Array::new(&resp);
            let mut bytes = vec![0u8; u8.byte_length() as usize];
            u8.copy_to(&mut bytes);
            bytes
        },
    };

    accept(raw, url, start, len, known_total, expect_version)
}


