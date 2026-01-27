// Copyright 2025 Adobe
// All Rights Reserved.
//
// NOTICE: Adobe permits you to use, modify, and distribute this file in
// accordance with the terms of the Adobe license agreement accompanying
// it.

use crate::error::WasmError;
use wasm_bindgen::prelude::*;

/// Accepts a JSON-serialized string to be loaded as c2pa-rs settings.
#[wasm_bindgen(js_name = loadSettings)]
pub fn load_settings(settings: &str) -> Result<(), js_sys::Error> {
    c2pa::settings::Settings::from_string(settings, "json").map_err(WasmError::other)?;

    Ok(())
}
