// Copyright 2026 Adobe
// All Rights Reserved.
//
// NOTICE: Adobe permits you to use, modify, and distribute this file in
// accordance with the terms of the Adobe license agreement accompanying
// it.

use std::sync::Arc;

use c2pa::Context;
use js_sys::JsString;
use wasm_bindgen::prelude::*;

use crate::error::WasmError;

pub(crate) fn context_from_json(context_json: Option<String>) -> Result<Arc<Context>, JsString> {
    let context = match context_json.as_deref() {
        Some(json) => Context::new()
            .with_settings(json)
            .map_err(WasmError::from)?,
        None => Context::new(),
    };
    #[allow(clippy::arc_with_non_send_sync)]
    let context = Arc::new(context);

    Ok(context)
}

/// Owns resolved settings for reuse within a WASM instance.
/// Freeing the handle releases its ownership, not that of existing Readers or Builders.
#[wasm_bindgen]
pub struct WasmContext {
    pub(crate) context: Arc<Context>,
}

#[wasm_bindgen]
impl WasmContext {
    /// Parses settings once. Omit the JSON argument to use default settings.
    #[wasm_bindgen(constructor)]
    pub fn new(context_json: Option<String>) -> Result<WasmContext, JsString> {
        Ok(WasmContext {
            context: context_from_json(context_json)?,
        })
    }
}

#[cfg(test)]
mod tests {
    use std::{io::Cursor, sync::Arc};

    use wasm_bindgen_test::wasm_bindgen_test;

    use super::*;
    use crate::{wasm_builder::WasmBuilder, wasm_reader::WasmReader};

    #[wasm_bindgen_test]
    fn handles_release_ownership_without_retaining_settings_or_global_state() {
        let context = WasmContext::new(None).unwrap();
        let weak = Arc::downgrade(&context.context);
        let first = WasmBuilder::from_json_with_context(r#"{"title":"first"}"#, &context).unwrap();
        let second =
            WasmBuilder::from_json_with_context(r#"{"title":"second"}"#, &context).unwrap();
        let first_definition = js_sys::JSON::stringify(&first.get_definition().unwrap()).unwrap();
        let second_definition = js_sys::JSON::stringify(&second.get_definition().unwrap()).unwrap();
        assert_ne!(first_definition, second_definition);
        drop(context);
        assert!(weak.upgrade().is_some());
        assert_eq!(
            js_sys::JSON::stringify(&first.get_definition().unwrap()).unwrap(),
            first_definition
        );
        drop(first);
        assert!(weak.upgrade().is_some());
        drop(second);
        assert!(weak.upgrade().is_none());
    }

    #[wasm_bindgen_test]
    async fn pending_and_live_readers_own_contexts_and_errors_release_them() {
        let context =
            WasmContext::new(Some(r#"{"verify":{"verify_trust":false}}"#.into())).unwrap();
        let weak = Arc::downgrade(&context.context);
        let future = WasmReader::from_stream(
            "image/jpeg",
            Cursor::new(include_bytes!("../tests/fixtures/C.jpg")),
            Arc::clone(&context.context),
        );
        drop(context);
        assert!(weak.upgrade().is_some());
        let reader = future.await.unwrap();
        assert!(reader.active_label().is_some());
        assert!(weak.upgrade().is_some());
        drop(reader);
        assert!(weak.upgrade().is_none());

        let context = WasmContext::new(None).unwrap();
        let weak = Arc::downgrade(&context.context);
        let future = WasmReader::from_stream(
            "image/jpeg",
            Cursor::new(b"not an image"),
            Arc::clone(&context.context),
        );
        drop(context);
        assert!(future.await.is_err());
        assert!(weak.upgrade().is_none());
    }

    #[wasm_bindgen_test]
    async fn json_entry_points_remain_compatible() {
        let settings =
            r#"{"builder":{"generate_c2pa_archive":true},"verify":{"verify_trust":false}}"#
                .to_owned();
        let bytes = include_bytes!("../tests/fixtures/C.jpg");
        let from_bytes =
            WasmReader::from_bytes("image/jpeg", bytes.to_vec(), Some(settings.clone()))
                .await
                .unwrap();
        assert!(from_bytes.active_label().is_some());
        let context = WasmContext::new(Some(settings.clone())).unwrap();
        let mut from_json =
            WasmBuilder::from_json(r#"{"title":"direct"}"#, Some(settings.clone())).unwrap();
        let archive = from_json.to_archive().unwrap();
        let parts = js_sys::Array::new();
        parts.push(&archive);
        let blob = web_sys::Blob::new_with_u8_array_sequence(&parts).unwrap();
        let from_archive = WasmBuilder::from_archive(&blob, Some(settings.clone())).unwrap();
        let from_handle = WasmBuilder::from_archive_with_context(&blob, &context).unwrap();
        assert_eq!(
            js_sys::JSON::stringify(&from_archive.get_definition().unwrap()).unwrap(),
            js_sys::JSON::stringify(&from_handle.get_definition().unwrap()).unwrap()
        );
        assert!(WasmBuilder::new(Some(settings)).is_ok());
        assert!(WasmContext::new(Some("invalid JSON".into())).is_err());
        assert!(WasmBuilder::new(Some("invalid JSON".into())).is_err());
        assert!(WasmBuilder::from_json("invalid JSON", None).is_err());
    }
}
