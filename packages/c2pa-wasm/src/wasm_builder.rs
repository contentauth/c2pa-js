// Copyright 2025 Adobe
// All Rights Reserved.
//
// NOTICE: Adobe permits you to use, modify, and distribute this file in
// accordance with the terms of the Adobe license agreement accompanying
// it.

use std::io::Cursor;

use c2pa::Builder;
use js_sys::{Error as JsError, JsString};
use serde::Serialize;
use serde_wasm_bindgen::Serializer;
use wasm_bindgen::prelude::*;
use web_sys::Blob;

use crate::{
    error::WasmError,
    stream::BlobStream,
    wasm_signer::{SignerDefinition, WasmSigner},
};

/// Wraps a `c2pa::Builder`.
#[wasm_bindgen]
pub struct WasmBuilder {
    builder: Builder,
    serializer: Serializer,
}

#[wasm_bindgen]
impl WasmBuilder {
    /// Attempts to create a new `WasmBuilder` from a JSON ManifestDefinition string.
    #[wasm_bindgen(js_name = fromJson)]
    pub fn from_json(json: &str) -> Result<WasmBuilder, JsError> {
        let serializer = Serializer::new().serialize_maps_as_objects(true);
        let builder = Builder::from_json(json).map_err(WasmError::from)?;

        Ok(WasmBuilder {
            builder,
            serializer,
        })
    }

    /// Sets the remote_url for a remote manifest.
    ///
    /// The URL must return the manifest data and is injected into the destination asset when signing.
    /// For remote-only manifests, set the `no_embed` flag to `true`.
    #[wasm_bindgen(js_name = setRemoteUrl)]
    pub fn set_remote_url(&mut self, format: &str) {
        self.builder.set_remote_url(format);
    }

    /// Sets the state of the no_embed flag.
    #[wasm_bindgen(js_name = setNoEmbed)]
    pub fn set_no_embed(&mut self, no_embed: bool) {
        self.builder.set_no_embed(no_embed);
    }

    /// Sets a thumbnail from a [`Blob`] to be included in the manifest. The thumbnail should represent the asset being signed.
    #[wasm_bindgen(js_name = setThumbnailFromBlob)]
    pub fn set_thumbnail_from_blob(&mut self, format: &str, blob: &Blob) -> Result<(), JsError> {
        let mut stream = BlobStream::new(blob);
        self.builder
            .set_thumbnail(format, &mut stream)
            .map_err(WasmError::from)?;

        Ok(())
    }

    /// Add an ingredient to the manifest from a JSON ingredient definition and a [`Blob`].
    ///
    /// # Arguments
    /// * `ingredient_json` - A JSON string representing the ingredient. This ingredient is merged with the ingredient specified in the `stream` argument, and these values take precedence.
    /// * `format` - The format of the ingredient.
    /// * `blob` - A [`Blob`] representing an asset which should be included as an ingredient.
    #[wasm_bindgen(js_name = addIngredientFromBlob)]
    pub fn add_ingredient_from_blob(
        &mut self,
        json: &str,
        format: &str,
        blob: &Blob,
    ) -> Result<(), JsError> {
        let mut stream = BlobStream::new(blob);
        self.builder
            .add_ingredient_from_stream(json, format, &mut stream)
            .map_err(WasmError::from)?;

        Ok(())
    }

    /// Add a [`Blob`] to the manifest as a resource. The ID must match an identifier in the manifest.
    #[wasm_bindgen(js_name = addResourceFromBlob)]
    pub fn add_resource_from_blob(&mut self, id: &str, blob: &Blob) -> Result<(), JsError> {
        let mut stream = BlobStream::new(blob);
        self.builder
            .add_resource(id, &mut stream)
            .map_err(WasmError::from)?;

        Ok(())
    }

    /// Get the current manifest definition.
    #[wasm_bindgen(js_name = getDefinition)]
    pub fn get_definition(&self) -> Result<JsString, JsError> {
        let manifest_definition: JsString = self
            .builder
            .definition
            .serialize(&self.serializer)
            .map_err(WasmError::from)?
            .into();

        Ok(manifest_definition)
    }

    /// Sign an asset using the provided SignerDefinition, format, and source Blob.
    #[wasm_bindgen]
    pub async fn sign(
        &mut self,
        signer_definition: &SignerDefinition,
        format: &str,
        source: &Blob,
    ) -> Result<Vec<u8>, JsError> {
        let signer = WasmSigner::from_definition(&signer_definition)?;
        let mut stream = BlobStream::new(source);

        let mut bytes: Vec<u8> = Vec::new();
        let mut cursor = Cursor::new(&mut bytes);

        self.builder
            .sign_async(&signer, format, &mut stream, &mut cursor)
            .await
            .unwrap();

        Ok(bytes)
    }
}
