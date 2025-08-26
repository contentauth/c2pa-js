// Copyright 2025 Adobe
// All Rights Reserved.
//
// NOTICE: Adobe permits you to use, modify, and distribute this file in
// accordance with the terms of the Adobe license agreement accompanying
// it.

use std::io::{Cursor, Read, Seek};

use c2pa::{identity::validator::CawgValidator, Reader};
use js_sys::{ArrayBuffer, Error as JsError, Uint8Array};
use wasm_bindgen::prelude::*;
use web_sys::Blob;

use crate::{error::WasmError, stream::BlobStream};

/// Wraps a `c2pa::Reader`.
#[wasm_bindgen]
pub struct WasmReader {
    reader: Reader,
}

#[wasm_bindgen]
impl WasmReader {
    /// Attempts to create a new `WasmReader` from an asset format and `web_sys::Blob` of the asset's bytes.
    #[wasm_bindgen(js_name = fromBlob)]
    pub async fn from_blob(format: &str, blob: &Blob) -> Result<WasmReader, JsError> {
        let stream = BlobStream::new(blob);
        WasmReader::from_stream(format, stream).await
    }

    async fn from_stream(
        format: &str,
        stream: impl Read + Seek + Send,
    ) -> Result<WasmReader, JsError> {
        let mut reader = Reader::from_stream_async(format, stream)
            .await
            .map_err(WasmError::from)?;

        // This will be removed once CawgValidation is rolled into the reader
        reader
            .post_validate_async(&CawgValidator {})
            .await
            .map_err(WasmError::other)?;

        Ok(WasmReader { reader })
    }

    /// Returns a JSON representation of the asset's manifest store.
    #[wasm_bindgen]
    pub fn json(&self) -> String {
        self.reader.json()
    }

    /// Returns the label of the asset's active manifest.
    #[wasm_bindgen(js_name = activeLabel)]
    pub fn active_label(&self) -> Option<String> {
        self.reader.active_label().map(|val| val.to_owned())
    }

    /// Accepts a URI reference to a binary object in the resource store and returns a `js_sys::ArrayBuffer` containing the resource's bytes.
    #[wasm_bindgen(js_name = resourceToBuffer)]
    pub fn resource_to_buffer(&self, uri: &str) -> Result<ArrayBuffer, JsError> {
        let mut data = Vec::new();
        let mut stream = Cursor::new(data);
        self.reader
            .resource_to_stream(uri, &mut stream)
            .map_err(WasmError::from)?;
        data = stream.into_inner();
        let data_len: u32 = data.len().try_into().map_err(WasmError::other)?;
        let uint8array = Uint8Array::new_with_length(data_len);
        uint8array.copy_from(&data);
        Ok(uint8array.buffer())
    }
}
