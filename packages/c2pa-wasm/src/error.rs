// Copyright 2025 Adobe
// All Rights Reserved.
//
// NOTICE: Adobe permits you to use, modify, and distribute this file in
// accordance with the terms of the Adobe license agreement accompanying
// it.

use std::error::Error;

use js_sys::Error as JsError;

#[derive(thiserror::Error, Debug)]
pub enum WasmError {
    #[error(transparent)]
    C2pa(#[from] c2pa::Error),

    #[error(transparent)]
    Serde(#[from] serde_wasm_bindgen::Error),

    #[error(transparent)]
    Other(Box<dyn Error>),
}

impl WasmError {
    pub(crate) fn other(e: impl Error + 'static) -> Self {
        WasmError::Other(Box::new(e))
    }
}

impl From<WasmError> for JsError {
    fn from(value: WasmError) -> Self {
        JsError::new(&format!("{:?}", value))
    }
}
