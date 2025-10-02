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

use std::sync::PoisonError;

use neon::prelude::*;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum Error {
    #[error("Asset parsing failed: {0}")]
    Asset(String),

    #[error("Async signing failed {0}")]
    AsyncSigning(String),

    #[error(transparent)]
    C2pa(#[from] c2pa::Error),

    #[error(transparent)]
    FileIO(#[from] std::io::Error),

    #[error(transparent)]
    Image(#[from] image::ImageError),

    #[error(transparent)]
    Json(#[from] serde_json::Error),

    #[error("Lock acquisition failed: {0}")]
    Lock(String),

    #[error(transparent)]
    NeonSerde(#[from] neon_serde4::errors::Error),

    #[error("Trustmark model download failed")]
    ModelDownload(String),

    #[error(transparent)]
    RemoteManifestFetch(#[from] reqwest::Error),

    #[error("Settings handling failed: {0}")]
    Settings(String),

    #[error("Signing failed: {0}")]
    Signing(String),

    #[error(transparent)]
    TokioJoin(#[from] tokio::task::JoinError),

    #[error(transparent)]
    TokioTimeout(#[from] tokio::time::error::Elapsed),

    #[error(transparent)]
    TokioLock(#[from] tokio::sync::TryLockError),

    #[error(transparent)]
    Watermark(#[from] trustmark::Error),

    #[error("Watermark configuration error: {0}")]
    WatermarkConfiguration(String),

    #[error(transparent)]
    UTF8(#[from] std::str::Utf8Error),
}

impl<T> From<PoisonError<T>> for Error {
    fn from(err: PoisonError<T>) -> Self {
        Error::Lock(err.to_string())
    }
}

// Implement Send for Error
unsafe impl Send for Error {}
unsafe impl Sync for Error {}

#[allow(dead_code)]
pub type Result<T> = std::result::Result<T, Error>;

pub fn as_js_error<'a>(cx: &mut TaskContext<'a>, err: Error) -> JsResult<'a, JsError> {
    cx.execute_scoped(|mut cx| {
        let js_err = cx.error(err.to_string())?;
        let js_err_name = cx.string(format!("{err:?}"));
        js_err.set(&mut cx, "name", js_err_name)?;

        Ok(js_err)
    })
}

pub fn as_js_error_fn<'a>(cx: &mut FunctionContext<'a>, err: Error) -> JsResult<'a, JsError> {
    let js_err = cx.error(err.to_string())?;
    let js_err_name = cx.string(format!("{err:?}"));
    js_err.set(cx, "name", js_err_name)?;
    Ok(js_err)
}
