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

use c2pa::Context;
use neon::prelude::*;

use crate::error::{Error, Result};

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
/// Returns Ok(Some(Context)) if settings are provided, Ok(None) if not provided,
/// or Err if settings are invalid.
pub fn parse_settings(
    cx: &mut FunctionContext,
    arg_index: usize,
    error_prefix: &str,
) -> Result<Option<Context>> {
    let settings_opt = cx.argument_opt(arg_index);

    match settings_opt {
        Some(js_value) => {
            if js_value.is_a::<JsString, _>(cx) {
                let settings_string = js_value
                    .downcast::<JsString, _>(cx).map_err(|_| Error::Signing(format!("{}: Expected settings string", error_prefix)))?
                    .value(cx);

                // Create context with settings
                let context = Context::new()
                    .with_settings(settings_string.as_str())
                    .map_err(|e| Error::Signing(format!("{}: Invalid settings: {}", error_prefix, e)))?;

                Ok(Some(context))
            } else if js_value.is_a::<JsNull, _>(cx) || js_value.is_a::<JsUndefined, _>(cx) {
                Ok(None)
            } else {
                Err(Error::Signing(format!(
                    "{}: Settings must be a string, null, or undefined",
                    error_prefix
                )))
            }
        }
        None => Ok(None),
    }
}

