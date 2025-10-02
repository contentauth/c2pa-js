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

/// Parse a TOML string (argument 0) into c2pa-rs Settings and apply them globally.
/// Returns undefined; the TOML snapshot is stored globally for new worker threads.
pub fn load_settings_toml(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let toml_arg = cx.argument::<JsString>(0)?;
    let toml_string = toml_arg.value(&mut cx);

    // Apply settings globally using Settings::from_toml
    match Settings::from_toml(&toml_string) {
        Ok(_) => {
            // Settings are now applied globally, save the TOML representation
            let toml_string = Settings::to_toml()
                .or_else(|e| cx.throw_error(format!("Failed to get settings as TOML: {}", e)))?;
            // Save the TOML snapshot for new worker threads
            set_global_settings_toml(Some(toml_string));
            reload_runtime();
            Ok(cx.undefined())
        }
        Err(e) => cx.throw_error(format!("Failed to apply TOML settings: {}", e)),
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
            let toml_val: toml::Value = match toml::from_str(&toml_string) {
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

/// Load trust configuration into the main trust settings.
/// Takes a JSON string representing a TrustConfig object and applies it to the trust field.
pub fn load_trust_config(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let json_arg = cx.argument::<JsString>(0)?;
    let json_string = json_arg.value(&mut cx);

    // Parse the JSON to validate it's a valid TrustConfig
    let trust_config: serde_json::Value = match serde_json::from_str(&json_string) {
        Ok(v) => v,
        Err(e) => return cx.throw_error(format!("Invalid trust config JSON: {}", e)),
    };

    // Get current settings as TOML to preserve all existing settings
    let current_toml = get_global_settings_toml().unwrap_or_else(|| {
        // If no current settings, start with default settings
        Settings::to_toml().unwrap_or_default()
    });

    // Parse current settings to merge with new trust config
    let mut current_settings: serde_json::Value = match toml::from_str::<toml::Value>(&current_toml)
    {
        Ok(toml_val) => serde_json::to_value(toml_val)
            .unwrap_or_else(|_| serde_json::Value::Object(serde_json::Map::new())),
        Err(_) => serde_json::Value::Object(serde_json::Map::new()),
    };

    // Update only the trust section
    if let serde_json::Value::Object(ref mut map) = current_settings {
        map.insert("trust".to_string(), trust_config);
    }

    // Convert back to JSON string for Settings::from_string
    let settings_json = serde_json::to_string(&current_settings)
        .or_else(|e| cx.throw_error(format!("Failed to serialize settings: {}", e)))?;

    // Use the existing load_settings function with merged settings
    #[allow(deprecated)]
    match Settings::from_string(&settings_json, "json") {
        Ok(_) => {
            // Update global settings
            let full_toml = Settings::to_toml()
                .or_else(|e| cx.throw_error(format!("Failed to get settings as TOML: {}", e)))?;
            set_global_settings_toml(Some(full_toml));
            reload_runtime();
            Ok(cx.undefined())
        }
        Err(e) => cx.throw_error(format!("Failed to apply trust config: {}", e)),
    }
}

/// Load trust configuration into the CAWG trust settings.
/// Takes a JSON string representing a TrustConfig object and applies it to the cawg_trust field.
pub fn load_cawg_trust_config(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let json_arg = cx.argument::<JsString>(0)?;
    let json_string = json_arg.value(&mut cx);

    // Parse the JSON to validate it's a valid TrustConfig
    let trust_config: serde_json::Value = match serde_json::from_str(&json_string) {
        Ok(v) => v,
        Err(e) => return cx.throw_error(format!("Invalid trust config JSON: {}", e)),
    };

    // Get current settings as TOML to preserve all existing settings
    let current_toml = get_global_settings_toml().unwrap_or_else(|| {
        // If no current settings, start with default settings
        Settings::to_toml().unwrap_or_default()
    });

    // Parse current settings to merge with new trust config
    let mut current_settings: serde_json::Value = match toml::from_str::<toml::Value>(&current_toml)
    {
        Ok(toml_val) => serde_json::to_value(toml_val)
            .unwrap_or_else(|_| serde_json::Value::Object(serde_json::Map::new())),
        Err(_) => serde_json::Value::Object(serde_json::Map::new()),
    };

    // Update only the cawg_trust section
    if let serde_json::Value::Object(ref mut map) = current_settings {
        map.insert("cawg_trust".to_string(), trust_config);
    }

    // Convert back to JSON string for Settings::from_string
    let settings_json = serde_json::to_string(&current_settings)
        .or_else(|e| cx.throw_error(format!("Failed to serialize settings: {}", e)))?;

    // Use the existing load_settings function with merged settings
    #[allow(deprecated)]
    match Settings::from_string(&settings_json, "json") {
        Ok(_) => {
            // Update global settings
            let full_toml = Settings::to_toml()
                .or_else(|e| cx.throw_error(format!("Failed to get settings as TOML: {}", e)))?;
            set_global_settings_toml(Some(full_toml));
            reload_runtime();
            Ok(cx.undefined())
        }
        Err(e) => cx.throw_error(format!("Failed to apply CAWG trust config: {}", e)),
    }
}

/// Get the current trust configuration as JSON.
pub fn get_trust_config(mut cx: FunctionContext) -> JsResult<JsValue> {
    match get_global_settings_toml() {
        Some(toml_string) => {
            // Convert TOML -> JSON for processing
            let toml_val: toml::Value = match toml::from_str(&toml_string) {
                Ok(v) => v,
                Err(e) => return cx.throw_error(format!("Failed to parse TOML: {}", e)),
            };
            let settings: serde_json::Value = match serde_json::to_value(&toml_val) {
                Ok(v) => v,
                Err(e) => return cx.throw_error(format!("Failed to convert TOML to JSON: {}", e)),
            };

            // Extract trust section
            let default_trust_config = serde_json::json!({
                "verify_trust_list": true,
                "user_anchors": null,
                "trust_anchors": null,
                "trust_config": null,
                "allowed_list": null
            });
            let trust_section = settings.get("trust").unwrap_or(&default_trust_config);

            let json = match serde_json::to_string(trust_section) {
                Ok(s) => s,
                Err(e) => {
                    return cx.throw_error(format!("Failed to serialize trust config: {}", e))
                }
            };
            Ok(cx.string(json).upcast())
        }
        None => {
            // Return default trust config
            let default_trust = serde_json::json!({
                "verify_trust_list": true,
                "user_anchors": null,
                "trust_anchors": null,
                "trust_config": null,
                "allowed_list": null
            });
            Ok(cx.string(default_trust.to_string()).upcast())
        }
    }
}

/// Get the current CAWG trust configuration as JSON.
pub fn get_cawg_trust_config(mut cx: FunctionContext) -> JsResult<JsValue> {
    match get_global_settings_toml() {
        Some(toml_string) => {
            // Convert TOML -> JSON for processing
            let toml_val: toml::Value = match toml::from_str(&toml_string) {
                Ok(v) => v,
                Err(e) => return cx.throw_error(format!("Failed to parse TOML: {}", e)),
            };
            let settings: serde_json::Value = match serde_json::to_value(&toml_val) {
                Ok(v) => v,
                Err(e) => return cx.throw_error(format!("Failed to convert TOML to JSON: {}", e)),
            };

            // Extract cawg_trust section
            let default_cawg_trust_config = serde_json::json!({
                "verify_trust_list": true,
                "user_anchors": null,
                "trust_anchors": null,
                "trust_config": null,
                "allowed_list": null
            });
            let cawg_trust_section = settings
                .get("cawg_trust")
                .unwrap_or(&default_cawg_trust_config);

            let json = match serde_json::to_string(cawg_trust_section) {
                Ok(s) => s,
                Err(e) => {
                    return cx.throw_error(format!("Failed to serialize CAWG trust config: {}", e))
                }
            };
            Ok(cx.string(json).upcast())
        }
        None => {
            // Return default trust config
            let default_trust = serde_json::json!({
                "verify_trust_list": true,
                "user_anchors": null,
                "trust_anchors": null,
                "trust_config": null,
                "allowed_list": null
            });
            Ok(cx.string(default_trust.to_string()).upcast())
        }
    }
}

/// Load verify configuration into the verify settings.
/// Takes a JSON string representing a VerifyConfig object and applies it to the verify field.
pub fn load_verify_config(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let json_arg = cx.argument::<JsString>(0)?;
    let json_string = json_arg.value(&mut cx);

    // Parse the JSON to get the verify config
    let verify_config: serde_json::Value = match serde_json::from_str(&json_string) {
        Ok(v) => v,
        Err(e) => return cx.throw_error(format!("Invalid JSON: {}", e)),
    };

    // Get current settings and merge with verify config
    let current_toml = get_global_settings_toml().unwrap_or_else(|| {
        // If no current settings, create default settings
        Settings::to_toml().unwrap_or_else(|_| String::new())
    });

    // Parse current settings
    let mut current_settings: serde_json::Value = if current_toml.is_empty() {
        serde_json::json!({
            "version_major": 1,
            "version_minor": 0,
            "trust": {
                "verify_trust_list": true,
                "user_anchors": null,
                "trust_anchors": null,
                "trust_config": null,
                "allowed_list": null
            },
            "cawg_trust": {
                "verify_trust_list": true,
                "user_anchors": null,
                "trust_anchors": null,
                "trust_config": null,
                "allowed_list": null
            },
            "core": {
                "debug": false,
                "hash_alg": "sha256",
                "salt_jumbf_boxes": true,
                "prefer_box_hash": false,
                "merkle_tree_max_proofs": 5,
                "compress_manifests": true,
                "backing_store_memory_threshold_in_mb": 512
            },
            "verify": {
                "verify_after_reading": true,
                "verify_after_sign": true,
                "verify_trust": false,
                "verify_timestamp_trust": true,
                "ocsp_fetch": false,
                "remote_manifest_fetch": true,
                "check_ingredient_trust": true,
                "skip_ingredient_conflict_resolution": false,
                "strict_v1_validation": false
            },
            "builder": {
                "thumbnail": {
                    "enabled": true
                }
            }
        })
    } else {
        // Parse existing TOML to JSON
        let toml_val: toml::Value = match toml::from_str(&current_toml) {
            Ok(v) => v,
            Err(e) => return cx.throw_error(format!("Failed to parse current TOML: {}", e)),
        };
        match serde_json::to_value(&toml_val) {
            Ok(v) => v,
            Err(e) => return cx.throw_error(format!("Failed to convert TOML to JSON: {}", e)),
        }
    };

    // Update the verify section with new values
    if let Some(verify_section) = current_settings.get_mut("verify") {
        if let Some(obj) = verify_section.as_object_mut() {
            if let Some(val) = verify_config.get("verify_after_reading") {
                obj.insert("verify_after_reading".to_string(), val.clone());
            }
            if let Some(val) = verify_config.get("verify_after_sign") {
                obj.insert("verify_after_sign".to_string(), val.clone());
            }
            if let Some(val) = verify_config.get("verify_trust") {
                obj.insert("verify_trust".to_string(), val.clone());
            }
            if let Some(val) = verify_config.get("verify_timestamp_trust") {
                obj.insert("verify_timestamp_trust".to_string(), val.clone());
            }
            if let Some(val) = verify_config.get("ocsp_fetch") {
                obj.insert("ocsp_fetch".to_string(), val.clone());
            }
            if let Some(val) = verify_config.get("remote_manifest_fetch") {
                obj.insert("remote_manifest_fetch".to_string(), val.clone());
            }
            if let Some(val) = verify_config.get("check_ingredient_trust") {
                obj.insert("check_ingredient_trust".to_string(), val.clone());
            }
            if let Some(val) = verify_config.get("skip_ingredient_conflict_resolution") {
                obj.insert("skip_ingredient_conflict_resolution".to_string(), val.clone());
            }
            if let Some(val) = verify_config.get("strict_v1_validation") {
                obj.insert("strict_v1_validation".to_string(), val.clone());
            }
        }
    }

    // Convert back to TOML and apply
    let updated_toml = match toml::to_string(&current_settings) {
        Ok(t) => t,
        Err(e) => return cx.throw_error(format!("Failed to convert to TOML: {}", e)),
    };

    // Apply the updated settings
    match Settings::from_toml(&updated_toml) {
        Ok(_) => {
            // Settings are now applied globally, save the TOML representation
            let toml_string = Settings::to_toml()
                .or_else(|e| cx.throw_error(format!("Failed to get settings as TOML: {}", e)))?;
            // Save the TOML snapshot for new worker threads
            set_global_settings_toml(Some(toml_string));
            reload_runtime();
            Ok(cx.undefined())
        }
        Err(e) => cx.throw_error(format!("Failed to apply verify settings: {}", e)),
    }
}

/// Get the current verify configuration as JSON.
pub fn get_verify_config(mut cx: FunctionContext) -> JsResult<JsValue> {
    match get_global_settings_toml() {
        Some(toml_string) => {
            // Convert TOML -> JSON for processing
            let toml_val: toml::Value = match toml::from_str(&toml_string) {
                Ok(v) => v,
                Err(e) => return cx.throw_error(format!("Failed to parse TOML: {}", e)),
            };
            let settings: serde_json::Value = match serde_json::to_value(&toml_val) {
                Ok(v) => v,
                Err(e) => return cx.throw_error(format!("Failed to convert TOML to JSON: {}", e)),
            };

            // Extract verify section
            let default_verify_config = serde_json::json!({
                "verify_after_reading": true,
                "verify_after_sign": true,
                "verify_trust": false,
                "verify_timestamp_trust": true,
                "ocsp_fetch": false,
                "remote_manifest_fetch": true,
                "check_ingredient_trust": true,
                "skip_ingredient_conflict_resolution": false,
                "strict_v1_validation": false
            });
            let verify_section = settings.get("verify").unwrap_or(&default_verify_config);

            let json = match serde_json::to_string(verify_section) {
                Ok(s) => s,
                Err(e) => {
                    return cx.throw_error(format!("Failed to serialize verify config: {}", e))
                }
            };
            Ok(cx.string(json).upcast())
        }
        None => {
            // Return default verify config
            let default_verify = serde_json::json!({
                "verify_after_reading": true,
                "verify_after_sign": true,
                "verify_trust": false,
                "verify_timestamp_trust": true,
                "ocsp_fetch": false,
                "remote_manifest_fetch": true,
                "check_ingredient_trust": true,
                "skip_ingredient_conflict_resolution": false,
                "strict_v1_validation": false
            });
            Ok(cx.string(default_verify.to_string()).upcast())
        }
    }
}
