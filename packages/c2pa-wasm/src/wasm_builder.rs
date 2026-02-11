// Copyright 2025 Adobe
// All Rights Reserved.
//
// NOTICE: Adobe permits you to use, modify, and distribute this file in
// accordance with the terms of the Adobe license agreement accompanying
// it.

use std::io::Cursor;

use c2pa::{assertions::Action, Builder, BuilderIntent, Context, Ingredient};
use js_sys::{Error as JsError, JsString, Uint8Array};
use serde::{Deserialize, Serialize};
use serde_wasm_bindgen::Serializer;
use wasm_bindgen::prelude::*;
use web_sys::Blob;

use crate::{
    error::WasmError,
    stream::BlobStream,
    utils::cursor_to_u8array,
    wasm_signer::{SignerDefinition, WasmSigner},
};

/// Wraps a `c2pa::Builder`.
#[wasm_bindgen]
pub struct WasmBuilder {
    builder: Builder,
    serializer: Serializer,
}

/// Holds the bytes of an asset and manifest.
#[derive(Deserialize, Serialize)]
struct AssetAndManifestBytes {
    #[serde(with = "serde_bytes")]
    pub asset: Vec<u8>,
    #[serde(with = "serde_bytes")]
    pub manifest: Vec<u8>,
}

#[wasm_bindgen]
impl WasmBuilder {
    /// Creates a new `WasmBuilder` with a minimal manifest definition.
    /// Optionally accepts a context JSON string to configure the builder.
    #[wasm_bindgen(js_name = new)]
    pub fn new(context_json: Option<String>) -> Result<WasmBuilder, JsError> {
        let builder = if let Some(json) = context_json {
            let context = Context::new()
                .with_settings(json.as_str())
                .map_err(WasmError::from)?;
            Builder::from_context(context)
        } else {
            Builder::new()
        };

        Ok(WasmBuilder::from_builder(builder))
    }

    /// Sets the builder "intent."
    #[wasm_bindgen(js_name = setIntent)]
    pub fn set_intent(&mut self, json_intent: JsValue) -> Result<(), JsError> {
        let intent: BuilderIntent =
            serde_wasm_bindgen::from_value(json_intent).map_err(WasmError::from)?;
        self.builder.set_intent(intent);

        Ok(())
    }

    /// Attempts to create a new `WasmBuilder` from a JSON ManifestDefinition string.
    /// Optionally accepts a context JSON string to configure the builder.
    #[wasm_bindgen(js_name = fromJson)]
    pub fn from_json(json: &str, context_json: Option<String>) -> Result<WasmBuilder, JsError> {
        let builder = if let Some(ctx_json) = context_json {
            let context = Context::new()
                .with_settings(ctx_json.as_str())
                .map_err(WasmError::from)?;
            let mut builder = Builder::from_context(context);
            // Parse the manifest definition and set it directly
            let definition = Builder::from_json(json)
                .map_err(WasmError::from)?
                .definition;
            builder.definition = definition;
            builder
        } else {
            Builder::from_json(json).map_err(WasmError::from)?
        };

        Ok(WasmBuilder::from_builder(builder))
    }

    /// Attempts to create a new `WasmBuilder` from a builder archive.
    /// Optionally accepts a context JSON string to configure the builder.
    #[wasm_bindgen(js_name = fromArchive)]
    pub fn from_archive(
        archive: &Blob,
        context_json: Option<String>,
    ) -> Result<WasmBuilder, JsError> {
        let stream = BlobStream::new(archive);
        let builder = if let Some(ctx_json) = context_json {
            let context = Context::new()
                .with_settings(ctx_json.as_str())
                .map_err(WasmError::from)?;
            Builder::from_context(context)
                .with_archive(stream)
                .map_err(WasmError::from)?
        } else {
            Builder::from_archive(stream).map_err(WasmError::from)?
        };

        Ok(WasmBuilder::from_builder(builder))
    }

    fn from_builder(builder: Builder) -> WasmBuilder {
        let serializer = Serializer::new().serialize_maps_as_objects(true);

        WasmBuilder {
            builder,
            serializer,
        }
    }

    /// Add an action to the manifest's `Actions` assertion.
    #[wasm_bindgen(js_name = addAction)]
    pub fn add_action(&mut self, action: JsValue) -> Result<(), JsError> {
        let action: Action = serde_wasm_bindgen::from_value(action).map_err(WasmError::from)?;

        self.builder.add_action(action).map_err(WasmError::from)?;

        Ok(())
    }

    /// Sets the remote_url for a remote manifest.
    ///
    /// The URL must return the manifest data and is injected into the destination asset when signing.
    /// For remote-only manifests, set the `no_embed` flag to `true`.
    #[wasm_bindgen(js_name = setRemoteUrl)]
    pub fn set_remote_url(&mut self, url: &str) {
        self.builder.set_remote_url(url);
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

    /// Add an ingredient to the manifest from a JSON ingredient definition without a blob
    ///
    /// # Arguments
    /// * `ingredient_json` - A JSON string representing the ingredient.
    #[wasm_bindgen(js_name = addIngredient)]
    pub fn add_ingredient(&mut self, json: &str) -> Result<(), JsError> {
        let ingredient = Ingredient::from_json(json).map_err(WasmError::from)?;
        self.builder.add_ingredient(ingredient);

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

    /// Add an ingredient to the manifest from ingredient JSON and manifest store bytes.
    ///
    /// This supports an "ingredient rehydration" workflow where the original ingredient asset bytes are
    /// not available. This does not verify hard-binding against the original asset.
    ///
    /// # Arguments
    /// * `ingredient_json` - A JSON string representing the ingredient's metadata (serde representation of `c2pa::Ingredient`).
    /// * `manifest_data` - Optional byte array containing the ingredient's C2PA manifest store (JUMBF bytes, application/c2pa).
    ///   If omitted or empty, the embedded manifest store is not set.
    /// * `relationship` - Optional relationship string ("parentOf", "componentOf", or "inputTo") that overrides any relationship in JSON.
    #[wasm_bindgen(js_name = addIngredientFromJsonAndManifestStore)]
    pub fn add_ingredient_from_json_and_manifest_store(
        &mut self,
        ingredient_json: &str,
        manifest_data: Option<Uint8Array>,
        relationship: Option<String>,
    ) -> Result<(), JsError> {
        let mut ingredient =
            c2pa::Ingredient::from_json(ingredient_json).map_err(WasmError::from)?;

        if let Some(manifest_data) = manifest_data {
            let data_vec = manifest_data.to_vec();
            if !data_vec.is_empty() {
                ingredient
                    .set_manifest_data(data_vec)
                    .map_err(WasmError::from)?;
            }
        }

        if let Some(rel) = relationship {
            let relationship = match rel.as_str() {
                "parentOf" => c2pa::Relationship::ParentOf,
                "componentOf" => c2pa::Relationship::ComponentOf,
                "inputTo" => c2pa::Relationship::InputTo,
                _ => return Err(JsError::new("Invalid relationship value")),
            };
            ingredient.set_relationship(relationship);
        }

        self.builder.add_ingredient(ingredient);

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

    /// "Save" a builder to an archive.
    #[wasm_bindgen(js_name = toArchive)]
    pub fn to_archive(&mut self) -> Result<Uint8Array, JsError> {
        let data = Vec::new();
        let mut stream = Cursor::new(data);

        self.builder
            .to_archive(&mut stream)
            .map_err(WasmError::from)?;

        cursor_to_u8array(stream)
    }

    /// Sign an asset using the provided SignerDefinition, format, and source Blob.
    #[wasm_bindgen]
    pub async fn sign(
        &mut self,
        signer_definition: &SignerDefinition,
        format: &str,
        source: &Blob,
    ) -> Result<Vec<u8>, JsError> {
        let mut asset: Vec<u8> = Vec::new();

        self.sign_internal(signer_definition, format, source, &mut asset)
            .await?;

        Ok(asset)
    }

    /// Sign an asset using the provided SignerDefinition, format, and source Blob.
    /// Use this method to get both the manifest bytes and the bytes of the signed asset.
    #[wasm_bindgen(js_name = signAndGetManifestBytes)]
    pub async fn sign_and_get_manifest_bytes(
        &mut self,
        signer_definition: &SignerDefinition,
        format: &str,
        source: &Blob,
    ) -> Result<JsValue, JsError> {
        let mut asset: Vec<u8> = Vec::new();

        let manifest = self
            .sign_internal(signer_definition, format, source, &mut asset)
            .await?;

        let result = AssetAndManifestBytes { manifest, asset }
            .serialize(&self.serializer)
            .map_err(WasmError::from)?;

        Ok(result)
    }

    async fn sign_internal(
        &mut self,
        signer_definition: &SignerDefinition,
        format: &str,
        source: &Blob,
        dest: &mut Vec<u8>,
    ) -> Result<Vec<u8>, JsError> {
        let signer = WasmSigner::from_definition(&signer_definition)?;
        let mut stream = BlobStream::new(source);

        let mut cursor = Cursor::new(dest);

        let manifest = self
            .builder
            .sign_async(&signer, format, &mut stream, &mut cursor)
            .await
            .map_err(WasmError::from)?;

        Ok(manifest)
    }
}
