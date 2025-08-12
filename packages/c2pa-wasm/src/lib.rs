use wasm_bindgen::prelude::*;

mod error;

pub mod stream;
pub mod wasm_reader;

#[wasm_bindgen(start)]
pub fn run() {
    std::panic::set_hook(Box::new(console_error_panic_hook::hook));
}
