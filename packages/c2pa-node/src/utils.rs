// Copyright 2025 Adobe. All rights reserved.
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

use c2pa::Context;
use neon::context::Context as NeonContext;
use neon::prelude::*;

use crate::error::{Error, Result};

/// Native Context shared by Readers/Builders for the same resolved JS Context.
/// Sharing includes c2pa-rs's one-way cancellation flag and progress callback,
/// not just settings. Node does not expose these operation-control APIs today.
/// Before adding per-instance controls, revisit this ownership: cancellation
/// would affect all current and future users of the cached Context, and
/// concurrent operations would report progress through the same callback.
pub struct NeonContextHandle {
    context: Arc<Context>,
}

impl Finalize for NeonContextHandle {}

fn parse_context(settings: &str, error_prefix: &str) -> Result<Arc<Context>> {
    let context = Context::new()
        .with_settings(settings)
        .map_err(|e| Error::Signing(format!("{error_prefix}: Invalid settings: {e}")))?
        .into_shared();
    Ok(context)
}

pub fn from_settings(mut cx: FunctionContext) -> JsResult<JsBox<NeonContextHandle>> {
    let settings = cx.argument::<JsString>(0)?.value(&mut cx);
    let error_prefix = cx.argument::<JsString>(1)?.value(&mut cx);
    match parse_context(&settings, &error_prefix) {
        Ok(context) => Ok(cx.boxed(NeonContextHandle { context })),
        Err(error) => cx.throw_error(error.to_string()),
    }
}

#[allow(dead_code)]
// Used in debugging
pub fn log_message<'a, C: neon::context::Context<'a>>(cx: &mut C, message: &str) {
    let global = cx.global_object();
    let console: Handle<JsObject> = global.get(cx, "console").unwrap();
    let log: Handle<JsFunction> = console
        .get::<JsFunction, _, _>(cx, "log")
        .unwrap()
        .downcast_or_throw(cx)
        .unwrap();
    let msg = cx.string(message);
    let this = cx.undefined();
    let args: Vec<Handle<JsValue>> = vec![msg.upcast()];
    log.call(cx, this, args).unwrap();
}

/// Parse optional settings string from JS argument and create a Context.
/// Returns Ok(Some(Arc<Context>)) if settings are provided, Ok(None) if not provided,
/// or Err if settings are invalid.
pub fn parse_settings(
    cx: &mut FunctionContext,
    arg_index: usize,
    error_prefix: &str,
) -> Result<Option<Arc<Context>>> {
    let settings_opt = cx.argument_opt(arg_index);

    match settings_opt {
        Some(js_value) => {
            if js_value.is_a::<JsBox<NeonContextHandle>, _>(cx) {
                let context_handle = js_value
                    .downcast::<JsBox<NeonContextHandle>, _>(cx)
                    .map_err(|_| {
                        Error::Signing(format!("{error_prefix}: Invalid native Context handle"))
                    })?;
                Ok(Some(Arc::clone(&context_handle.context)))
            } else if js_value.is_a::<JsString, _>(cx) {
                let settings_string = js_value
                    .downcast::<JsString, _>(cx)
                    .map_err(|_| {
                        Error::Signing(format!("{error_prefix}: Expected settings string"))
                    })?
                    .value(cx);

                let context = parse_context(settings_string.as_str(), error_prefix)?;
                Ok(Some(context))
            } else if js_value.is_a::<JsNull, _>(cx) || js_value.is_a::<JsUndefined, _>(cx) {
                Ok(None)
            } else {
                Err(Error::Signing(format!(
                    "{error_prefix}: Settings must be a string, null, or undefined",
                )))
            }
        }

        None => Ok(None),
    }
}
