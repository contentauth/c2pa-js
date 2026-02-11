// Copyright 2025 Adobe
// All Rights Reserved.
//
// NOTICE: Adobe permits you to use, modify, and distribute this file in
// accordance with the terms of the Adobe license agreement accompanying
// it.

#![deny(missing_docs)]

//! A wrapper around c2pa-rs that provides the API "building blocks" for c2pa-web via `wasm-bindgen`.

use wasm_bindgen::prelude::*;

mod error;

/// Contains functions to create types usable by c2pa-rs from JS types.
pub mod stream;

/// Exposes a reader API to JS via wasm-bindgen.
pub mod wasm_reader;

/// Exposes a builder API to JS via wasm-bindgen.
pub mod wasm_builder;

/// Exposes an ingredient API to JS via wasm-bindgen.
pub mod wasm_ingredient;

/// Exposes a JS Callback signer API to JS via wasm-bindgen.
pub mod wasm_signer;

/// Provides a JS interface for loading c2pa-rs settings.
pub mod settings;

/// Internal utility functions
pub(crate) mod utils;

/// Called when the WASM binary is initialized.
#[wasm_bindgen(start)]
pub fn run() {
    std::panic::set_hook(Box::new(console_error_panic_hook::hook));
}
