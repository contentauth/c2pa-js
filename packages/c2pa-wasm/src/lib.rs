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

/// HTTP Range-request asset resolver: reads only the bytes c2pa-rs asks for.
pub(crate) mod range;

/// Exposes a reader API to JS via wasm-bindgen.
pub mod wasm_reader;

/// Exposes a builder API to JS via wasm-bindgen.
pub mod wasm_builder;

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

/// Returns the size of the WebAssembly linear memory in bytes.
///
/// Linear memory never shrinks, so this is the session peak rather than a live
/// figure. Read it before and after a single read in a fresh page to size that read.
#[wasm_bindgen(js_name = wasmMemoryBytes)]
pub fn wasm_memory_bytes() -> f64 {
    wasm_bindgen::memory()
        .dyn_into::<js_sys::WebAssembly::Memory>()
        .map(|m| m.buffer().unchecked_into::<js_sys::ArrayBuffer>().byte_length() as f64)
        .unwrap_or(0.0)
}
