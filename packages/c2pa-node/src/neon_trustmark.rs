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

use std::{
    fs::OpenOptions,
    io::{Cursor, Write},
    path::PathBuf,
    sync::{Arc, Mutex},
    time::Duration,
};

use image::ImageDecoder as _;
use neon::prelude::*;
use neon::result::{JsResult, NeonResult};
use neon::types::{buffer::TypedArray, Finalize, JsObject};
use rand::{distributions::Standard, prelude::Distribution as _};
use reqwest::Client;
use trustmark::{Trustmark, Variant, Version, WatermarkRemover};

use crate::error::{as_js_error, as_js_error_fn, Error, Result};
use crate::runtime::runtime;

#[derive(Clone)]
pub struct WatermarkConfig {
    variant: Variant,
    version: Version,
    model_path: PathBuf,
    load_remover: bool,
}

pub struct NeonTrustmark {
    // All Trustmark calls are synchronous, so the standard Mutex works.
    trustmark: Arc<Mutex<Trustmark>>,
    version: Version,
    remover: Option<Arc<WatermarkRemover>>,
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

    let load_remover = obj
        .get_opt::<JsBoolean, _, _>(cx, "loadRemover")?
        .is_some_and(|value| value.value(cx));

    if load_remover && !matches!(variant, Variant::P | Variant::Q) {
        return cx.throw_error("Watermark configuration error: removal supports only P/Q variants");
    }

    Ok(WatermarkConfig {
        variant,
        version,
        model_path,
        load_remover,
    })
}

/// Generate a random watermark with as many bits as specified by `bits`.
pub fn gen_watermark(version: Version) -> String {
    let bits = version.data_bits() as usize;
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

        let remover = if config.load_remover {
            let result = fetch_models(
                &config.model_path,
                &[format!("remover_{}.onnx", config.variant)],
            )
            .and_then(|path| WatermarkRemover::new(path, config.variant).map_err(Error::Watermark));

            match result {
                Ok(remover) => Some(Arc::new(remover)),
                Err(err) => return as_js_error_fn(&mut cx, err).and_then(|err| cx.throw(err)),
            }
        } else {
            None
        };

        Ok(cx.boxed(Self {
            trustmark: Arc::new(Mutex::new(trustmark)),
            version: config.version,
            remover,
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
                let watermark = watermark.unwrap_or_else(|| gen_watermark(version));
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

    pub fn remove(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let this = cx.this::<JsBox<Self>>()?;
        let Some(remover) = this.remover.clone() else {
            return cx.throw_error(
                "Watermark remover not loaded; initialize Trustmark with loadRemover: true",
            );
        };
        let buffer = cx.argument::<JsBuffer>(0)?;
        let image_bytes = buffer.as_slice(&cx);
        if image_bytes.len() > MAX_REMOVAL_INPUT_BYTES {
            let error = Error::WatermarkConfiguration("removal input exceeds 64 MiB".to_string());
            return as_js_error_fn(&mut cx, error).and_then(|err| cx.throw(err));
        }

        let image_bytes = image_bytes.to_vec();
        let promise = cx
            .task(move || remove_image(&image_bytes, &remover))
            .promise(move |mut cx, result: Result<Vec<u8>>| match result {
                Ok(png) => JsBuffer::from_slice(&mut cx, &png),
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

// Bound the input copy, decoding, and the full-resolution buffers allocated by
// removal. These are per-call limits, not a process-wide concurrency budget.
const MAX_REMOVAL_INPUT_BYTES: usize = 64 * 1024 * 1024;
const MAX_REMOVAL_DIMENSION: u32 = 16_384;
const MAX_REMOVAL_PIXELS: u64 = 32_000_000;
const MAX_REMOVAL_DECODE_BYTES: u64 = 128 * 1024 * 1024;

fn remove_image(bytes: &[u8], remover: &WatermarkRemover) -> Result<Vec<u8>> {
    let format = image::guess_format(bytes)?;
    if !matches!(format, image::ImageFormat::Jpeg | image::ImageFormat::Png) {
        return Err(Error::WatermarkConfiguration(
            "removal supports only 8-bit JPEG/PNG images".to_string(),
        ));
    }

    let mut limits = image::Limits::default();
    limits.max_image_width = Some(MAX_REMOVAL_DIMENSION);
    limits.max_image_height = Some(MAX_REMOVAL_DIMENSION);
    limits.max_alloc = Some(MAX_REMOVAL_DECODE_BYTES);
    let mut reader = image::ImageReader::with_format(Cursor::new(bytes), format);
    reader.limits(limits.clone());
    let mut decoder = reader.into_decoder()?;
    let (width, height) = decoder.dimensions();
    if u64::from(width) * u64::from(height) > MAX_REMOVAL_PIXELS {
        return Err(Error::WatermarkConfiguration(
            "removal image exceeds 32000000 pixels".to_string(),
        ));
    }

    if !matches!(
        decoder.color_type(),
        image::ColorType::L8
            | image::ColorType::La8
            | image::ColorType::Rgb8
            | image::ColorType::Rgba8
    ) {
        return Err(Error::WatermarkConfiguration(
            "removal supports only 8-bit JPEG/PNG images".to_string(),
        ));
    }

    // Include the decoded image buffer in the allocation budget, as
    // ImageReader::decode does. from_decoder does not reserve it itself.
    limits.reserve(decoder.total_bytes())?;
    decoder.set_limits(limits)?;
    let image = image::DynamicImage::from_decoder(decoder)?;
    let has_alpha = image.color().has_alpha();
    let recovered = remover.remove(image).map_err(Error::Watermark)?;
    let output = if has_alpha {
        image::DynamicImage::ImageRgba8(recovered.to_rgba8())
    } else {
        image::DynamicImage::ImageRgb8(recovered.to_rgb8())
    };
    let mut png = Cursor::new(Vec::new());
    output.write_to(&mut png, image::ImageFormat::Png)?;

    Ok(png.into_inner())
}

fn check_strength(strength: f32) -> Result<()> {
    if !(0.0..=1.0).contains(&strength) {
        return Err(Error::WatermarkConfiguration(
            "strength must be between 0.0 and 1.0".to_string(),
        ));
    }
    Ok(())
}

/// Minimum expected size for a valid ONNX model file (10 MB).
const MIN_MODEL_SIZE: usize = 10 * 1024 * 1024;

/// Maximum number of download attempts per model file.
const MAX_RETRIES: u32 = 3;

// Taken from Trustmark xtask.
// Will not overwrite models if they already exist.
pub fn fetch_model(variant: Variant, dir_path: &std::path::Path) -> Result<PathBuf> {
    fetch_models(
        dir_path,
        &[
            format!("encoder_{variant}.onnx"),
            format!("decoder_{variant}.onnx"),
        ],
    )
}

fn fetch_models(dir_path: &std::path::Path, filenames: &[String]) -> Result<PathBuf> {
    let rt = runtime();
    let client = Client::builder()
        .timeout(Duration::from_secs(120))
        .connect_timeout(Duration::from_secs(10))
        .read_timeout(Duration::from_secs(60))
        .build()
        .map_err(|e| Error::ModelDownload(format!("Failed to build HTTP client: {e}")))?;

    // Ensure directory exists
    std::fs::create_dir_all(dir_path)?;

    let root = "https://cai-watermark.adobe.net/watermarking/trustmark-models";

    for filename in filenames {
        let model_path = dir_path.join(filename);
        if model_path.exists() {
            continue;
        }
        let model_url = format!("{root}/{filename}");

        let mut last_err = None;
        for attempt in 1..=MAX_RETRIES {
            match download_model(&rt, &client, &model_url) {
                Ok(model_bytes) => {
                    if model_bytes.len() < MIN_MODEL_SIZE {
                        last_err = Some(Error::ModelDownload(format!(
                            "Downloaded model {filename} is too small ({} bytes), expected at least {MIN_MODEL_SIZE} bytes",
                            model_bytes.len()
                        )));
                        continue;
                    }

                    // Write to a temporary file first, then rename for atomicity.
                    let tmp_path = dir_path.join(format!("{filename}.tmp"));
                    let mut file = OpenOptions::new()
                        .write(true)
                        .create(true)
                        .truncate(true)
                        .open(&tmp_path)
                        .map_err(|e| {
                            Error::ModelDownload(format!(
                                "Failed to create temp file {tmp_path:?}: {e}"
                            ))
                        })?;
                    file.write_all(&model_bytes).map_err(|e| {
                        Error::ModelDownload(format!("Failed to write model to {tmp_path:?}: {e}"))
                    })?;
                    std::fs::rename(&tmp_path, &model_path).map_err(|e| {
                        Error::ModelDownload(format!(
                            "Failed to rename {tmp_path:?} to {model_path:?}: {e}"
                        ))
                    })?;

                    last_err = None;
                    break;
                }
                Err(e) => {
                    last_err = Some(e);
                    if attempt < MAX_RETRIES {
                        std::thread::sleep(Duration::from_secs(u64::from(attempt)));
                    }
                }
            }
        }

        if let Some(err) = last_err {
            return Err(err);
        }
    }
    Ok(dir_path.to_path_buf())
}

fn download_model(rt: &tokio::runtime::Runtime, client: &Client, url: &str) -> Result<Vec<u8>> {
    rt.block_on(async {
        let response = client
            .get(url)
            .send()
            .await
            .map_err(|e| Error::ModelDownload(format!("Failed to GET model: {e}")))?;
        response
            .bytes()
            .await
            .map_err(|e| Error::ModelDownload(format!("Failed to read model bytes: {e}")))
            .map(|b| b.to_vec())
    })
}
