// Copyright 2025 Adobe
// All Rights Reserved.
//
// NOTICE: Adobe permits you to use, modify, and distribute this file in
// accordance with the terms of the Adobe license agreement accompanying
// it.

use std::io::Cursor;

use c2pa::{
    Builder, BuilderIntent, Context, Ingredient,
    assertions::{Action, Actions, C2paReason},
};
use js_sys::{JsString, Uint8Array};
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

/**
 * NOTE: we can only return Err(JsString) or Err(JsValue) as error types here, because for some as-of-yet unknown
 * reason, wasm-bindgen appears to mishandle JsErrors when created in a Firefox web worker.
 *
 * See: https://github.com/wasm-bindgen/wasm-bindgen/issues/4961
 */

#[wasm_bindgen]
impl WasmBuilder {
    /// Creates a new `WasmBuilder` with a minimal manifest definition.
    /// Optionally accepts a context JSON string to configure the builder.
    #[wasm_bindgen(js_name = new)]
    pub fn new(context_json: Option<String>) -> Result<WasmBuilder, JsString> {
        let context = match context_json {
            Some(json) => Context::new()
                .with_settings(json.as_str())
                .map_err(WasmError::from)?,
            None => Context::new(),
        };
        let builder = Builder::from_context(context);

        Ok(WasmBuilder::from_builder(builder))
    }

    /// Sets the builder "intent."
    #[wasm_bindgen(js_name = setIntent)]
    pub fn set_intent(&mut self, json_intent: JsValue) -> Result<(), JsString> {
        let intent: BuilderIntent =
            serde_wasm_bindgen::from_value(json_intent).map_err(WasmError::from)?;
        self.builder.set_intent(intent);

        Ok(())
    }

    /// Attempts to create a new `WasmBuilder` from a JSON ManifestDefinition string.
    /// Optionally accepts a context JSON string to configure the builder.
    #[wasm_bindgen(js_name = fromJson)]
    pub fn from_json(json: &str, context_json: Option<String>) -> Result<WasmBuilder, JsString> {
        let context = match context_json {
            Some(ctx_json) => Context::new()
                .with_settings(ctx_json.as_str())
                .map_err(WasmError::from)?,
            None => Context::new(),
        };
        let builder = Builder::from_context(context)
            .with_definition(json)
            .map_err(WasmError::from)?;

        Ok(WasmBuilder::from_builder(builder))
    }

    /// Attempts to create a new `WasmBuilder` from a builder archive.
    /// Optionally accepts a context JSON string to configure the builder.
    #[wasm_bindgen(js_name = fromArchive)]
    pub fn from_archive(
        archive: &Blob,
        context_json: Option<String>,
    ) -> Result<WasmBuilder, JsString> {
        let stream = BlobStream::new(archive).map_err(WasmError::other)?;
        let builder = if let Some(ctx_json) = context_json {
            let context = Context::new()
                .with_settings(ctx_json.as_str())
                .map_err(WasmError::from)?;
            Builder::from_context(context)
                .with_archive(stream)
                .map_err(WasmError::from)?
        } else {
            Builder::default()
                .with_archive(stream)
                .map_err(WasmError::from)?
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
    pub fn add_action(&mut self, action: JsValue) -> Result<(), JsString> {
        let action: Action = serde_wasm_bindgen::from_value(action).map_err(WasmError::from)?;

        self.builder.add_action(action).map_err(WasmError::from)?;

        Ok(())
    }

    /// Add an assertion to the manifest under `label` with the given `data`.
    #[wasm_bindgen(js_name = addAssertion)]
    pub fn add_assertion(&mut self, label: String, data: JsValue) -> Result<(), JsString> {
        let data: serde_json::Value =
            serde_wasm_bindgen::from_value(data).map_err(WasmError::from)?;

        self.builder
            .add_assertion(&label, &data)
            .map_err(WasmError::from)?;

        Ok(())
    }

    /// Add a redaction for a JUMBF URI with the given reason.
    ///
    /// Adds the URI to the builder's redaction list and appends a `c2pa.redacted` action
    /// with the reason and URI parameter, as required by the C2PA spec.
    #[wasm_bindgen(js_name = addRedaction)]
    pub fn add_redaction(&mut self, uri: String, reason: JsValue) -> Result<(), JsString> {
        let reason: C2paReason = serde_wasm_bindgen::from_value(reason).map_err(WasmError::from)?;

        self.builder
            .definition
            .redactions
            .get_or_insert_with(Vec::new)
            .push(uri.clone());

        let action = Action::new("c2pa.redacted")
            .set_reason(reason)
            .set_parameter("redacted".to_owned(), uri)
            .map_err(WasmError::from)?;

        self.builder.add_action(action).map_err(WasmError::from)?;

        Ok(())
    }

    /// Retains only the actions at the given 0-based indices into the actions currently returned
    /// by [`Self::get_definition`]'s `c2pa.actions` assertion.
    ///
    /// The inception action, `c2pa.created` or `c2pa.opened`, is always kept regardless of
    /// `indices`, and is moved to index 0 if needed, so the manifest stays valid per the C2PA
    /// spec. Sets `allActionsIncluded = false` when anything is removed.
    ///
    /// Indices are resolved on the JS side, rather than accepting a predicate here, because the
    /// builder lives in a worker and JS callbacks can't be invoked synchronously across that
    /// boundary.
    ///
    /// This does not touch ingredients. Call [`Self::filter_ingredients_at`] with an empty list
    /// to drop all orphans afterwards if you also want to drop ingredients now orphaned by the
    /// removed actions.
    #[wasm_bindgen(js_name = filterActionsAt)]
    pub fn filter_actions_at(&mut self, indices: Vec<u32>) -> Result<(), JsString> {
        let indices: std::collections::HashSet<u32> = indices.into_iter().collect();
        // `usize` position counter: it can never exceed the number of actions in memory, so it
        // cannot overflow the way a `u32` counter theoretically could.
        let mut i: usize = 0;
        self.builder
            .filter_actions(|_action| {
                let keep = u32::try_from(i).is_ok_and(|idx| indices.contains(&idx));
                i += 1;
                keep
            })
            .map_err(WasmError::from)?;

        Ok(())
    }

    /// Retains ingredients, rescuing an otherwise-orphaned ingredient when its 0-based index into
    /// [`Self::get_definition`]'s `ingredients` array is present in `indices`. Referenced and
    /// `parentOf` ingredients are always kept, per `Builder::filter_ingredients`; `indices` can
    /// only rescue an orphan, never drop a referenced or lineage ingredient.
    ///
    /// See [`Self::filter_actions_at`] for why this takes indices rather than a predicate.
    #[wasm_bindgen(js_name = filterIngredientsAt)]
    pub fn filter_ingredients_at(&mut self, indices: Vec<u32>) -> Result<(), JsString> {
        let indices: std::collections::HashSet<u32> = indices.into_iter().collect();
        // See `filter_actions_at`: `usize` cannot overflow for an in-memory ingredient count.
        let mut i: usize = 0;
        self.builder
            .filter_ingredients(|_ingredient| {
                let rescue = u32::try_from(i).is_ok_and(|idx| indices.contains(&idx));
                i += 1;
                rescue
            })
            .map_err(WasmError::from)?;

        Ok(())
    }

    /// Retains actions and ingredients together in one step, per
    /// `Builder::filter_actions_and_ingredients`. `action_indices`/`ingredient_indices` are
    /// 0-based indices into [`Self::get_definition`]'s `c2pa.actions` assertion / `ingredients`
    /// array, resolved on the JS side for the same reason as [`Self::filter_actions_at`].
    ///
    /// `rescue_ingredient` (driven by `ingredient_indices`) is evaluated for every ingredient
    /// first; any action referencing an ingredient it would rescue is force-kept regardless of
    /// `keep_action`.
    #[wasm_bindgen(js_name = filterActionsAndIngredientsAt)]
    pub fn filter_actions_and_ingredients_at(
        &mut self,
        action_indices: Vec<u32>,
        ingredient_indices: Vec<u32>,
    ) -> Result<(), JsString> {
        let action_indices: std::collections::HashSet<u32> = action_indices.into_iter().collect();
        let ingredient_indices: std::collections::HashSet<u32> =
            ingredient_indices.into_iter().collect();
        // See `filter_actions_at`: `usize` cannot overflow for an in-memory action/ingredient
        // count.
        let mut action_i: usize = 0;
        let mut ingredient_i: usize = 0;
        self.builder
            .filter_actions_and_ingredients(
                |_action| {
                    let keep =
                        u32::try_from(action_i).is_ok_and(|idx| action_indices.contains(&idx));
                    action_i += 1;
                    keep
                },
                |_ingredient| {
                    let rescue = u32::try_from(ingredient_i)
                        .is_ok_and(|idx| ingredient_indices.contains(&idx));
                    ingredient_i += 1;
                    rescue
                },
            )
            .map_err(WasmError::from)?;

        Ok(())
    }

    /// Replaces the actions in the `c2pa.actions`/`c2pa.actions.v2` assertions with
    /// `action_groups`, computed on the JS side (see [`Self::filter_actions_at`]).
    /// `softwareAgents`/`allActionsIncluded`/`templates`/`metadata` are preserved as-is.
    ///
    /// A manifest can carry more than one actions assertion (the created-list and gathered-list
    /// entries are distinct assertions), so `action_groups` is a list-of-lists: one entry per
    /// actions assertion, in the same positional order this binding enumerates them.
    ///
    /// Each assertion is rewritten in place, which keeps its label, `created` flag, `kind`, and
    /// position in the assertion list — mirroring `Builder::filter_actions` in c2pa-rs. A group
    /// that is empty drops its assertion rather than writing an invalid empty actions array.
    /// No-op if there is no actions assertion. Use `add_action` for those.
    ///
    /// All fallible work runs before any mutation, so a failure never leaves a partially-rewritten
    /// builder. An existing but malformed actions assertion is surfaced as an error rather than
    /// silently replaced.
    ///
    /// The groups are written back verbatim: they are not validated or reordered, and unlike
    /// [`Self::filter_actions_at`] the inception action is not force-kept. A caller that drops
    /// `c2pa.created`/`c2pa.opened` or moves it out of first position can produce an actions
    /// array that fails validation at signing time.
    #[wasm_bindgen(js_name = updateActionsAt)]
    pub fn update_actions_at(&mut self, action_groups: JsValue) -> Result<(), JsString> {
        let action_groups: Vec<Vec<Action>> =
            serde_wasm_bindgen::from_value(action_groups).map_err(WasmError::from)?;

        // Every actions assertion, in positional order.
        let positions: Vec<usize> = self
            .builder
            .definition
            .assertions
            .iter()
            .enumerate()
            .filter(|(_, a)| a.label.starts_with(Actions::LABEL))
            .map(|(i, _)| i)
            .collect();

        if action_groups.len() != positions.len() {
            return Err(JsString::from(format!(
                "updateActionsAt: expected {} action group(s) to match the actions assertions in \
                 this manifest, got {}",
                positions.len(),
                action_groups.len()
            )));
        }

        // Decode and re-encode everything before mutating...
        let mut rewritten: Vec<(usize, Option<serde_json::Value>)> =
            Vec::with_capacity(positions.len());
        for (pos, group) in positions.into_iter().zip(action_groups) {
            let value = serde_json::to_value(&self.builder.definition.assertions[pos].data)
                .map_err(WasmError::other)?;
            let mut actions: Actions = serde_json::from_value(value).map_err(WasmError::other)?;

            if group.is_empty() {
                rewritten.push((pos, None));
                continue;
            }
            actions.actions = group;
            let encoded = serde_json::to_value(&actions).map_err(WasmError::other)?;
            rewritten.push((pos, Some(encoded)));
        }

        // Mutate in place.
        let mut emptied: Vec<usize> = Vec::new();
        for (pos, value) in rewritten {
            match value {
                Some(value) => {
                    let data = serde_json::from_value(value).map_err(WasmError::other)?;
                    self.builder.definition.assertions[pos].data = data;
                }
                None => emptied.push(pos),
            }
        }
        // Remove emptied assertions from the back so earlier indices stay valid.
        for pos in emptied.into_iter().rev() {
            self.builder.definition.assertions.remove(pos);
        }

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
    pub fn set_thumbnail_from_blob(&mut self, format: &str, blob: &Blob) -> Result<(), JsString> {
        let mut stream = BlobStream::new(blob).map_err(WasmError::other)?;
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
    pub fn add_ingredient(&mut self, json: &str) -> Result<(), JsString> {
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
    pub async fn add_ingredient_from_blob(
        &mut self,
        json: &str,
        format: &str,
        blob: &Blob,
    ) -> Result<(), JsString> {
        let mut stream = BlobStream::new(blob).map_err(WasmError::other)?;
        self.builder
            .add_ingredient_from_stream_async(json, format, &mut stream)
            .await
            .map_err(WasmError::from)?;

        Ok(())
    }

    /// Add a [`Blob`] to the manifest as a resource. The ID must match an identifier in the manifest.
    #[wasm_bindgen(js_name = addResourceFromBlob)]
    pub fn add_resource_from_blob(&mut self, id: &str, blob: &Blob) -> Result<(), JsString> {
        let mut stream = BlobStream::new(blob).map_err(WasmError::other)?;
        self.builder
            .add_resource(id, &mut stream)
            .map_err(WasmError::from)?;

        Ok(())
    }

    /// Get the current manifest definition.
    #[wasm_bindgen(js_name = getDefinition)]
    pub fn get_definition(&self) -> Result<JsString, JsString> {
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
    pub fn to_archive(&mut self) -> Result<Uint8Array, JsString> {
        let data = Vec::new();
        let mut stream = Cursor::new(data);

        self.builder
            .to_archive(&mut stream)
            .map_err(WasmError::from)?;

        Ok(cursor_to_u8array(stream)?)
    }

    /// Sign an asset using the provided SignerDefinition, format, and source Blob.
    #[wasm_bindgen]
    pub async fn sign(
        &mut self,
        signer_definition: &SignerDefinition,
        format: &str,
        source: &Blob,
    ) -> Result<Vec<u8>, JsString> {
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
    ) -> Result<JsValue, JsString> {
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
    ) -> Result<Vec<u8>, JsString> {
        let signer = WasmSigner::from_definition(signer_definition)?;
        let mut stream = BlobStream::new(source).map_err(WasmError::other)?;

        let mut cursor = Cursor::new(dest);

        let manifest = self
            .builder
            .sign_async(&signer, format, &mut stream, &mut cursor)
            .await
            .map_err(WasmError::from)?;

        Ok(manifest)
    }
}
