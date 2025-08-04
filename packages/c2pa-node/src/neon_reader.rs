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
use crate::runtime::runtime;
use c2pa::{identity::validator::CawgValidator, Reader};
use neon::prelude::*;
use neon::types::buffer::TypedArray;
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Debug)]
pub struct NeonReader {
    reader: Arc<Mutex<Reader>>,
}

impl Finalize for NeonReader {}

impl NeonReader {
    pub fn new(mut cx: FunctionContext) -> JsResult<JsBox<NeonReader>> {
        Ok(cx.boxed(NeonReader {
            reader: Arc::new(Mutex::new(Reader::default())),
        }))
    }

    pub fn from_stream(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let source = cx
            .argument::<JsObject>(0)
            .and_then(|obj| parse_asset(&mut cx, obj))?;

        let promise = cx
            .task(move || {
                let format = source
                    .mime_type()
                    .ok_or_else(|| {
                        Error::Signing("Ingredient asset must have a mime type".to_string())
                    })?
                    .to_owned();
                let stream = source.into_read_stream()?;
                let reader = Reader::from_stream(&format, stream)?;
                Ok(reader)
            })
            .promise(move |mut cx, result: Result<Reader, Error>| match result {
                Ok(reader) => {
                    let boxed_reader = cx.boxed(NeonReader {
                        reader: Arc::new(Mutex::new(reader)),
                    });
                    Ok(boxed_reader.upcast::<JsValue>())
                }
                Err(err) => as_js_error(&mut cx, err).and_then(|err| cx.throw(err)),
            });
        Ok(promise)
    }

    pub fn from_manifest_data_and_asset(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let manifest_data = cx.argument::<JsBuffer>(0)?;
        let asset = cx
            .argument::<JsObject>(1)
            .and_then(|obj| parse_asset(&mut cx, obj))?;

        let c2pa_data = manifest_data.as_slice(&cx).to_vec();
        let promise = cx
            .task(move || {
                let format = asset
                    .mime_type()
                    .ok_or_else(|| {
                        Error::Signing("Ingredient asset must have a mime type".to_string())
                    })?
                    .to_owned();
                let mut stream = asset.into_read_stream()?;
                let reader =
                    Reader::from_manifest_data_and_stream(&c2pa_data, &format, &mut stream)?;
                Ok(reader)
            })
            .promise(move |mut cx, result: Result<Reader, Error>| match result {
                Ok(reader) => {
                    let boxed_reader = cx.boxed(NeonReader {
                        reader: Arc::new(Mutex::new(reader)),
                    });
                    Ok(boxed_reader.upcast::<JsValue>())
                }
                Err(err) => as_js_error(&mut cx, err).and_then(|err| cx.throw(err)),
            });

        Ok(promise)
    }

    pub fn json(mut cx: FunctionContext) -> JsResult<JsValue> {
        let rt = runtime();
        let this = cx.this::<JsBox<NeonReader>>()?;
        let reader = rt.block_on(async { this.reader.lock().await });
        let json = reader.json();
        Ok(cx.string(json).upcast())
    }

    pub fn remote_url(mut cx: FunctionContext) -> JsResult<JsValue> {
        let rt = runtime();
        let this = cx.this::<JsBox<NeonReader>>()?;
        let reader = rt.block_on(async { this.reader.lock().await });
        let remote_url = reader.remote_url().unwrap_or("");
        Ok(cx.string(remote_url).upcast())
    }

    pub fn is_embedded(mut cx: FunctionContext) -> JsResult<JsValue> {
        let rt = runtime();
        let this = cx.this::<JsBox<NeonReader>>()?;
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
        let this = cx.this::<JsBox<NeonReader>>()?;

        let reader = Arc::clone(&this.reader);

        let (deferred, promise) = cx.promise();
        rt.spawn(async move {
            let result = async {
                let reader = reader.lock().await;
                let bytes_written = reader
                    .resource_to_stream(&uri, &mut output_stream)
                    .map_err(Error::from)?;
                Ok::<_, Error>((bytes_written, output_stream))
            }
            .await;
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

                    if let Some(buffer) = buffer {
                        let js_buffer = JsBuffer::from_slice(&mut cx, &buffer)?;
                        let js_bytes_written = cx.number(bytes_written as f64);
                        let result = cx.empty_object();
                        result.set(&mut cx, "buffer", js_buffer)?;
                        result.set(&mut cx, "bytes_written", js_bytes_written)?;
                        Ok(result.upcast::<JsValue>())
                    } else {
                        Ok(cx.number(bytes_written as f64).upcast::<JsValue>())
                    }
                }
                Err(err) => as_js_error(&mut cx, err).and_then(|err| cx.throw(err)),
            });
        });
        Ok(promise)
    }

    pub fn post_validate_cawg(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let rt = runtime();
        let this = cx.this::<JsBox<NeonReader>>()?;
        let reader = Arc::clone(&this.reader);

        let channel = cx.channel();
        let (deferred, promise) = cx.promise();

        rt.spawn(async move {
            let result = async {
                let mut reader = reader.lock().await;
                reader.post_validate_async(&CawgValidator {}).await?;
                Ok(())
            }
            .await;
            deferred.settle_with(&channel, move |mut cx| match result {
                Ok(_) => Ok(cx.undefined()),
                Err(err) => as_js_error(&mut cx, err).and_then(|err| cx.throw(err)),
            });
        });
        Ok(promise)
    }
}
