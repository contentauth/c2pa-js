// Copyright 2025 Adobe
// All Rights Reserved.
//
// NOTICE: Adobe permits you to use, modify, and distribute this file in
// accordance with the terms of the Adobe license agreement accompanying
// it.

use std::io::{Cursor, Read, Seek};

use c2pa::{Context, Reader};
use js_sys::{Error as JsError, Uint8Array};
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

#[wasm_bindgen]
impl WasmReader {
    /// Attempts to create a new `WasmReader` from an asset format and `Blob` of the asset's bytes.
    /// Optionally accepts a context JSON string to configure the reader.
    #[wasm_bindgen(js_name = fromBlob)]
    pub async fn from_blob(
        format: &str,
        blob: &Blob,
        context_json: Option<String>,
    ) -> Result<WasmReader, JsError> {
        let stream = BlobStream::new(blob);
        WasmReader::from_stream(format, stream, context_json).await
    }

    async fn from_stream(
        format: &str,
        stream: impl Read + Seek + Send,
        context_json: Option<String>,
    ) -> Result<WasmReader, JsError> {
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

    /// Attempts to create a new `WasmReader` from an asset format, a `Blob` of the bytes of the initial segment, and a fragment `Blob`.
    /// Optionally accepts a context JSON string to configure the reader.
    #[wasm_bindgen(js_name = fromBlobFragment)]
    pub async fn from_blob_fragment(
        format: &str,
        init: &Blob,
        fragment: &Blob,
        context_json: Option<String>,
    ) -> Result<WasmReader, JsError> {
        let init_stream = BlobStream::new(init);
        let fragment_stream = BlobStream::new(fragment);

        WasmReader::from_stream_fragment(format, init_stream, fragment_stream, context_json).await
    }

    async fn from_stream_fragment(
        format: &str,
        init: impl Read + Seek + Send,
        fragment: impl Read + Seek + Send,
        _context_json: Option<String>,
    ) -> Result<WasmReader, JsError> {
        // TODO: CAI-10614 Context support for fragments is not currently available
        // due to private APIs in c2pa-rs. For now, we use the default context.
        let reader = Reader::from_fragment_async(format, init, fragment)
            .await
            .map_err(WasmError::from)?;

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
    pub fn manifest_store(&self) -> Result<JsValue, JsError> {
        let manifest_store = self
            .reader
            .serialize(&self.serializer)
            .map_err(WasmError::from)?;

        Ok(manifest_store)
    }

    /// Returns the asset's active manifest.
    #[wasm_bindgen(js_name = activeManifest)]
    pub fn active_manifest(&self) -> Result<JsValue, JsError> {
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

    /// Accepts a URI reference to a binary object in the resource store and returns a `js_sys::Uint8Array` containing the resource's bytes.
    #[wasm_bindgen(js_name = resourceToBytes)]
    pub fn resource_to_bytes(&self, uri: &str) -> Result<Uint8Array, JsError> {
        let data = Vec::new();
        let mut stream = Cursor::new(data);

        self.reader
            .resource_to_stream(uri, &mut stream)
            .map_err(WasmError::from)?;

        cursor_to_u8array(stream)
    }
}
