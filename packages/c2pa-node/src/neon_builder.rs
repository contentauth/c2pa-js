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

use crate::asset::parse_asset;
use crate::error::{as_js_error, Error};
use crate::neon_identity_assertion_signer::NeonIdentityAssertionSigner;
use crate::neon_signer::{CallbackSignerConfig, NeonCallbackSigner, NeonLocalSigner};
use crate::runtime::runtime;
use c2pa::Builder;
use neon::prelude::*;
use serde::{Deserialize, Serialize};
use serde_json;
use std::ops::Deref;
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct IngredientThumbnail {
    pub format: String,
    #[serde(with = "serde_bytes")]
    pub data: Vec<u8>,
}

#[derive(Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct IngredientOptions {
    pub is_parent: bool,
    pub thumbnail: Option<IngredientThumbnail>,
}

pub struct NeonBuilder {
    builder: Arc<Mutex<Builder>>,
}

impl NeonBuilder {
    pub fn new(mut cx: FunctionContext) -> JsResult<JsBox<Self>> {
        Ok(cx.boxed(Self {
            builder: Arc::new(Mutex::new(Builder::default())),
        }))
    }

    pub fn with_json(mut cx: FunctionContext) -> JsResult<JsBox<Self>> {
        let json = cx.argument::<JsString>(0)?.value(&mut cx);
        let builder = Builder::from_json(&json).or_else(|err| cx.throw_error(err.to_string()))?;
        Ok(cx.boxed(Self {
            builder: Arc::new(Mutex::new(builder)),
        }))
    }

    pub fn set_no_embed(mut cx: FunctionContext) -> JsResult<JsUndefined> {
        let rt = runtime();
        let this = cx.this::<JsBox<Self>>()?;
        let no_embed = cx.argument::<JsBoolean>(0)?.value(&mut cx);
        let mut builder = rt.block_on(async { this.builder.lock().await });
        builder.no_embed = no_embed;
        Ok(cx.undefined())
    }

    pub fn set_remote_url(mut cx: FunctionContext) -> JsResult<JsUndefined> {
        let rt = runtime();
        let this = cx.this::<JsBox<Self>>()?;
        let remote_url: String = cx.argument::<JsString>(0)?.value(&mut cx);
        let mut builder = rt.block_on(async { this.builder.lock().await });
        builder.set_remote_url(&remote_url);
        Ok(cx.undefined())
    }

    pub fn add_assertion(mut cx: FunctionContext) -> JsResult<JsUndefined> {
        let rt = runtime();
        let this = cx.this::<JsBox<Self>>()?;
        let label = cx.argument::<JsString>(0)?.value(&mut cx);
        let assertion = cx.argument::<JsString>(1)?.value(&mut cx);
        let assertion_kind = cx.argument_opt(2).and_then(|js_value| {
            js_value
                .downcast::<JsString, _>(&mut cx)
                .ok()
                .map(|js_string| js_string.value(&mut cx))
        });

        let mut builder = rt.block_on(async { this.builder.lock().await });
        if let Some("Json") = assertion_kind.as_deref() {
            builder
                .add_assertion_json(&label, &assertion)
                .or_else(|err| cx.throw_error(err.to_string()))?;
        } else {
            builder
                .add_assertion(&label, &assertion)
                .or_else(|err| cx.throw_error(err.to_string()))?;
        };

        Ok(cx.undefined())
    }

    pub fn add_resource(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let rt = runtime();
        let this = cx.this::<JsBox<Self>>()?;
        let uri = cx.argument::<JsString>(0)?.value(&mut cx);
        let resource = cx
            .argument::<JsObject>(1)
            .and_then(|obj| parse_asset(&mut cx, obj))?;
        let builder = Arc::clone(&this.builder);

        let channel = cx.channel();
        let (deferred, promise) = cx.promise();

        rt.spawn(async move {
            let mut builder = builder.lock().await;

            let result = resource.into_read_stream().and_then(|mut resource_stream| {
                builder.add_resource(&uri, &mut resource_stream)?;
                Ok(())
            });

            deferred.settle_with(&channel, |mut cx| match result {
                Ok(_) => Ok(cx.undefined()),
                Err(err) => as_js_error(&mut cx, err).and_then(|err| cx.throw(err)),
            });
        });

        Ok(promise)
    }

    pub fn add_ingredient(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let rt = runtime();
        let this = cx.this::<JsBox<Self>>()?;
        let ingredient_json = cx.argument::<JsString>(0)?.value(&mut cx);
        let ingredient = cx
            .argument::<JsObject>(1)
            .and_then(|obj| parse_asset(&mut cx, obj))?;

        let builder = Arc::clone(&this.builder);

        let channel = cx.channel();
        let (deferred, promise) = cx.promise();

        rt.spawn(async move {
            let mut builder = builder.lock().await;

            let result = ingredient
                .mime_type()
                .ok_or_else(|| Error::Signing("Ingredient asset must have a mime type".to_string()))
                .and_then(|format| {
                    let mut ingredient_stream = ingredient.into_read_stream()?;
                    builder.add_ingredient_from_stream(
                        &ingredient_json,
                        &format,
                        &mut ingredient_stream,
                    )?;
                    Ok(())
                });

            deferred.settle_with(&channel, move |mut cx| match result {
                Ok(_) => Ok(cx.undefined()),
                Err(err) => as_js_error(&mut cx, err).and_then(|err| cx.throw(err)),
            });
        });

        Ok(promise)
    }

    pub fn to_archive(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let rt = runtime();
        let this = cx.this::<JsBox<Self>>()?;
        let dest = cx
            .argument::<JsObject>(0)
            .and_then(|obj| parse_asset(&mut cx, obj))?;
        let builder = Arc::clone(&this.builder);

        let channel = cx.channel();
        let (deferred, promise) = cx.promise();

        rt.spawn(async move {
            let mut builder = builder.lock().await;
            let result = dest.write_stream().and_then(|dest_stream| {
                builder.to_archive(dest_stream)?;
                Ok(())
            });

            deferred.settle_with(&channel, move |mut cx| match result {
                Ok(_) => Ok(cx.undefined()),
                Err(err) => as_js_error(&mut cx, err).and_then(|err| cx.throw(err)),
            });
        });
        Ok(promise)
    }

    pub fn from_archive(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let rt = runtime();
        let source = cx
            .argument::<JsObject>(0)
            .and_then(|obj| parse_asset(&mut cx, obj))?;

        let channel = cx.channel();
        let (deferred, promise) = cx.promise();

        rt.spawn(async move {
            let result = source.into_read_stream().and_then(|source_stream| {
                let builder = Builder::from_archive(source_stream)?;
                Ok(builder)
            });

            deferred.settle_with(&channel, move |mut cx| match result {
                Ok(builder) => Ok(cx.boxed(Self {
                    builder: Arc::new(Mutex::new(builder)),
                })),
                Err(err) => as_js_error(&mut cx, err).and_then(|err| cx.throw(err)),
            });
        });
        Ok(promise)
    }

    pub fn sign(mut cx: FunctionContext) -> JsResult<JsBuffer> {
        let rt = runtime();
        let this = cx.this::<JsBox<Self>>()?;
        let signer = cx.argument::<JsBox<NeonLocalSigner>>(0)?;
        let input = cx
            .argument::<JsObject>(1)
            .and_then(|obj| parse_asset(&mut cx, obj))?;
        let output_obj = cx.argument::<JsObject>(2)?;
        let output = parse_asset(&mut cx, output_obj)?;
        let mut builder = rt.block_on(async { this.builder.lock().await });
        let signer = signer.signer();
        let format = match input.mime_type() {
            Some(mime_type) => mime_type.to_owned(),
            None => return cx.throw_error("Input asset must have a mime type"),
        };
        let mut input_stream = input
            .into_read_stream()
            .or_else(|err| cx.throw_error(err.to_string()))?;
        let mut output_stream = output
            .write_stream()
            .or_else(|err| cx.throw_error(err.to_string()))?;
        let bytes = builder
            .sign(&**signer, &format, &mut input_stream, &mut output_stream)
            .or_else(|err| cx.throw_error(err.to_string()))?;

        // If the output is a buffer, write the signed asset to it
        // Create a new JsBuffer with the contents of output_stream
        if output.name() == "destination_buffer" {
            let mut signed_asset = Vec::new();
            output_stream
                .rewind()
                .or_else(|e| cx.throw_error(format!("Failed to rewind stream: {e}")))?;
            output_stream
                .read_to_end(&mut signed_asset)
                .or_else(|e| cx.throw_error(format!("Failed to read stream: {e}")))?;
            let buffer = JsBuffer::from_slice(&mut cx, &signed_asset)?;
            // Set the new JsBuffer on the output JsObject
            output_obj.set(&mut cx, "buffer", buffer)?;
        }

        let buffer = JsBuffer::from_slice(&mut cx, bytes.as_slice())?;
        Ok(buffer)
    }

    // TODO: This mimics the previous c2pa-node iteration's arguments.
    // It is probably redundant with sign_async.
    pub fn sign_config_async(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let rt = runtime();
        let channel = cx.channel();

        let this = cx.this::<JsBox<Self>>()?;
        let callback = cx.argument::<JsFunction>(0)?;
        let rooted_callback: Arc<Root<JsFunction>> = Arc::new(Root::new(&mut cx, &callback));
        let js_config = cx.argument::<JsObject>(1)?;
        let config = CallbackSignerConfig::from_js_config(&mut cx, js_config)?;
        let signer = NeonCallbackSigner::new(cx.channel(), rooted_callback, (**config).clone());

        let input = cx
            .argument::<JsObject>(2)
            .and_then(|obj| parse_asset(&mut cx, obj))?;
        let output_obj = cx.argument::<JsObject>(3)?;
        let output = parse_asset(&mut cx, output_obj)?;
        let format = match input.mime_type() {
            Some(mime_type) => mime_type.to_owned(),
            None => return cx.throw_error("Input asset must have a mime type"),
        };
        let mut input_stream = input
            .into_read_stream()
            .or_else(|err| cx.throw_error(err.to_string()))?;
        let mut output_stream = output
            .write_stream()
            .or_else(|err| cx.throw_error(err.to_string()))?;

        let builder = Arc::clone(&this.builder);
        let (deferred, promise) = cx.promise();
        rt.spawn(async move {
            let result = builder
                .lock()
                .await
                .sign_async(&signer, &format, &mut input_stream, &mut output_stream)
                .await
                .map(|sign_result| (sign_result, output_stream));

            deferred.settle_with(&channel, move |mut cx| match result {
                Ok((signed_bytes, mut output_stream)) => {
                    let signed_asset = if output.name() == "destination_buffer" {
                        let mut buffer = Vec::new();
                        match output_stream.rewind() {
                            Ok(_) => (),
                            Err(e) => {
                                return cx.throw_error(format!("Failed to rewind stream: {e}"))
                            }
                        }
                        match output_stream.read_to_end(&mut buffer) {
                            Ok(_) => (),
                            Err(e) => return cx.throw_error(format!("Failed to read stream: {e}")),
                        }
                        Some(buffer)
                    } else {
                        None
                    };

                    let result_buffer = JsBuffer::from_slice(&mut cx, signed_bytes.as_slice())?;

                    if let Some(signed_asset) = signed_asset {
                        let signed_buffer = JsBuffer::from_slice(&mut cx, &signed_asset)?;
                        let result = cx.empty_object();
                        result.set(&mut cx, "manifest", result_buffer)?;
                        result.set(&mut cx, "signedAsset", signed_buffer)?;
                        Ok(result.upcast::<JsValue>())
                    } else {
                        Ok(result_buffer.upcast::<JsValue>())
                    }
                }
                Err(err) => cx.throw_error(err.to_string()),
            });
        });
        Ok(promise)
    }

    pub fn sign_async(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let rt = runtime();
        let channel = cx.channel();

        let this = cx.this::<JsBox<Self>>()?;
        let signer = cx.argument::<JsBox<NeonCallbackSigner>>(0)?;
        let signer_ref: &NeonCallbackSigner = signer.deref();
        let signer = signer_ref.clone();
        let input = cx
            .argument::<JsObject>(1)
            .and_then(|obj| parse_asset(&mut cx, obj))?;
        let output_obj = cx.argument::<JsObject>(2)?;
        let output = parse_asset(&mut cx, output_obj)?;
        let format = match input.mime_type() {
            Some(mime_type) => mime_type.to_owned(),
            None => return cx.throw_error("Input asset must have a mime type"),
        };
        let mut input_stream = input
            .into_read_stream()
            .or_else(|err| cx.throw_error(err.to_string()))?;
        let mut output_stream = output
            .write_stream()
            .or_else(|err| cx.throw_error(err.to_string()))?;

        let builder = Arc::clone(&this.builder);
        let (deferred, promise) = cx.promise();
        rt.spawn(async move {
            let result = builder
                .lock()
                .await
                .sign_async(&signer, &format, &mut input_stream, &mut output_stream)
                .await
                .map(|sign_result| (sign_result, output_stream));

            deferred.settle_with(&channel, move |mut cx| match result {
                Ok((signed_bytes, mut output_stream)) => {
                    let signed_asset = if output.name() == "destination_buffer" {
                        let mut buffer = Vec::new();
                        match output_stream.rewind() {
                            Ok(_) => (),
                            Err(e) => {
                                return cx.throw_error(format!("Failed to rewind stream: {e}"))
                            }
                        }
                        match output_stream.read_to_end(&mut buffer) {
                            Ok(_) => (),
                            Err(e) => return cx.throw_error(format!("Failed to read stream: {e}")),
                        }
                        Some(buffer)
                    } else {
                        None
                    };

                    let result_buffer = JsBuffer::from_slice(&mut cx, signed_bytes.as_slice())?;

                    if let Some(signed_asset) = signed_asset {
                        let signed_buffer = JsBuffer::from_slice(&mut cx, &signed_asset)?;
                        let result = cx.empty_object();
                        result.set(&mut cx, "manifest", result_buffer)?;
                        result.set(&mut cx, "signedAsset", signed_buffer)?;
                        Ok(result.upcast::<JsValue>())
                    } else {
                        Ok(result_buffer.upcast::<JsValue>())
                    }
                }
                Err(err) => cx.throw_error(err.to_string()),
            });
        });
        Ok(promise)
    }

    pub fn identity_sign_async(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let rt = runtime();
        let channel = cx.channel();

        let this = cx.this::<JsBox<Self>>()?;
        let signer = cx.argument::<JsBox<NeonIdentityAssertionSigner>>(0)?;
        let signer_ref: &NeonIdentityAssertionSigner = signer.deref();
        let signer = signer_ref.clone();
        let input = cx
            .argument::<JsObject>(1)
            .and_then(|obj| parse_asset(&mut cx, obj))?;
        let output_obj = cx.argument::<JsObject>(2)?;
        let output = parse_asset(&mut cx, output_obj)?;
        let format = match input.mime_type() {
            Some(mime_type) => mime_type.to_owned(),
            None => return cx.throw_error("Input asset must have a mime type"),
        };
        let mut input_stream = input
            .into_read_stream()
            .or_else(|err| cx.throw_error(err.to_string()))?;
        let mut output_stream = output
            .write_stream()
            .or_else(|err| cx.throw_error(err.to_string()))?;

        let builder = Arc::clone(&this.builder);
        let (deferred, promise) = cx.promise();

        rt.spawn(async move {
            let result = builder
                .lock()
                .await
                .sign_async(&signer, &format, &mut input_stream, &mut output_stream)
                .await
                .map(|sign_result| (sign_result, output_stream));

            deferred.settle_with(&channel, move |mut cx| match result {
                Ok((signed_bytes, mut output_stream)) => {
                    let signed_asset = if output.name() == "destination_buffer" {
                        let mut buffer = Vec::new();
                        match output_stream.rewind() {
                            Ok(_) => (),
                            Err(e) => {
                                return cx.throw_error(format!("Failed to rewind stream: {e}"))
                            }
                        }
                        match output_stream.read_to_end(&mut buffer) {
                            Ok(_) => (),
                            Err(e) => return cx.throw_error(format!("Failed to read stream: {e}")),
                        }
                        Some(buffer)
                    } else {
                        None
                    };

                    let result_buffer = JsBuffer::from_slice(&mut cx, signed_bytes.as_slice())?;

                    if let Some(signed_asset) = signed_asset {
                        let signed_buffer = JsBuffer::from_slice(&mut cx, &signed_asset)?;
                        let result = cx.empty_object();
                        result.set(&mut cx, "manifest", result_buffer)?;
                        result.set(&mut cx, "signedAsset", signed_buffer)?;
                        Ok(result.upcast::<JsValue>())
                    } else {
                        Ok(result_buffer.upcast::<JsValue>())
                    }
                }
                Err(err) => cx.throw_error(err.to_string()),
            });
        });
        Ok(promise)
    }

    pub fn manifest_definition(mut cx: FunctionContext) -> JsResult<JsValue> {
        let rt = runtime();
        let this = cx.this::<JsBox<Self>>()?;
        let builder = rt.block_on(async { this.builder.lock().await });
        let json = serde_json::to_string(&builder.definition)
            .or_else(|err| cx.throw_error(err.to_string()))?;
        Ok(cx.string(json).upcast())
    }

    /// Update a manifest property. Available properties are limited to strings and numbers.
    /// There are other methods for thumbnails, ingredients and assertions, etc.
    pub fn update_manifest_property(mut cx: FunctionContext) -> JsResult<JsUndefined> {
        let rt = runtime();
        let this = cx.this::<JsBox<Self>>()?;
        let property = cx.argument::<JsString>(0)?.value(&mut cx);
        let value = cx.argument::<JsValue>(1)?;

        let mut builder = rt.block_on(async { this.builder.lock().await });

        match property.as_str() {
            "vendor" => {
                let value = value
                    .downcast_or_throw::<JsString, _>(&mut cx)?
                    .value(&mut cx);
                builder.definition.vendor = Some(value);
            }
            "title" => {
                let value = value
                    .downcast_or_throw::<JsString, _>(&mut cx)?
                    .value(&mut cx);
                builder.definition.title = Some(value);
            }
            "format" => {
                let value = value
                    .downcast_or_throw::<JsString, _>(&mut cx)?
                    .value(&mut cx);
                builder.definition.format = value;
            }
            "instance_id" => {
                let value = value
                    .downcast_or_throw::<JsString, _>(&mut cx)?
                    .value(&mut cx);
                builder.definition.instance_id = value;
            }
            "label" => {
                let value = value
                    .downcast_or_throw::<JsString, _>(&mut cx)?
                    .value(&mut cx);
                builder.definition.label = Some(value);
            }
            "claim_version" => {
                let value = value
                    .downcast_or_throw::<JsNumber, _>(&mut cx)?
                    .value(&mut cx) as u8;
                builder.definition.claim_version = Some(value);
            }
            _ => {
                return cx.throw_error(format!(
                    "Property '{property}' not found or not a valid type"
                ))
            }
        }

        Ok(cx.undefined())
    }
}

impl Finalize for NeonBuilder {}
