// Copyright 2025 Adobe
// All Rights Reserved.
//
// NOTICE: Adobe permits you to use, modify, and distribute this file in
// accordance with the terms of the Adobe license agreement accompanying
// it.

use c2pa::Ingredient;
use js_sys::{Error as JsError, JsString, Uint8Array};
use wasm_bindgen::prelude::*;

use crate::error::WasmError;

/// Wraps a `c2pa::Ingredient`.
#[wasm_bindgen]
pub struct WasmIngredient {
    ingredient: Ingredient,
}

#[wasm_bindgen]
impl WasmIngredient {
    /// Attempts to create a new `WasmIngredient` from an asset's format and raw bytes.
    #[wasm_bindgen(js_name = fromMemory)]
    pub fn from_memory(format: &str, buffer: &Uint8Array) -> Result<WasmIngredient, JsError> {
        let bytes = buffer.to_vec();
        let ingredient = Ingredient::from_memory(format, &bytes).map_err(WasmError::from)?;

        Ok(WasmIngredient { ingredient })
    }

    /// Attempts to create a new `WasmIngredient` from ingredient JSON and optional
    /// manifest store bytes.
    ///
    /// This supports an "ingredient rehydration" workflow where the original ingredient asset
    /// bytes are not available.
    #[wasm_bindgen(js_name = fromJsonAndManifestStore)]
    pub fn from_json_and_manifest_store(
        ingredient_json: &str,
        manifest_data: Option<Uint8Array>,
    ) -> Result<WasmIngredient, JsError> {
        let mut ingredient = Ingredient::from_json(ingredient_json).map_err(WasmError::from)?;

        if let Some(manifest_data) = manifest_data {
            let data_vec = manifest_data.to_vec();
            if !data_vec.is_empty() {
                ingredient
                    .set_manifest_data(data_vec)
                    .map_err(WasmError::from)?;
            }
        }

        Ok(WasmIngredient { ingredient })
    }

    /// Returns a serde JSON representation of this ingredient.
    #[wasm_bindgen(js_name = toJson)]
    pub fn to_json(&self) -> Result<JsString, JsError> {
        let json = serde_json::to_string(&self.ingredient).map_err(WasmError::from)?;
        Ok(JsString::from(json))
    }

    /// Returns the embedded manifest store bytes (JUMBF / application/c2pa) if present.
    ///
    /// This mirrors `Ingredient::manifest_data()`.
    #[wasm_bindgen(js_name = manifestStoreBytes)]
    pub fn manifest_store_bytes(&self) -> Result<JsValue, JsError> {
        match self.ingredient.manifest_data() {
            Some(cow) => {
                let bytes = cow.into_owned();
                Ok(Uint8Array::from(bytes.as_slice()).into())
            }
            None => Ok(JsValue::NULL),
        }
    }
}
