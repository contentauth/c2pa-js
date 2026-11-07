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

use crate::error::WasmError;

const MAX_CACHED_CONTEXTS: usize = 16;

#[derive(Default)]
struct ContextCache {
    contexts: HashMap<Option<String>, Arc<Context>>,
    insertion_order: VecDeque<Option<String>>,
}

thread_local! {
    static CONTEXT_CACHE: RefCell<ContextCache> = RefCell::new(ContextCache::default());
}

pub(crate) fn context_from_json(context_json: Option<String>) -> Result<Arc<Context>, JsString> {
    if let Some(context) =
        CONTEXT_CACHE.with(|cache| cache.borrow().contexts.get(&context_json).cloned())
    {
        return Ok(context);
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
        if cache.contexts.len() == MAX_CACHED_CONTEXTS {
            let oldest_key = cache
                .insertion_order
                .pop_front()
                .expect("context cache order matches its entries");
            cache.contexts.remove(&oldest_key);
        }
        cache.insertion_order.push_back(context_json.clone());
        cache.contexts.insert(context_json, Arc::clone(&context));
    });

    Ok(context)
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use wasm_bindgen_test::wasm_bindgen_test;

    use super::context_from_json;

    #[wasm_bindgen_test]
    fn caches_contexts_by_serialized_settings() {
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
}
