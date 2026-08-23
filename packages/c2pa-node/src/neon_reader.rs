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
use crate::error::{as_js_error, Error, Result};
use crate::range::{HttpRangeResolver, SourceEntry};
use crate::runtime::runtime;
use crate::utils::parse_settings;
use c2pa::{Context, Reader};
use neon::context::Context as NeonContext;
use neon::prelude::*;
use neon::types::buffer::TypedArray;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Debug)]
pub struct NeonReader {
    reader: Arc<Mutex<Reader>>,
}

impl Finalize for NeonReader {}

impl NeonReader {
    pub fn new(mut cx: FunctionContext) -> JsResult<JsBox<NeonReader>> {
        Ok(cx.boxed(Self {
            reader: Arc::new(Mutex::new(Reader::default())),
        }))
    }

    #[allow(clippy::borrowed_box)]
    pub(crate) fn reader(&self) -> Arc<Mutex<Reader>> {
        Arc::clone(&self.reader)
    }

    /// Create a reader from one or more URL range sources, reading only the bytes
    /// c2pa-rs asks for through JS `readRange` callbacks.
    ///
    /// Args: (format, mode, urls[], sizes[], readRanges[], onFetch|null, settings|null).
    /// `mode` is "single" or "fragment" (first url is the initialization segment).
    pub fn from_range_sources(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let format = cx.argument::<JsString>(0)?.value(&mut cx);
        let mode = cx.argument::<JsString>(1)?.value(&mut cx);
        let urls_arr = cx.argument::<JsArray>(2)?;
        let sizes_arr = cx.argument::<JsArray>(3)?;
        let ranges_arr = cx.argument::<JsArray>(4)?;

        let count = urls_arr.len(&mut cx);
        if count == 0 {
            return cx.throw_error("from_range_sources requires at least one source");
        }

        let mut urls: Vec<String> = Vec::with_capacity(count as usize);
        let mut sources: HashMap<String, SourceEntry> = HashMap::new();
        for i in 0..count {
            let url = urls_arr.get::<JsString, _, _>(&mut cx, i)?.value(&mut cx);
            let size = sizes_arr.get::<JsNumber, _, _>(&mut cx, i)?.value(&mut cx) as u64;
            let read_range = ranges_arr.get::<JsFunction, _, _>(&mut cx, i)?.root(&mut cx);
            urls.push(url.clone());
            sources.insert(
                url,
                SourceEntry {
                    size,
                    read_range: Arc::new(read_range),
                },
            );
        }

        let on_fetch = match cx.argument_opt(5) {
            Some(value) if value.is_a::<JsFunction, _>(&mut cx) => Some(Arc::new(
                value.downcast_or_throw::<JsFunction, _>(&mut cx)?.root(&mut cx),
            )),
            _ => None,
        };

        let context_opt =
            parse_settings(&mut cx, 6, "Reader").or_else(|err| cx.throw_error(err.to_string()))?;

        let channel = cx.channel();
        let sources = Arc::new(sources);
        let (deferred, promise) = cx.promise();
        let rt = runtime();

        rt.spawn(async move {
            let result: Result<Reader> = async {
                let context = context_opt.unwrap_or_else(Context::new).with_async_asset_resolver(
                    HttpRangeResolver::new(channel.clone(), sources.clone(), on_fetch.clone()),
                );
                let reader = if mode == "fragment" {
                    let fragments = urls[1..].to_vec();
                    Reader::from_context(context)
                        .with_fragment_references_async(&format, &urls[0], &fragments)
                        .await?
                } else {
                    Reader::from_context(context)
                        .with_reference_async(&format, &urls[0])
                        .await?
                };
                Ok(reader)
            }
            .await;

            deferred.settle_with(&channel, move |mut cx| match result {
                Ok(reader) => {
                    let boxed_reader = cx.boxed(Self {
                        reader: Arc::new(Mutex::new(reader)),
                    });
                    Ok(boxed_reader.upcast::<JsValue>())
                }
                Err(err) => match &err {
                    Error::C2pa(c2pa::Error::JumbfNotFound) => Ok(cx.null().upcast::<JsValue>()),
                    _ => as_js_error(&mut cx, err).and_then(|err| cx.throw(err)),
                },
            });
        });

        Ok(promise)
    }

    pub fn from_stream(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let rt = runtime();
        let channel = cx.channel();
        let source = cx
            .argument::<JsObject>(0)
            .and_then(|obj| parse_asset(&mut cx, obj))?;

        // Parse optional settings parameter (argument 1)
        let context_opt =
            parse_settings(&mut cx, 1, "Reader").or_else(|err| cx.throw_error(err.to_string()))?;

        let (deferred, promise) = cx.promise();
        rt.spawn(async move {
            let result: Result<Reader> = async {
                let format = source
                    .mime_type()
                    .ok_or_else(|| {
                        Error::Reading("Source asset must have a mime type".to_string())
                    })?
                    .to_owned();

                let stream = source.into_read_stream()?;

                // Create reader with or without context
                let reader = if let Some(context) = context_opt {
                    Reader::from_context(context)
                        .with_stream_async(&format, stream)
                        .await?
                } else {
                    Reader::default().with_stream_async(&format, stream).await?
                };

                Ok(reader)
            }
            .await;

            deferred.settle_with(&channel, move |mut cx| match result {
                Ok(reader) => {
                    let boxed_reader = cx.boxed(Self {
                        reader: Arc::new(Mutex::new(reader)),
                    });
                    Ok(boxed_reader.upcast::<JsValue>())
                }
                Err(err) => {
                    // Check if the error is due to missing C2PA data
                    // Return null instead of throwing for these specific cases
                    match &err {
                        Error::C2pa(c2pa_err) => match c2pa_err {
                            c2pa::Error::JumbfNotFound => Ok(cx.null().upcast::<JsValue>()),
                            _ => as_js_error(&mut cx, err).and_then(|err| cx.throw(err)),
                        },
                        _ => as_js_error(&mut cx, err).and_then(|err| cx.throw(err)),
                    }
                }
            });
        });
        Ok(promise)
    }

    pub fn from_manifest_data_and_asset(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let rt = runtime();
        let channel = cx.channel();
        let manifest_data = cx.argument::<JsBuffer>(0)?;
        let asset = cx
            .argument::<JsObject>(1)
            .and_then(|obj| parse_asset(&mut cx, obj))?;

        // Parse optional settings parameter (argument 2) - note: settings are not currently used
        // for from_manifest_data_and_asset as the c2pa-rs API doesn't support context for this method yet
        let context_opt =
            parse_settings(&mut cx, 2, "Reader").or_else(|err| cx.throw_error(err.to_string()))?;

        let c2pa_data = manifest_data.as_slice(&cx).to_vec();
        let (deferred, promise) = cx.promise();
        rt.spawn(async move {
            let result = async {
                let format = asset
                    .mime_type()
                    .ok_or_else(|| {
                        Error::Reading("Source asset must have a mime type".to_string())
                    })?
                    .to_owned();
                let stream = asset.into_read_stream()?;

                let reader = if let Some(context) = context_opt {
                    Reader::from_context(context)
                        .with_manifest_data_and_stream_async(&c2pa_data, &format, stream)
                        .await?
                } else {
                    Reader::default()
                        .with_manifest_data_and_stream_async(&c2pa_data, &format, stream)
                        .await?
                };

                Ok(reader)
            }
            .await;

            deferred.settle_with(&channel, move |mut cx| match result {
                Ok(reader) => {
                    let boxed_reader = cx.boxed(Self {
                        reader: Arc::new(Mutex::new(reader)),
                    });
                    Ok(boxed_reader.upcast::<JsValue>())
                }
                Err(err) => as_js_error(&mut cx, err).and_then(|err| cx.throw(err)),
            });
        });
        Ok(promise)
    }

    pub fn json(mut cx: FunctionContext) -> JsResult<JsValue> {
        let rt = runtime();
        let this = cx.this::<JsBox<Self>>()?;
        let reader = rt.block_on(async { this.reader.lock().await });
        let json = reader.json();
        Ok(cx.string(json).upcast())
    }

    pub fn remote_url(mut cx: FunctionContext) -> JsResult<JsValue> {
        let rt = runtime();
        let this = cx.this::<JsBox<Self>>()?;
        let reader = rt.block_on(async { this.reader.lock().await });
        let remote_url = reader.remote_url().unwrap_or("");
        Ok(cx.string(remote_url).upcast())
    }

    pub fn is_embedded(mut cx: FunctionContext) -> JsResult<JsValue> {
        let rt = runtime();
        let this = cx.this::<JsBox<Self>>()?;
        let reader = rt.block_on(async { this.reader.lock().await });
        let is_embedded = reader.is_embedded();
        Ok(cx.boolean(is_embedded).upcast())
    }

    pub fn resource_to_asset(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let rt = runtime();
        let channel = cx.channel();
        let uri = cx.argument::<JsString>(0)?.value(&mut cx);
        let output = cx
            .argument::<JsObject>(1)
            .and_then(|obj| parse_asset(&mut cx, obj))?;
        let mut output_stream = output
            .write_stream()
            .or_else(|err| cx.throw_error(err.to_string()))?;
        let this = cx.this::<JsBox<Self>>()?;

        let reader = Arc::clone(&this.reader);

        let (deferred, promise) = cx.promise();
        rt.spawn(async move {
            let result = reader
                .lock()
                .await
                .resource_to_stream(&uri, &mut output_stream)
                .map(|bytes_written| (bytes_written, output_stream))
                .map_err(Error::from);

            deferred.settle_with(&channel, move |mut cx| match result {
                Ok((bytes_written, mut output_stream)) => {
                    let buffer = if output.name() == "destination_buffer" {
                        let mut buffer = Vec::new();
                        output_stream.rewind().unwrap();
                        output_stream.read_to_end(&mut buffer).unwrap();
                        Some(buffer)
                    } else {
                        None
                    };

                    let result = cx.empty_object();
                    let js_bytes_written = cx.number(bytes_written as f64);
                    if let Some(buffer) = buffer {
                        let js_buffer = JsBuffer::from_slice(&mut cx, &buffer)?;
                        result.set(&mut cx, "buffer", js_buffer)?;
                    } else {
                        let empty_buffer = JsBuffer::from_slice(&mut cx, &[])?;
                        result.set(&mut cx, "buffer", empty_buffer)?;
                    }
                    result.set(&mut cx, "bytes_written", js_bytes_written)?;
                    Ok(result.upcast::<JsValue>())
                }
                Err(err) => as_js_error(&mut cx, err).and_then(|err| cx.throw(err)),
            });
        });
        Ok(promise)
    }
}
