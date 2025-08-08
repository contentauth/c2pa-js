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

use crate::error::{as_js_error, as_js_error_fn, Error, Result};
use crate::runtime::runtime;
use neon::prelude::*;
use neon::result::{JsResult, NeonResult};
use neon::types::{buffer::TypedArray, Finalize, JsObject};
use rand::{distributions::Standard, prelude::Distribution as _};
use reqwest::Client;
use std::{
    fs::OpenOptions,
    io::Write,
    path::PathBuf,
    sync::{Arc, Mutex},
    time::Duration,
};
use trustmark::{Trustmark, Variant, Version};

#[derive(Clone)]
pub struct WatermarkConfig {
    variant: Variant,
    version: Version,
    model_path: PathBuf,
}

pub struct NeonTrustmark {
    // All Trustmark calls are synchronous, so the standard Mutex works.
    trustmark: Arc<Mutex<Trustmark>>,
    version: Version,
}

impl Finalize for NeonTrustmark {}

pub fn parse_watermark_config(
    cx: &mut FunctionContext,
    obj: Handle<JsObject>,
) -> NeonResult<WatermarkConfig> {
    let variant_str = match obj
        .get_opt::<JsString, _, _>(cx, "variant")?
        .map(|val| val.value(cx))
    {
        Some(val) => val,
        None => return cx.throw_error("Watermark configuration error: missing variant"),
    };

    let variant: Variant = variant_str
        .parse()
        .or_else(|_| cx.throw_error("Watermark configuration error: invalid variant"))?;

    let version_str = match obj
        .get_opt::<JsString, _, _>(cx, "version")?
        .map(|val| val.value(cx))
    {
        Some(val) => val,
        None => return cx.throw_error("Watermark configuration error: missing version"),
    };

    let version: Version = version_str.parse().or_else(|_| {
        cx.throw_error(format!(
            "Watermark configuration error: invalid version {version_str}"
        ))
    })?;

    let model_path: std::path::PathBuf = obj
        .get_opt::<JsString, _, _>(cx, "modelPath")?
        .map(|val| std::path::PathBuf::from(val.value(cx)))
        .unwrap_or_else(|| PathBuf::from("./models"));

    Ok(WatermarkConfig {
        variant,
        version,
        model_path,
    })
}

/// Generate a random watermark with as many bits as specified by `bits`.
pub fn gen_watermark(bits: usize) -> String {
    let mut rng = rand::thread_rng();
    let v: Vec<bool> = Standard.sample_iter(&mut rng).take(bits).collect();
    v.into_iter()
        .map(|bit| if bit { '1' } else { '0' })
        .collect()
}

impl NeonTrustmark {
    pub fn new_from_config(mut cx: FunctionContext) -> JsResult<JsBox<NeonTrustmark>> {
        let config = cx
            .argument::<JsObject>(0)
            .and_then(|obj| parse_watermark_config(&mut cx, obj))?;
        let model_path = match fetch_model(config.variant, &config.model_path) {
            Ok(path) => path,
            Err(err) => return as_js_error_fn(&mut cx, err).and_then(|err| cx.throw(err)),
        };
        let trustmark = match Trustmark::new(model_path, config.variant, config.version) {
            Ok(trustmark) => trustmark,
            Err(err) => return as_js_error_fn(&mut cx, err.into()).and_then(|err| cx.throw(err)),
        };

        Ok(cx.boxed(Self {
            trustmark: Arc::new(Mutex::new(trustmark)),
            version: config.version,
        }))
    }

    pub fn encode(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let this = cx.this::<JsBox<Self>>()?;
        let trustmark = this.trustmark.clone();
        let version = this.version;

        let image_bytes = cx.argument::<JsBuffer>(0)?.as_slice(&cx).to_vec();
        let strength = cx.argument::<JsNumber>(1)?.value(&mut cx) as f32;
        match check_strength(strength) {
            Ok(_) => Ok(()),
            Err(err) => as_js_error_fn(&mut cx, err).and_then(|err| cx.throw(err)),
        }?;

        let watermark = cx.argument_opt(2).and_then(|js_value| {
            js_value
                .downcast::<JsString, _>(&mut cx)
                .ok()
                .map(|js_string| js_string.value(&mut cx))
        });

        let promise = cx
            .task(move || {
                let trustmark = trustmark.lock()?;
                let image = image::load_from_memory(&image_bytes)?;
                let watermark =
                    watermark.unwrap_or_else(|| gen_watermark(version.data_bits().into()));
                let watermarked_image = trustmark
                    .encode(watermark, image, strength)
                    .map_err(Error::Watermark)?;

                // Convert to RGB8 format and return raw pixel data
                let rgb_image = watermarked_image.to_rgb8();
                let raw_pixel_data = rgb_image.into_raw();
                Ok(raw_pixel_data)
            })
            .promise(move |mut cx, result: Result<Vec<u8>>| match result {
                Ok(raw_pixel_data) => JsBuffer::from_slice(&mut cx, &raw_pixel_data),
                Err(err) => as_js_error(&mut cx, err).and_then(|err| cx.throw(err)),
            });
        Ok(promise)
    }

    pub fn decode(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let this = cx.this::<JsBox<Self>>()?;
        let trustmark = this.trustmark.clone();

        let image_bytes = cx.argument::<JsBuffer>(0)?.as_slice(&cx).to_vec();

        let promise = cx
            .task(move || {
                let trustmark = trustmark.lock()?;
                let image = image::load_from_memory(&image_bytes)?;
                let watermark = trustmark.decode(image)?;
                Ok(watermark)
            })
            .promise(move |mut cx, result: Result<String>| match result {
                Ok(watermark) => Ok(cx.string(watermark)),
                Err(err) => as_js_error(&mut cx, err).and_then(|err| cx.throw(err)),
            });
        Ok(promise)
    }
}

fn check_strength(strength: f32) -> Result<()> {
    if !(0.0..=1.0).contains(&strength) {
        return Err(Error::WatermarkConfiguration(
            "strength must be between 0.0 and 1.0".to_string(),
        ));
    }
    Ok(())
}

// Taken from Trustmark xtask.
// Will not overwrite models if they already exist.
pub fn fetch_model(variant: Variant, dir_path: &std::path::Path) -> Result<PathBuf> {
    let rt = runtime();
    let client = Client::builder()
        .timeout(Duration::from_secs(10))
        .connect_timeout(Duration::from_secs(5))
        .read_timeout(Duration::from_secs(5))
        .build()
        .map_err(|e| Error::ModelDownload(format!("Failed to build HTTP client: {e}")))?;

    // Ensure directory exists
    std::fs::create_dir_all(dir_path)?;

    let root = "https://cc-assets.netlify.app/watermarking/trustmark-models";

    // Construct filenames manually since encoder_filename/decoder_filename are private
    let encoder_filename = format!("encoder_{variant}.onnx");
    let decoder_filename = format!("decoder_{variant}.onnx");

    for filename in [encoder_filename, decoder_filename] {
        let model_path = dir_path.join(&filename);
        if model_path.exists() {
            continue;
        }
        let model_url = format!("{root}/{filename}");
        let model_bytes = rt.block_on(async {
            let response = client
                .get(&model_url)
                .send()
                .await
                .map_err(|e| Error::ModelDownload(format!("Failed to GET model: {e}")))?;
            response
                .bytes()
                .await
                .map_err(|e| Error::ModelDownload(format!("Failed to read model bytes: {e}")))
                .map(|b| b.to_vec())
        })?;
        let mut file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&model_path)
            .map_err(|e| {
                Error::ModelDownload(format!(
                    "Created {dir_path:?} but failed to open model directory{model_path:?}: {e}"
                ))
            })?;
        file.write_all(&model_bytes).map_err(|e| {
            Error::ModelDownload(format!(
                "Failed to write model to model directory {model_path:?}: {e}"
            ))
        })?;
    }
    Ok(dir_path.to_path_buf())
}
