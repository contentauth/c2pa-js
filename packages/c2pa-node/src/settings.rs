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

use c2pa::settings::Settings;
use neon::prelude::*;
use std::sync::{OnceLock, RwLock};
use toml as toml_ser;

use crate::runtime::reload_runtime;

// Global JSON snapshot used to initialize each Tokio worker thread
static GLOBAL_SETTINGS_TOML: OnceLock<RwLock<Option<String>>> = OnceLock::new();

fn global_toml() -> &'static RwLock<Option<String>> {
    GLOBAL_SETTINGS_TOML.get_or_init(|| RwLock::new(None))
}

fn set_global_settings_toml(toml: Option<String>) {
    *global_toml().write().unwrap() = toml;
}

pub(crate) fn get_global_settings_toml() -> Option<String> {
    global_toml().read().unwrap().clone()
}

/// Parse a JSON string (argument 0) into c2pa-rs Settings and apply them globally.
/// Returns undefined; the JSON snapshot is stored globally for new worker threads.
pub fn load_settings(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let json_arg = cx.argument::<JsString>(0)?;
    let json_string = json_arg.value(&mut cx);

    // Apply settings globally using deprecated Settings::from_string with JSON format
    #[allow(deprecated)]
    match Settings::from_string(&json_string, "json") {
        Ok(_) => {
            // Settings are now applied globally, return the TOML representation
            let toml_string = Settings::to_toml()
                .or_else(|e| cx.throw_error(format!("Failed to get settings as TOML: {}", e)))?;
            // Save the JSON snapshot for new worker threads
            set_global_settings_toml(Some(toml_string));
            reload_runtime();
            Ok(cx.undefined())
        }
        Err(e) => cx.throw_error(format!("Failed to apply settings: {}", e)),
    }
}

/// Returns the JSON settings snapshot currently stored by the Node SDK.
/// This value represents the canonical settings source in this crate and
/// should match the thread-local SETTINGS used internally by the `c2pa`
/// crate on each worker thread (applied in `runtime.rs` using `on_thread_start`).
pub fn get_settings_json(mut cx: FunctionContext) -> JsResult<JsValue> {
    match get_global_settings_toml() {
        Some(toml_string) => {
            // Convert TOML -> JSON string for SDK consumption
            let toml_val: toml_ser::Value = match toml_ser::from_str(&toml_string) {
                Ok(v) => v,
                Err(e) => return cx.throw_error(format!("Failed to parse TOML: {}", e)),
            };
            let json = match serde_json::to_string(&toml_val) {
                Ok(s) => s,
                Err(e) => return cx.throw_error(format!("Failed to serialize JSON: {}", e)),
            };
            Ok(cx.string(json).upcast())
        }
        None => {
            let obj = cx.empty_object();
            Ok(obj.upcast())
        }
    }
}

/// Get the raw TOML snapshot of the current global settings. Used for debugging.
#[allow(dead_code)]
pub fn get_settings_toml(mut cx: FunctionContext) -> JsResult<JsValue> {
    match get_global_settings_toml() {
        Some(t) => Ok(cx.string(t).upcast()),
        None => Ok(cx.undefined().upcast()),
    }
}
