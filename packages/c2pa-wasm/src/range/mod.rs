// Copyright 2025 Adobe
// All Rights Reserved.
//
// NOTICE: Adobe permits you to use, modify, and distribute this file in
// accordance with the terms of the Adobe license agreement accompanying
// it.

//! HTTP Range-backed asset sources for the WASM reader.
//!
//! A [`WasmRangeReader`] implements only [`SyncRangeReader`]; the SDK layers its
//! window cache, coalescing, short-read handling, and length discovery on top, so
//! this module holds just the synchronous XHR transport.

use std::io::Error as IoError;

use async_trait::async_trait;
use c2pa::{
    AssetRef, AssetRequest, AssetSourceError, AsyncAssetSource, AsyncRangeReader, RangeAssetSource,
    ObjectVersion, RangeChunk, RangeConfig, RangeInfo, ResolvedAsset, SyncRangeReader,
};
use js_sys::{Function, Uint8Array};
use wasm_bindgen::{JsCast, JsValue};
use wasm_bindgen_futures::JsFuture;
use web_sys::{Request, Response, XmlHttpRequest, XmlHttpRequestResponseType};

/// A synchronous random-access byte source over HTTP Range requests.
///
/// Only valid inside a Web Worker: it relies on synchronous XHR, which is
/// forbidden on the main thread.
pub(crate) struct WasmRangeReader {
    url: String,
    on_fetch: Option<Function>,
}

impl WasmRangeReader {
    fn new(url: String, on_fetch: Option<Function>) -> Self {
        Self { url, on_fetch }
    }

    fn report(&self, offset: u64, length: u64, total: u64) {
        if let Some(cb) = &self.on_fetch {
            let _ = cb.call3(
                &JsValue::NULL,
                &JsValue::from_f64(offset as f64),
                &JsValue::from_f64(length as f64),
                &JsValue::from_f64(total as f64),
            );
        }
    }
}

impl SyncRangeReader for WasmRangeReader {
    fn info(&self) -> Result<RangeInfo, AssetSourceError> {
        let (_probe, total, version) = fetch_range(&self.url, 0, 0, None)?;
        let len = total.ok_or_else(|| {
            AssetSourceError::Other(
                "range source did not report a total length (missing Content-Range)".into(),
            )
        })?;
        let info = RangeInfo::new(len);
        Ok(match version {
            Some(version) => info.with_version(version),
            None => info,
        })
    }

    fn read_range(
        &self,
        offset: u64,
        len: u64,
        expect: Option<&ObjectVersion>,
    ) -> Result<RangeChunk, AssetSourceError> {
        if len == 0 {
            return Ok(RangeChunk::new(Vec::new()));
        }
        let expect_token = expect.map(|v| v.to_string());
        let end_inclusive = offset + len - 1;
        let (bytes, total, version) =
            fetch_range(&self.url, offset, end_inclusive, expect_token.as_deref())?;
        self.report(offset, bytes.len() as u64, total.unwrap_or(0));
        let chunk = RangeChunk::new(bytes);
        Ok(match version {
            Some(version) => chunk.with_version(version),
            None => chunk,
        })
    }
}

/// Builds a [`RangeAssetSource`] that serves any URL reference over synchronous
/// HTTP Range requests, reporting each fetch through `on_fetch`.
pub(crate) fn http_range_source(
    on_fetch: Option<Function>,
) -> RangeAssetSource<impl Fn(&AssetRequest<'_>) -> Result<WasmRangeReader, AssetSourceError>> {
    RangeAssetSource::new(move |request: &AssetRequest<'_>| {
        Ok(WasmRangeReader::new(request_url(request)?, on_fetch.clone()))
    })
}

/// Extracts a URL from a request reference. A range source only understands URI
/// or opaque string references.
fn request_url(request: &AssetRequest<'_>) -> Result<String, AssetSourceError> {
    match request.reference {
        AssetRef::Uri(u) | AssetRef::Opaque(u) => Ok(u.to_owned()),
        _ => Err(AssetSourceError::UnsupportedReference),
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
}

impl WasmAsyncRangeReader {
    fn new(url: String, on_fetch: Option<Function>) -> Self {
        Self { url, on_fetch }
    }
}

#[async_trait(?Send)]
impl AsyncRangeReader for WasmAsyncRangeReader {
    async fn info_async(&self) -> Result<RangeInfo, AssetSourceError> {
        let (_probe, total, version) = fetch_range_async(&self.url, 0, 0, None).await?;
        let len = total.ok_or_else(|| {
            AssetSourceError::Other(
                "range source did not report a total length (missing Content-Range)".into(),
            )
        })?;
        let info = RangeInfo::new(len);
        Ok(match version {
            Some(version) => info.with_version(version),
            None => info,
        })
    }

    async fn read_range_async(
        &self,
        offset: u64,
        len: u64,
        expect: Option<&ObjectVersion>,
    ) -> Result<RangeChunk, AssetSourceError> {
        if len == 0 {
            return Ok(RangeChunk::new(Vec::new()));
        }
        let expect_token = expect.map(|v| v.to_string());
        let (bytes, total, version) = fetch_range_async(
            &self.url,
            offset,
            offset + len - 1,
            expect_token.as_deref(),
        )
        .await?;
        fire_on_fetch(&self.on_fetch, offset, bytes.len() as u64, total.unwrap_or(0));
        let chunk = RangeChunk::new(bytes);
        Ok(match version {
            Some(version) => chunk.with_version(version),
            None => chunk,
        })
    }
}

/// An [`AsyncAssetSource`] serving any URL reference over asynchronous HTTP Range
/// requests, for main-thread manifest discovery.
pub(crate) struct WasmAsyncRangeSource {
    on_fetch: Option<Function>,
    hash_chunk: Option<u64>,
}

/// Builds an asynchronous range source, optionally overriding the bytes held at
/// once while hashing for verification.
pub(crate) fn async_http_range_source(
    on_fetch: Option<Function>,
    hash_chunk: Option<u64>,
) -> WasmAsyncRangeSource {
    WasmAsyncRangeSource {
        on_fetch,
        hash_chunk,
    }
}

#[async_trait(?Send)]
impl AsyncAssetSource for WasmAsyncRangeSource {
    async fn open_async(
        &self,
        request: &AssetRequest<'_>,
    ) -> Result<ResolvedAsset, AssetSourceError> {
        let url = request_url(request)?;
        let resolved = ResolvedAsset::from_ranges_async(Box::new(WasmAsyncRangeReader::new(
            url,
            self.on_fetch.clone(),
        )));
        Ok(match self.hash_chunk {
            // override only the hash budget so the window and cache keep their tuned defaults
            Some(hash_chunk) => {
                resolved.with_range_config(RangeConfig::default().with_hash_chunk(hash_chunk))
            }
            None => resolved,
        })
    }
}

/// What one range request yields: the bytes, the object's total length when the
/// response reported it, and the version that served them when the origin
/// identified one.
type RangeResponse = (Vec<u8>, Option<u64>, Option<String>);

/// Asynchronous HTTP Range GET via `fetch`, valid on the main thread.
///
/// Returns the fetched bytes and, when present, the total length parsed from the
/// `Content-Range` response header.
async fn fetch_range_async(
    url: &str,
    start: u64,
    end_inclusive: u64,
    expect_version: Option<&str>,
) -> Result<RangeResponse, AssetSourceError> {
    let request = Request::new_with_str(url).map_err(js_to_ase)?;
    request
        .headers()
        .set("Range", &format!("bytes={start}-{end_inclusive}"))
        .map_err(js_to_ase)?;
    // RFC 9110 13.1.1 states If-Range is suited to range requests: an origin whose
    // object changed answers it with 200 and the whole new representation rather
    // than 412.
    //
    // RFC 9110 13.1.1 also permits any cache or intermediary to ignore conditional
    // headers meant for an origin, so behind a CDN this may not be evaluated. The
    // caller's version comparison enforces consistency.
    if let Some(version) = expect_version {
        request
            .headers()
            .set("If-Range", version)
            .map_err(js_to_ase)?;
    }

    // Resolve `fetch` off the global object rather than off `window`: a service
    // worker and a workerd isolate have no `window`, and those are exactly the
    // runtimes that need this path.
    let global = js_sys::global();
    let fetch_fn = js_sys::Reflect::get(&global, &JsValue::from_str("fetch"))
        .map_err(js_to_ase)?
        .dyn_into::<Function>()
        .map_err(|_| AssetSourceError::Other("no global `fetch` available".into()))?;
    let promise = fetch_fn
        .call1(&global, &request)
        .map_err(js_to_ase)?
        .dyn_into::<js_sys::Promise>()
        .map_err(|_| AssetSourceError::Other("`fetch` did not return a Promise".into()))?;
    let resp_value = JsFuture::from(promise).await.map_err(js_to_ase)?;
    let resp: Response = resp_value
        .dyn_into()
        .map_err(|_| AssetSourceError::Other("fetch did not return a Response".into()))?;

    let headers = resp.headers();
    let served_version = object_version(
        headers.get("ETag").ok().flatten(),
        headers.get("Last-Modified").ok().flatten(),
    );

    // A 200 to a range request has two causes, distinguished by the validator.
    // If-Range not matching means the origin serves a representation other than the
    // one this read began with, returning the current validator, which differs from
    // ours. An origin that does not implement Range also answers 200, but with our
    // validator or none at all, and falls through to the non-206 error below.
    if let (200, Some(expected), Some(served)) =
        (resp.status(), expect_version, served_version.as_deref())
        && expected != served
    {
        return Err(AssetSourceError::VersionChanged {
            expected: expected.to_owned(),
            got: served.to_owned(),
        });
    }
    // Some origins answer a failed precondition with 412 instead.
    if resp.status() == 412 {
        return Err(AssetSourceError::VersionChanged {
            expected: expect_version.unwrap_or("unknown").to_owned(),
            got: "rejected by origin (412 Precondition Failed)".to_owned(),
        });
    }
    if resp.status() != 206 {
        return Err(AssetSourceError::Other(
            format!(
                "expected 206 Partial Content from {url}, got {} (server may not honor Range)",
                resp.status()
            )
            .into(),
        ));
    }

    let total = resp
        .headers()
        .get("Content-Range")
        .ok()
        .flatten()
        .and_then(|h| parse_content_range_total(&h));

    let buf = JsFuture::from(resp.array_buffer().map_err(js_to_ase)?)
        .await
        .map_err(js_to_ase)?;
    let u8 = Uint8Array::new(&buf);
    let mut bytes = vec![0u8; u8.byte_length() as usize];
    u8.copy_to(&mut bytes);
    Ok((bytes, total, served_version))
}

fn js_to_ase(e: JsValue) -> AssetSourceError {
    AssetSourceError::Other(format!("{e:?}").into())
}

/// Synchronous HTTP Range GET via XMLHttpRequest. Only valid inside a Web Worker
/// (synchronous XHR with `responseType` is forbidden on the main thread).
///
/// Returns the fetched bytes and, when present, the total resource length parsed
/// from the `Content-Range` response header.
fn fetch_range(
    url: &str,
    start: u64,
    end_inclusive: u64,
    expect_version: Option<&str>,
) -> Result<RangeResponse, AssetSourceError> {
    let xhr = XmlHttpRequest::new().map_err(js_to_ase)?;
    xhr.open_with_async("GET", url, false).map_err(js_to_ase)?;
    xhr.set_request_header("Range", &format!("bytes={start}-{end_inclusive}"))
        .map_err(js_to_ase)?;
    // If-Range rather than If-Match, for the reasons given on `fetch_range_async`.
    if let Some(version) = expect_version {
        xhr.set_request_header("If-Range", version)
            .map_err(js_to_ase)?;
    }
    xhr.set_response_type(XmlHttpRequestResponseType::Arraybuffer);
    xhr.send().map_err(js_to_ase)?;

    let status = xhr.status().map_err(js_to_ase)?;
    let served_version = object_version(
        xhr.get_response_header("ETag").ok().flatten(),
        xhr.get_response_header("Last-Modified").ok().flatten(),
    );

    // Only a 200 carrying a different validator means the object changed.
    // A 200 with no validator, or ours, is an origin that does not implement Range.
    if let (200, Some(expected), Some(served)) =
        (status, expect_version, served_version.as_deref())
        && expected != served
    {
        return Err(AssetSourceError::VersionChanged {
            expected: expected.to_owned(),
            got: served.to_owned(),
        });
    }
    if status == 412 {
        return Err(AssetSourceError::VersionChanged {
            expected: expect_version.unwrap_or("unknown").to_owned(),
            got: "rejected by origin (412 Precondition Failed)".to_owned(),
        });
    }
    if status != 206 {
        return Err(AssetSourceError::Io(IoError::other(format!(
            "expected 206 Partial Content from {url}, got {status} (server may not honor Range)"
        ))));
    }

    let total = xhr
        .get_response_header("Content-Range")
        .ok()
        .flatten()
        .and_then(|h| parse_content_range_total(&h));
    let resp = xhr.response().map_err(js_to_ase)?;
    let u8 = Uint8Array::new(&resp);
    let mut bytes = vec![0u8; u8.byte_length() as usize];
    u8.copy_to(&mut bytes);
    Ok((bytes, total, served_version))
}

/// Extracts a usable object version from response headers.
///
/// A strong `ETag` identifies exact bytes, which is what a hash binding needs. A
/// weak one (`W/"..."`) deliberately allows the bytes to differ between responses
/// that are merely equivalent, so treating it as a version would assert a guarantee
/// the header does not make — worse than admitting there is none. `Last-Modified`
/// is the fallback: coarse (one-second resolution) but still a genuine claim about
/// which revision was served.
fn object_version(etag: Option<String>, last_modified: Option<String>) -> Option<String> {
    if let Some(tag) = etag {
        let tag = tag.trim();
        if !tag.is_empty() && !tag.starts_with("W/") && !tag.starts_with("w/") {
            return Some(tag.to_owned());
        }
    }
    last_modified.filter(|value| !value.trim().is_empty())
}

/// Parse the total length from a `Content-Range: bytes START-END/TOTAL` header.
fn parse_content_range_total(header: &str) -> Option<u64> {
    let total = header.rsplit('/').next()?.trim();
    if total == "*" {
        return None;
    }
    total.parse::<u64>().ok()
}

