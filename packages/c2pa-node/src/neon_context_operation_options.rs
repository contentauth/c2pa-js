// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License,
// Version 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
// or the MIT license (http://opensource.org/licenses/MIT),
// at your option.

// Unless required by applicable law or agreed to in writing,
// this software is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR REPRESENTATIONS OF ANY KIND, either express or
// implied. See the LICENSE-MIT and LICENSE-APACHE files for the
// specific language governing permissions and limitations under
// each license.

use std::sync::Arc;

use c2pa::{Context, ProgressPhase};
use neon::context::Context as NeonContext;
use neon::prelude::*;

/// Whether `total` means "indeterminate", which reaches JS as `null`.
///
/// c2pa-rs spells indeterminate as `0`; `ProgressReportEvent.total` spells it `null`.
fn is_indeterminate(total: u32) -> bool {
    total == 0
}

/// Maps a `ProgressPhase` to the camelCase name JS callers receive. `ProgressPhase` is
/// non-exhaustive, so an unrecognized variant falls through to `"unknown"`.
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

/// Per-operation options, read from the object the JS layer passes alongside settings.
#[derive(Default)]
pub struct OperationOptions {
    /// Called as `(phase: string, step: number, total: number | null)`.
    progress: Option<Arc<Root<JsFunction>>>,
}

impl OperationOptions {
    /// Reads the options out of a JS argument, ignoring anything it does not recognize.
    /// A missing, null or undefined argument yields the default.
    pub fn from_js(cx: &mut FunctionContext, arg_index: usize) -> NeonResult<Self> {
        let Some(value) = cx.argument_opt(arg_index) else {
            return Ok(Self::default());
        };
        if value.is_a::<JsNull, _>(cx) || value.is_a::<JsUndefined, _>(cx) {
            return Ok(Self::default());
        }
        let Ok(options) = value.downcast::<JsObject, _>(cx) else {
            return Ok(Self::default());
        };

        let progress = match options.get_opt::<JsFunction, _, _>(cx, "progress")? {
            Some(callback) => Some(Arc::new(callback.root(cx))),
            None => None,
        };

        Ok(Self { progress })
    }
}

/// A live operation's `Context`, handed to JS so an `AbortSignal` can cancel it.
///
/// This is the node counterpart of the `shared_ptr<IContextProvider>` the C++ binding keeps
/// in `Builder::context_ref`: `Reader`/`Builder` clone the same `Arc`, so cancelling here
/// cancels the operation those are running.
pub struct OperationHandle {
    context: Arc<Context>,
}

impl Finalize for OperationHandle {}

impl OperationHandle {
    pub fn new(context: Arc<Context>) -> Self {
        Self { context }
    }

    /// Requests cancellation. The engine observes it at its next progress checkpoint, so an
    /// operation that finishes before reaching one completes normally.
    pub fn cancel(mut cx: FunctionContext) -> JsResult<JsUndefined> {
        let this = cx.this::<JsBox<Self>>()?;
        this.context.cancel();
        Ok(cx.undefined())
    }
}

/// Attaches `options`' progress callback to `context` and shares it, so an
/// [`OperationHandle`] built from the returned `Arc` cancels the same operation this runs.
///
/// The callback always returns `true`: cancellation is the `Context`'s own flag, which
/// `check_progress` reads right after. So a signal with no callback still cancels, and a
/// throwing handler cannot cancel a valid operation.
pub fn install(context: Context, options: OperationOptions, channel: Channel) -> Arc<Context> {
    let Some(callback) = options.progress else {
        return context.into_shared();
    };

    context
        .with_progress_callback(move |phase, step, total| {
            let callback = Arc::clone(&callback);
            // Fire-and-forget: the engine runs on a tokio worker and must not wait on the JS
            // thread. Dropping the join handle detaches the delivery; an event that arrives
            // after the operation ended is dropped by neon.
            let _ = channel.try_send(move |mut cx| {
                let this = cx.undefined();
                let phase = cx.string(phase_name(phase));
                let step = cx.number(step);
                let total: Handle<JsValue> = if is_indeterminate(total) {
                    cx.null().upcast()
                } else {
                    cx.number(total).upcast()
                };

                let callback = callback.to_inner(&mut cx);
                let _ = callback.call(&mut cx, this, [phase.upcast(), step.upcast(), total]);
                Ok(())
            });

            true
        })
        .into_shared()
}

#[cfg(test)]
mod tests {
    use super::*;

    const ALL_PHASES: [ProgressPhase; 14] = [
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

    const TYPESCRIPT_UNION: [&str; 15] = [
        "reading",
        "verifyingManifest",
        "verifyingSignature",
        "verifyingIngredient",
        "verifyingAssetHash",
        "addingIngredient",
        "thumbnail",
        "hashing",
        "signing",
        "embedding",
        "fetchingRemoteManifest",
        "writing",
        "fetchingOcsp",
        "fetchingTimestamp",
        "unknown",
    ];

    #[test]
    fn phase_names_match_the_typescript_union() {
        for phase in ALL_PHASES {
            let name = phase_name(phase);
            assert!(
                TYPESCRIPT_UNION.contains(&name),
                "{name:?} is not in the TypeScript ProgressPhase union"
            );
        }

        let mapped: Vec<&str> = ALL_PHASES.iter().cloned().map(phase_name).collect();
        for declared in TYPESCRIPT_UNION {
            assert!(
                declared == "unknown" || mapped.contains(&declared),
                "the TypeScript union declares {declared:?}, which no phase maps to"
            );
        }
    }

    #[test]
    fn indeterminate_totals_are_distinguished_from_counts() {
        // c2pa-rs currently emits `0` only in its own tests, so nothing in a real read or
        // sign exercises this branch; the mapping exists for the documented contract.
        assert!(is_indeterminate(0));
        assert!(!is_indeterminate(1));
        assert!(!is_indeterminate(42));
    }

    #[test]
    fn every_phase_has_a_distinct_name() {
        let phases = ALL_PHASES;

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
