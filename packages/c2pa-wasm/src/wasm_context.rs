// Copyright 2026 Adobe
// All Rights Reserved.
//
// NOTICE: Adobe permits you to use, modify, and distribute this file in
// accordance with the terms of the Adobe license agreement accompanying
// it.

use std::{
    cell::RefCell,
    collections::{HashMap, VecDeque},
    sync::Arc,
};

use c2pa::Context;
use js_sys::JsString;
use wasm_bindgen::prelude::*;

use crate::error::WasmError;

const MAX_CACHED_CONTEXTS: usize = 16;

#[derive(Default)]
struct ContextCache {
    contexts: HashMap<Option<String>, CachedContext>,
    insertion_order: VecDeque<Option<String>>,
    next_id: u32,
}

struct CachedContext {
    id: u32,
    context: Arc<Context>,
}

thread_local! {
    static CONTEXT_CACHE: RefCell<ContextCache> = RefCell::new(ContextCache::default());
}

pub(crate) fn context_from_json(context_json: Option<String>) -> Result<Arc<Context>, JsString> {
    context_from_id(register_context(context_json)?)
}

/// Registers settings once and returns an opaque ID local to this WASM instance.
/// Matching JSON reuses its ID. At most 16 entries are retained in insertion order.
/// Eviction invalidates the ID, but not Readers or Builders already using the context.
#[wasm_bindgen(js_name = registerContext)]
pub fn register_context(context_json: Option<String>) -> Result<u32, JsString> {
    if let Some(id) = CONTEXT_CACHE.with(|cache| {
        cache
            .borrow()
            .contexts
            .get(&context_json)
            .map(|entry| entry.id)
    }) {
        return Ok(id);
    }

    let context = match context_json.as_deref() {
        Some(json) => Context::new()
            .with_settings(json)
            .map_err(WasmError::from)?,
        None => Context::new(),
    };
    #[allow(clippy::arc_with_non_send_sync)]
    let context = Arc::new(context);

    CONTEXT_CACHE.with(|cache| {
        let mut cache = cache.borrow_mut();
        let id = cache.next_id;
        cache.next_id = id
            .checked_add(1)
            .ok_or_else(|| JsString::from("WASM context ID space exhausted"))?;

        if cache.contexts.len() == MAX_CACHED_CONTEXTS {
            let oldest_key = cache
                .insertion_order
                .pop_front()
                .expect("context cache order matches its entries");
            cache.contexts.remove(&oldest_key);
        }

        cache.insertion_order.push_back(context_json.clone());
        cache
            .contexts
            .insert(context_json, CachedContext { id, context });

        Ok(id)
    })
}

pub(crate) fn context_from_id(id: u32) -> Result<Arc<Context>, JsString> {
    CONTEXT_CACHE
        .with(|cache| {
            cache
                .borrow()
                .contexts
                .values()
                .find(|entry| entry.id == id)
                .map(|entry| Arc::clone(&entry.context))
        })
        .ok_or_else(|| {
            JsString::from("WASM context settings have not been registered or were evicted")
        })
}

/// Releases cached contexts without invalidating live Readers or Builders.
/// Previously issued IDs remain invalid even after new registrations.
#[wasm_bindgen(js_name = clearContextCache)]
pub fn clear_context_cache() {
    CONTEXT_CACHE.with(|cache| {
        let mut cache = cache.borrow_mut();
        cache.contexts.clear();
        cache.insertion_order.clear();
    });
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use wasm_bindgen_test::wasm_bindgen_test;

    use super::*;
    use crate::{wasm_builder::WasmBuilder, wasm_reader::WasmReader};

    fn blob(bytes: &[u8]) -> web_sys::Blob {
        let parts = js_sys::Array::new();
        parts.push(&js_sys::Uint8Array::from(bytes));
        web_sys::Blob::new_with_u8_array_sequence(&parts).unwrap()
    }

    #[wasm_bindgen_test]
    fn caches_contexts_by_serialized_settings() {
        clear_context_cache();
        let settings = r#"{"verify":{"verify_trust":false}}"#.to_owned();
        let same_settings = r#"{"verify":{"verify_trust":false}}"#.to_owned();
        let different_settings = r#"{"verify":{"verify_trust":true}}"#.to_owned();

        let first = context_from_json(Some(settings)).unwrap();
        let repeated = context_from_json(Some(same_settings)).unwrap();
        let different = context_from_json(Some(different_settings)).unwrap();
        let default = context_from_json(None).unwrap();
        let repeated_default = context_from_json(None).unwrap();

        assert!(Arc::ptr_eq(&first, &repeated));
        assert!(!Arc::ptr_eq(&first, &different));
        assert!(Arc::ptr_eq(&default, &repeated_default));
    }

    #[wasm_bindgen_test]
    fn evicts_old_generations_without_invalidating_live_contexts() {
        clear_context_cache();
        let first_settings = r#"{"verify":{"verify_trust":false}}"#.to_owned();
        let first = context_from_json(Some(first_settings.clone())).unwrap();

        for generation in 1..=16 {
            let settings = format!(
                r#"{{"verify":{{"verify_trust":false}}}}{}"#,
                " ".repeat(generation)
            );
            context_from_json(Some(settings)).unwrap();
        }

        let refreshed_first = context_from_json(Some(first_settings)).unwrap();
        assert!(!Arc::ptr_eq(&first, &refreshed_first));
        assert_eq!(Arc::strong_count(&first), 1);
    }

    #[wasm_bindgen_test]
    fn registered_ids_are_reused_bounded_and_never_recycled() {
        clear_context_cache();
        let settings = r#"{"verify":{"verify_trust":false}}"#.to_owned();
        let id = register_context(Some(settings.clone())).unwrap();
        let live = context_from_id(id).unwrap();
        assert_eq!(register_context(Some(settings.clone())).unwrap(), id);
        assert!(Arc::ptr_eq(
            &live,
            &context_from_json(Some(settings.clone())).unwrap()
        ));
        assert!(register_context(Some("not JSON".to_owned())).is_err());
        assert!(context_from_id(id).is_ok());

        for generation in 1..=MAX_CACHED_CONTEXTS {
            register_context(Some(format!("{settings}{}", " ".repeat(generation)))).unwrap();
        }

        assert_eq!(
            CONTEXT_CACHE.with(|cache| cache.borrow().contexts.len()),
            16
        );
        assert!(context_from_id(id).is_err());
        assert_eq!(Arc::strong_count(&live), 1);
        let new_id = register_context(Some(settings)).unwrap();
        assert_ne!(id, new_id);
        clear_context_cache();
        assert!(context_from_id(new_id).is_err());
        assert!(context_from_id(id).is_err());
        assert_ne!(register_context(None).unwrap(), new_id);
    }

    #[wasm_bindgen_test]
    async fn live_readers_and_builders_own_contexts_after_eviction_and_clear() {
        clear_context_cache();
        let settings =
            r#"{"builder":{"generate_c2pa_archive":true},"verify":{"verify_trust":false}}"#
                .to_owned();
        let id = register_context(Some(settings.clone())).unwrap();
        let context = context_from_id(id).unwrap();
        let asset = blob(include_bytes!("../tests/fixtures/C.jpg"));
        let reader = WasmReader::from_blob_with_context("image/jpeg", &asset, id)
            .await
            .unwrap();
        let first = WasmBuilder::from_json_with_context(r#"{"title":"first"}"#, id).unwrap();
        let second = WasmBuilder::from_json_with_context(r#"{"title":"second"}"#, id).unwrap();
        let first_definition = first.get_definition().unwrap();
        let second_definition = second.get_definition().unwrap();
        assert_ne!(
            js_sys::JSON::stringify(&first_definition).unwrap(),
            js_sys::JSON::stringify(&second_definition).unwrap()
        );
        assert!(Arc::strong_count(&context) >= 5);

        for generation in 1..=MAX_CACHED_CONTEXTS {
            register_context(Some(format!("{settings}{}", " ".repeat(generation)))).unwrap();
        }

        assert!(WasmBuilder::new_with_context(id).is_err());
        assert!(
            WasmReader::from_blob_with_context("image/jpeg", &asset, id)
                .await
                .is_err()
        );
        clear_context_cache();
        assert!(reader.active_label().is_some());
        assert_eq!(
            js_sys::JSON::stringify(&first.get_definition().unwrap()).unwrap(),
            js_sys::JSON::stringify(&first_definition).unwrap()
        );
        assert_eq!(
            js_sys::JSON::stringify(&second.get_definition().unwrap()).unwrap(),
            js_sys::JSON::stringify(&second_definition).unwrap()
        );
        drop(reader);
        drop(first);
        drop(second);
        assert_eq!(Arc::strong_count(&context), 1);
    }

    #[wasm_bindgen_test]
    async fn json_entry_points_remain_compatible_with_registered_contexts() {
        clear_context_cache();
        let settings =
            r#"{"builder":{"generate_c2pa_archive":true},"verify":{"verify_trust":false}}"#
                .to_owned();
        let id = register_context(Some(settings.clone())).unwrap();
        let bytes = include_bytes!("../tests/fixtures/C.jpg");
        let asset = blob(bytes);
        let from_blob = WasmReader::from_blob("image/jpeg", &asset, Some(settings.clone()))
            .await
            .unwrap();
        let from_bytes =
            WasmReader::from_bytes("image/jpeg", bytes.to_vec(), Some(settings.clone()))
                .await
                .unwrap();
        assert_eq!(from_blob.active_label(), from_bytes.active_label());
        let builder = WasmBuilder::new(Some(settings.clone())).unwrap();
        let mut from_json =
            WasmBuilder::from_json(r#"{"title":"direct"}"#, Some(settings.clone())).unwrap();
        let archive = blob(&from_json.to_archive().unwrap().to_vec());
        let from_archive = WasmBuilder::from_archive(&archive, Some(settings.clone())).unwrap();
        let from_archive_id = WasmBuilder::from_archive_with_context(&archive, id).unwrap();
        assert_eq!(
            js_sys::JSON::stringify(&from_archive.get_definition().unwrap()).unwrap(),
            js_sys::JSON::stringify(&from_archive_id.get_definition().unwrap()).unwrap()
        );
        assert!(builder.get_definition().is_ok());
        assert_eq!(register_context(Some(settings)).unwrap(), id);
        assert!(WasmBuilder::new(Some("invalid JSON".to_owned())).is_err());
        assert!(WasmBuilder::from_json("invalid JSON", None).is_err());
        assert!(WasmBuilder::from_json_with_context("{}", u32::MAX).is_err());
        assert!(WasmBuilder::from_archive_with_context(&archive, u32::MAX).is_err());
    }
}
