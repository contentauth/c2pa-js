// Copyright 2025 Adobe
// All Rights Reserved.
//
// NOTICE: Adobe permits you to use, modify, and distribute this file in
// accordance with the terms of the Adobe license agreement accompanying
// it.

use js_sys::JsString;
use wasm_bindgen::prelude::*;

use crate::error::WasmError;

/**
 * NOTE: we can only return Err(JsString) or Err(JsValue) as error types here, because for some as-of-yet unknown
 * reason, wasm-bindgen appears to mishandle JsErrors when created in a Firefox web worker.
 *
 * See: https://github.com/wasm-bindgen/wasm-bindgen/issues/4961
 */

/// Accepts a JSON-serialized string to be loaded as c2pa-rs settings.
#[wasm_bindgen(js_name = loadSettings)]
pub fn load_settings(settings: &str) -> Result<(), JsString> {
    c2pa::settings::Settings::from_string(settings, "json").map_err(WasmError::other)?;

    Ok(())
}
