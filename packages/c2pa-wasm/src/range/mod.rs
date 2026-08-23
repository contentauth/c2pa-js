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

use std::io::{Error as IoError, Result as IoResult};

use async_trait::async_trait;
use c2pa::{
    AssetRef, AssetRequest, AssetSourceError, AsyncAssetSource, AsyncRangeReader, RangeAssetSource,
    RangeInfo, ResolvedAsset, SyncRangeReader,
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
        let (_probe, total) = fetch_range(&self.url, 0, 0).map_err(AssetSourceError::Io)?;
        let len = total.ok_or_else(|| {
            AssetSourceError::Other(
                "range source did not report a total length (missing Content-Range)".into(),
            )
        })?;
        Ok(RangeInfo::new(len))
    }

    fn read_range(&self, offset: u64, len: u64) -> Result<Vec<u8>, AssetSourceError> {
        if len == 0 {
            return Ok(Vec::new());
        }
        let end_inclusive = offset + len - 1;
        let (bytes, total) =
            fetch_range(&self.url, offset, end_inclusive).map_err(AssetSourceError::Io)?;
        self.report(offset, bytes.len() as u64, total.unwrap_or(0));
        Ok(bytes)
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
        let (_probe, total) = fetch_range_async(&self.url, 0, 0).await?;
        let len = total.ok_or_else(|| {
            AssetSourceError::Other(
                "range source did not report a total length (missing Content-Range)".into(),
            )
        })?;
        Ok(RangeInfo::new(len))
    }

    async fn read_range_async(
        &self,
        offset: u64,
        len: u64,
    ) -> Result<Vec<u8>, AssetSourceError> {
        if len == 0 {
            return Ok(Vec::new());
        }
        let (bytes, total) = fetch_range_async(&self.url, offset, offset + len - 1).await?;
        fire_on_fetch(&self.on_fetch, offset, bytes.len() as u64, total.unwrap_or(0));
        Ok(bytes)
    }
}

/// An [`AsyncAssetSource`] serving any URL reference over asynchronous HTTP Range
/// requests, for main-thread manifest discovery.
pub(crate) struct WasmAsyncRangeSource {
    on_fetch: Option<Function>,
}

pub(crate) fn async_http_range_source(on_fetch: Option<Function>) -> WasmAsyncRangeSource {
    WasmAsyncRangeSource { on_fetch }
}

#[async_trait(?Send)]
impl AsyncAssetSource for WasmAsyncRangeSource {
    async fn open_async(
        &self,
        request: &AssetRequest<'_>,
    ) -> Result<ResolvedAsset, AssetSourceError> {
        let url = request_url(request)?;
        Ok(ResolvedAsset::from_ranges_async(Box::new(
            WasmAsyncRangeReader::new(url, self.on_fetch.clone()),
        )))
    }
}

/// Asynchronous HTTP Range GET via `fetch`, valid on the main thread.
///
/// Returns the fetched bytes and, when present, the total length parsed from the
/// `Content-Range` response header.
async fn fetch_range_async(
    url: &str,
    start: u64,
    end_inclusive: u64,
) -> Result<(Vec<u8>, Option<u64>), AssetSourceError> {
    let request = Request::new_with_str(url).map_err(js_to_ase)?;
    request
        .headers()
        .set("Range", &format!("bytes={start}-{end_inclusive}"))
        .map_err(js_to_ase)?;

    let global = web_sys::window()
        .ok_or_else(|| AssetSourceError::Other("no global `fetch` available".into()))?;
    let resp_value = JsFuture::from(global.fetch_with_request(&request))
        .await
        .map_err(js_to_ase)?;
    let resp: Response = resp_value
        .dyn_into()
        .map_err(|_| AssetSourceError::Other("fetch did not return a Response".into()))?;

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
    Ok((bytes, total))
}

fn js_to_ase(e: JsValue) -> AssetSourceError {
    AssetSourceError::Other(format!("{e:?}").into())
}

/// Synchronous HTTP Range GET via XMLHttpRequest. Only valid inside a Web Worker
/// (synchronous XHR with `responseType` is forbidden on the main thread).
///
/// Returns the fetched bytes and, when present, the total resource length parsed
/// from the `Content-Range` response header.
fn fetch_range(url: &str, start: u64, end_inclusive: u64) -> IoResult<(Vec<u8>, Option<u64>)> {
    let xhr = XmlHttpRequest::new().map_err(js_err)?;
    xhr.open_with_async("GET", url, false).map_err(js_err)?;
    xhr.set_request_header("Range", &format!("bytes={start}-{end_inclusive}"))
        .map_err(js_err)?;
    xhr.set_response_type(XmlHttpRequestResponseType::Arraybuffer);
    xhr.send().map_err(js_err)?;

    let status = xhr.status().map_err(js_err)?;
    if status != 206 {
        return Err(IoError::other(format!(
            "expected 206 Partial Content from {url}, got {status} (server may not honor Range)"
        )));
    }

    let total = xhr
        .get_response_header("Content-Range")
        .ok()
        .flatten()
        .and_then(|h| parse_content_range_total(&h));

    let resp = xhr.response().map_err(js_err)?;
    let u8 = Uint8Array::new(&resp);
    let mut bytes = vec![0u8; u8.byte_length() as usize];
    u8.copy_to(&mut bytes);
    Ok((bytes, total))
}

/// Parse the total length from a `Content-Range: bytes START-END/TOTAL` header.
fn parse_content_range_total(header: &str) -> Option<u64> {
    let total = header.rsplit('/').next()?.trim();
    if total == "*" {
        return None;
    }
    total.parse::<u64>().ok()
}

fn js_err(e: JsValue) -> IoError {
    IoError::other(format!("{e:?}"))
}
