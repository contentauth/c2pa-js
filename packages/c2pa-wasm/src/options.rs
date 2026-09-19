// Copyright 2026 Adobe
// All Rights Reserved.
//
// NOTICE: Adobe permits you to use, modify, and distribute this file in
// accordance with the terms of the Adobe license agreement accompanying
// it.

use c2pa::{Context, ProgressPhase};
use js_sys::{Function as JsFunction, Reflect};
use wasm_bindgen::{prelude::*, JsCast};

use crate::error::WasmError;

/// Builds a `Context` from the optional settings JSON the plain entry points accept.
pub(crate) fn context_from_json(context_json: Option<String>) -> Result<Context, WasmError> {
    match context_json {
        Some(json) => Ok(Context::new().with_settings(json.as_str())?),
        None => Ok(Context::new()),
    }
}


/// Maps a `ProgressPhase` to the camelCase name JS callers receive.
///
/// `ProgressPhase` is non-exhaustive, so a future c2pa-rs release can add a variant
/// this build cannot name; those arrive as `"unknown"` rather than breaking the build
/// or being dropped.
fn phase_name(phase: ProgressPhase) -> &'static str {
    match phase {
        ProgressPhase::Reading => "reading",
        ProgressPhase::VerifyingManifest => "verifyingManifest",
        ProgressPhase::VerifyingSignature => "verifyingSignature",
        ProgressPhase::VerifyingIngredient => "verifyingIngredient",
        ProgressPhase::VerifyingAssetHash => "verifyingAssetHash",
        ProgressPhase::AddingIngredient => "addingIngredient",
        ProgressPhase::Thumbnail => "thumbnail",
        ProgressPhase::Hashing => "hashing",
        ProgressPhase::Signing => "signing",
        ProgressPhase::Embedding => "embedding",
        ProgressPhase::FetchingRemoteManifest => "fetchingRemoteManifest",
        ProgressPhase::Writing => "writing",
        ProgressPhase::FetchingOCSP => "fetchingOcsp",
        ProgressPhase::FetchingTimestamp => "fetchingTimestamp",
        _ => "unknown",
    }
}

/// Per-operation options for the `*WithOptions` entry points.
///
/// A JS object rather than positional parameters, so a later capability is added as
/// another optional field and existing callers keep working unchanged.
///
/// The context is **not** part of this object: every `*WithOptions` entry point takes a
/// mandatory `context_json` parameter beside it. Options configure an operation that a
/// `Context` already defines, so a signature able to carry options without one would
/// describe a state that cannot exist.
#[derive(Default)]
pub(crate) struct OperationOptions {
    /// Called as `(phase: string, step: number, total: number)`.
    pub progress: Option<JsFunction>,
}

impl OperationOptions {
    /// Reads options off a JS value. A nullish value yields the defaults, so passing
    /// nothing is the same as passing an object with no fields set.
    pub(crate) fn from_js(value: &JsValue) -> Self {
        if value.is_undefined() || value.is_null() {
            return Self::default();
        }

        Self {
            progress: Reflect::get(value, &JsValue::from_str("progress"))
                .ok()
                .and_then(|v| v.dyn_into::<JsFunction>().ok()),
        }
    }

    /// Builds the `Context` for an operation from its mandatory settings and these options.
    ///
    /// The callback's return value is how cancellation reaches c2pa-rs: returning `false`
    /// makes the next checkpoint fail with `Error::OperationCancelled`. Anything that is
    /// not an explicit `false` continues, so a callback that throws — or returns a
    /// non-boolean — cannot turn a valid asset into a cancelled read. That matters
    /// because the same callback carries ordinary progress reports, and a broken
    /// progress handler must not look like a cancellation request.
    pub(crate) fn build_context(self, context_json: &str) -> Result<Context, WasmError> {
        let mut context = Context::new().with_settings(context_json)?;

        if let Some(callback) = self.progress {
            context = context.with_progress_callback(move |phase, step, total| {
                callback
                    .call3(
                        &JsValue::NULL,
                        &JsValue::from_str(phase_name(phase)),
                        &JsValue::from(step),
                        &JsValue::from(total),
                    )
                    .ok()
                    .and_then(|value| value.as_bool())
                    .unwrap_or(true)
            });
        }

        Ok(context)
    }
}

#[cfg(test)]
mod tests {
    use wasm_bindgen_test::wasm_bindgen_test;

    use super::*;

    #[wasm_bindgen_test]
    fn every_phase_has_a_distinct_name() {
        let phases = [
            ProgressPhase::Reading,
            ProgressPhase::VerifyingManifest,
            ProgressPhase::VerifyingSignature,
            ProgressPhase::VerifyingIngredient,
            ProgressPhase::VerifyingAssetHash,
            ProgressPhase::AddingIngredient,
            ProgressPhase::Thumbnail,
            ProgressPhase::Hashing,
            ProgressPhase::Signing,
            ProgressPhase::Embedding,
            ProgressPhase::FetchingRemoteManifest,
            ProgressPhase::Writing,
            ProgressPhase::FetchingOCSP,
            ProgressPhase::FetchingTimestamp,
        ];

        let mut names: Vec<&str> = phases.iter().cloned().map(phase_name).collect();
        let total = names.len();
        names.sort_unstable();
        names.dedup();

        assert_eq!(
            names.len(),
            total,
            "each phase must map to its own name, or callers cannot tell them apart"
        );
        assert!(
            !names.contains(&"unknown"),
            "no known phase may fall through to the non-exhaustive catch-all"
        );
    }
}
