// Copyright 2025 Adobe
// All Rights Reserved.
//
// NOTICE: Adobe permits you to use, modify, and distribute this file in
// accordance with the terms of the Adobe license agreement accompanying
// it.

use std::io::{Cursor, Read, Seek};

use c2pa::{Context, Reader};
use js_sys::{Function, JsString, Uint8Array};
use serde::Serialize;
use serde_wasm_bindgen::Serializer;
use wasm_bindgen::prelude::*;
use web_sys::Blob;

use crate::{
    error::WasmError,
    range::{async_http_range_source, http_range_source, whole_object_config},
    stream::BlobStream,
    utils::cursor_to_u8array,
};

/// Wraps a `c2pa::Reader`.
#[wasm_bindgen]
pub struct WasmReader {
    reader: Reader,
    serializer: Serializer,
}

// wasm-bindgen mishandles `JsError` in a Firefox worker; return `JsString`/`JsValue`
// instead (wasm-bindgen/wasm-bindgen#4961).

#[wasm_bindgen]
impl WasmReader {
    /// Creates a `WasmReader` from an asset format and a `Blob`, with optional context JSON.
    #[wasm_bindgen(js_name = fromBlob)]
    pub async fn from_blob(
        format: &str,
        blob: &Blob,
        context_json: Option<String>,
    ) -> Result<WasmReader, JsString> {
        let stream = BlobStream::new(blob).map_err(WasmError::other)?;
        WasmReader::from_stream(format, stream, context_json).await
    }

    async fn from_stream(
        format: &str,
        stream: impl Read + Seek + Send,
        context_json: Option<String>,
    ) -> Result<WasmReader, JsString> {
        let context = match context_json {
            Some(json) => Context::new()
                .with_settings(json.as_str())
                .map_err(WasmError::from)?,
            None => Context::new(),
        };
        let reader = Reader::from_context(context)
            .with_stream_async(format, stream)
            .await
            .map_err(WasmError::from)?;

        Ok(WasmReader::from_reader(reader).await)
    }

    /// Creates a `WasmReader` from an initial-segment `Blob` and a fragment `Blob`, with optional context JSON.
    #[wasm_bindgen(js_name = fromBlobFragment)]
    pub async fn from_blob_fragment(
        format: &str,
        init: &Blob,
        fragment: &Blob,
        context_json: Option<String>,
    ) -> Result<WasmReader, JsString> {
        let init_stream = BlobStream::new(init).map_err(WasmError::other)?;
        let fragment_stream = BlobStream::new(fragment).map_err(WasmError::other)?;

        WasmReader::from_stream_fragment(format, init_stream, fragment_stream, context_json).await
    }

    async fn from_stream_fragment(
        format: &str,
        init: impl Read + Seek + Send,
        fragment: impl Read + Seek + Send,
        context_json: Option<String>,
    ) -> Result<WasmReader, JsString> {
        let context = match context_json {
            Some(json) => Context::new()
                .with_settings(json.as_str())
                .map_err(WasmError::from)?,
            None => Context::new(),
        };
        let reader = Reader::from_context(context)
            .with_fragment_async(format, init, fragment)
            .await
            .map_err(WasmError::from)?;

        Ok(WasmReader::from_reader(reader).await)
    }

    async fn from_reader(reader: Reader) -> WasmReader {
        let serializer = Serializer::new().serialize_maps_as_objects(true);

        WasmReader { reader, serializer }
    }

    /// Attempts to create a new `WasmReader` from an asset format and a URL, reading
    /// only the bytes needed via HTTP Range requests. Optionally accepts a context
    /// JSON string and an `onFetch(offset, length, total)` callback invoked per fetch.
    ///
    /// `mode` selects the transport:
    /// - `"verify"` (default): synchronous XHR with full data-hash verification.
    ///   Must run in a Web Worker (synchronous XHR is forbidden on the main thread).
    /// - `"verify-async"`: asynchronous `fetch` with full data-hash verification,
    ///   driven by the SDK on any thread (no Web Worker required). Data hashes and
    ///   file-level BMFF hashes verify one buffer at a time, bounding peak memory to
    ///   the buffer size. Box hashes and merkle BMFF report `UnverifiableOverRanges`.
    /// - `"discover"`: asynchronous `fetch`, no Web Worker required. Validates the
    ///   manifest and signature but not the data-hash binding, so it reads far fewer
    ///   bytes than either verifying mode.
    ///
    /// `hash_buffer_size_in_kb` bounds the kilobytes the hasher holds at once. It
    /// applies to every verifying mode, the worker included. Leave it unset for the
    /// SDK default.
    ///
    /// `whole_object_limit` bounds the whole-object rung the async modes fall back to
    /// for a handler that reads its input to end: a byte count, `"unbounded"`, or
    /// `"disabled"`. Leave it unset for the SDK default of 256 MiB.
    #[wasm_bindgen(js_name = fromUrl)]
    pub async fn from_url(
        format: &str,
        url: &str,
        context_json: Option<String>,
        on_fetch: Option<Function>,
        mode: Option<String>,
        hash_buffer_size_in_kb: Option<u32>,
        whole_object_limit: Option<String>,
    ) -> Result<WasmReader, JsString> {
        let context = build_context(context_json)?;
        let context = with_hash_buffer(context, hash_buffer_size_in_kb)?;
        let range_config = whole_object_config(whole_object_limit.as_deref())?;
        let context = match mode.as_deref() {
            // Discovery stays a read: the async path is now able to check the
            // binding, so verification has to be turned off explicitly.
            Some("discover") => context
                .with_settings(r#"{"verify": {"verify_after_reading": false}}"#)
                .map_err(WasmError::from)?
                .with_asset_transport_async(async_http_range_source(on_fetch, range_config)),
            Some("verify-async") => {
                context.with_asset_transport_async(async_http_range_source(on_fetch, range_config))
            }
            _ => context.with_asset_transport(http_range_source(on_fetch)),
        };
        let reader = Reader::from_context(context)
            .with_reference_async(format_hint(format), url)
            .await
            .map_err(WasmError::from)?;

        Ok(WasmReader::from_reader(reader).await)
    }

    /// Attempts to create a new `WasmReader` from a fragmented asset addressed by an
    /// initialization-segment URL and an ordered list of fragment URLs, reading only
    /// the bytes needed via HTTP Range requests.
    ///
    /// Must run in a Web Worker (synchronous XHR).
    #[wasm_bindgen(js_name = fromUrlFragment)]
    pub async fn from_url_fragment(
        format: &str,
        init_url: &str,
        fragment_urls: Vec<String>,
        context_json: Option<String>,
        on_fetch: Option<Function>,
        hash_buffer_size_in_kb: Option<u32>,
    ) -> Result<WasmReader, JsString> {
        let context = with_hash_buffer(build_context(context_json)?, hash_buffer_size_in_kb)?
            .with_asset_transport(http_range_source(on_fetch));
        let reader = Reader::from_context(context)
            .with_fragment_references_async(format_hint(format), init_url, &fragment_urls)
            .await
            .map_err(WasmError::from)?;

        Ok(WasmReader::from_reader(reader).await)
    }

    /// Returns the label of the asset's active manifest.
    #[wasm_bindgen(js_name = activeLabel)]
    pub fn active_label(&self) -> Option<String> {
        self.reader.active_label().map(|val| val.to_owned())
    }

    /// Returns the asset's manifest store.
    #[wasm_bindgen(js_name = manifestStore)]
    pub fn manifest_store(&self) -> Result<JsValue, JsString> {
        let manifest_store = self
            .reader
            .serialize(&self.serializer)
            .map_err(WasmError::from)?;

        Ok(manifest_store)
    }

    /// Returns the asset's active manifest.
    #[wasm_bindgen(js_name = activeManifest)]
    pub fn active_manifest(&self) -> Result<JsValue, JsString> {
        let active_manifest = self
            .reader
            .active_manifest()
            .serialize(&self.serializer)
            .map_err(WasmError::from)?;

        Ok(active_manifest)
    }

    /// Returns a JSON representation of the asset's manifest store.
    #[wasm_bindgen]
    pub fn json(&self) -> String {
        self.reader.json()
    }

    /// Returns the asset's manifest store as crJSON.
    #[wasm_bindgen(js_name = crJson)]
    pub fn crjson(&self) -> String {
        self.reader.crjson()
    }

    /// Accepts a URI reference to a binary object in the resource store and returns a `js_sys::Uint8Array` containing the resource's bytes.
    #[wasm_bindgen(js_name = resourceToBytes)]
    pub fn resource_to_bytes(&self, uri: &str) -> Result<Uint8Array, JsString> {
        let data = Vec::new();
        let mut stream = Cursor::new(data);

        self.reader
            .resource_to_stream(uri, &mut stream)
            .map_err(WasmError::from)?;

        Ok(cursor_to_u8array(stream)?)
    }
}

/// Turns a JavaScript format string into the SDK's format hint.
///
/// JavaScript has no `Option`, so an empty string is how a caller says "unknown".
/// The SDK wants `None` there, since `""` would otherwise read as a real hint and
/// suppress the transport's own `Content-Type`.
fn format_hint(format: &str) -> Option<&str> {
    let format = format.trim();
    (!format.is_empty()).then_some(format)
}

/// Build a [`Context`] from an optional settings-JSON string.
/// Folds the hasher's buffer size into the context settings.
///
/// It reaches every verifying mode this way, the synchronous worker path included,
/// because the hasher reads it from `Settings`.
fn with_hash_buffer(context: Context, kb: Option<u32>) -> Result<Context, JsString> {
    match kb {
        Some(kb) => Ok(context
            .with_settings(format!(r#"{{"core": {{"hash_buffer_size_in_kb": {kb}}}}}"#).as_str())
            .map_err(WasmError::from)?),
        None => Ok(context),
    }
}

fn build_context(context_json: Option<String>) -> Result<Context, JsString> {
    match context_json {
        Some(json) => Ok(Context::new()
            .with_settings(json.as_str())
            .map_err(WasmError::from)?),
        None => Ok(Context::new()),
    }
}
