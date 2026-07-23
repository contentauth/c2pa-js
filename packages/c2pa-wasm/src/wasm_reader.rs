// Copyright 2025 Adobe
// All Rights Reserved.
//
// NOTICE: Adobe permits you to use, modify, and distribute this file in
// accordance with the terms of the Adobe license agreement accompanying
// it.

use std::io::{Cursor, Read, Seek};

use c2pa::{Context, Reader};
use js_sys::{JsString, Uint8Array};
use serde::Serialize;
use serde_wasm_bindgen::Serializer;
use wasm_bindgen::prelude::*;
use web_sys::Blob;

use crate::{error::WasmError, stream::BlobStream, utils::cursor_to_u8array};

/// Wraps a `c2pa::Reader`.
#[wasm_bindgen]
pub struct WasmReader {
    reader: Reader,
    serializer: Serializer,
}

/**
 * NOTE: we can only return Err(JsString) or Err(JsValue) as error types here, because for some as-of-yet unknown
 * reason, wasm-bindgen appears to mishandle JsErrors when created in a Firefox web worker.
 *
 * See: https://github.com/wasm-bindgen/wasm-bindgen/issues/4961
 */

#[wasm_bindgen]
impl WasmReader {
    /// Attempts to create a new `WasmReader` from an asset format and `Blob` of the asset's bytes.
    /// Optionally accepts a context JSON string to configure the reader.
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
        let reader = if let Some(json) = context_json {
            let context = Context::new()
                .with_settings(json.as_str())
                .map_err(WasmError::from)?;
            Reader::from_context(context)
                .with_stream_async(format, stream)
                .await
                .map_err(WasmError::from)?
        } else {
            Reader::from_stream_async(format, stream)
                .await
                .map_err(WasmError::from)?
        };

        Ok(WasmReader::from_reader(reader).await)
    }

    /// Attempts to create a new `WasmReader` from an asset format and the asset's raw bytes.
    ///
    /// Unlike [`WasmReader::from_blob`], this entry point does not use any browser-only Web
    /// APIs (`Blob`, `FileReaderSync`). The bytes are read from an in-memory [`Cursor`], which
    /// implements [`Read`] + [`Seek`], so this can be called from non-browser JavaScript
    /// runtimes such as Node.js, Deno, Bun, and Cloudflare Workers (workerd).
    ///
    /// Optionally accepts a context JSON string to configure the reader.
    #[wasm_bindgen(js_name = fromBytes)]
    pub async fn from_bytes(
        format: &str,
        bytes: Vec<u8>,
        context_json: Option<String>,
    ) -> Result<WasmReader, JsString> {
        let stream = Cursor::new(bytes);
        WasmReader::from_stream(format, stream, context_json).await
    }

    /// Attempts to create a new `WasmReader` from an asset format, a `Blob` of the bytes of the initial segment, and a fragment `Blob`.
    /// Optionally accepts a context JSON string to configure the reader.
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
        let reader = if let Some(json) = context_json {
            let context = Context::new()
                .with_settings(json.as_str())
                .map_err(WasmError::from)?;
            Reader::from_context(context)
                .with_fragment_async(format, init, fragment)
                .await
                .map_err(WasmError::from)?
        } else {
            Reader::from_fragment_async(format, init, fragment)
                .await
                .map_err(WasmError::from)?
        };

        Ok(WasmReader::from_reader(reader).await)
    }

    async fn from_reader(reader: Reader) -> WasmReader {
        let serializer = Serializer::new().serialize_maps_as_objects(true);

        WasmReader { reader, serializer }
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

#[cfg(test)]
mod tests {
    use wasm_bindgen_test::wasm_bindgen_test;

    use super::*;

    // A JPEG with a real embedded C2PA manifest (Adobe/CAI test asset).
    const SIGNED_JPEG: &[u8] = include_bytes!("../tests/fixtures/C.jpg");

    // `fromBytes` reads the asset from an in-memory buffer with no `Blob` / `FileReaderSync`, so
    // verification works in non-browser runtimes (Node.js, Deno, Bun, Cloudflare Workers). The
    // crate-wide `run_in_dedicated_worker` config (from the BlobStream tests) still governs the test
    // harness itself; the runtime portability is exercised outside wasm-bindgen-test.

    #[wasm_bindgen_test]
    async fn from_bytes_reads_active_manifest() {
        let reader = WasmReader::from_bytes("image/jpeg", SIGNED_JPEG.to_vec(), None)
            .await
            .expect("fromBytes should read the embedded manifest");

        assert!(
            reader.active_label().is_some(),
            "a signed asset should expose an active manifest"
        );
    }

    #[wasm_bindgen_test]
    async fn from_bytes_without_manifest_errors() {
        // A minimal JPEG (SOI + EOI) with no C2PA data must be rejected, not silently accepted.
        let empty_jpeg = vec![0xff, 0xd8, 0xff, 0xd9];
        let result = WasmReader::from_bytes("image/jpeg", empty_jpeg, None).await;

        assert!(result.is_err(), "an asset without C2PA data must error");
    }
}
