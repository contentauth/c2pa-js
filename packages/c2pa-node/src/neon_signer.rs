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

use crate::runtime::runtime;
use async_trait::async_trait;
use c2pa::{
    create_signer,
    crypto::{
        raw_signature::{AsyncRawSigner, RawSigner, RawSignerError},
        time_stamp::{AsyncTimeStampProvider, TimeStampProvider},
    },
    AsyncSigner,
    Error::OtherError,
    Signer, SigningAlg,
};
use neon::prelude::*;
use neon::types::buffer::TypedArray;
use std::ops::Deref;
use std::{boxed::Box, str::FromStr, sync::Arc};
use tokio::sync::oneshot;

use crate::error::Error;

#[derive(Debug, Clone)]
pub struct CallbackSignerConfig {
    pub alg: SigningAlg,
    pub certs: Vec<u8>,
    pub reserve_size: usize,
    pub tsa_url: Option<String>,
    pub tsa_headers: Option<Vec<(String, String)>>,
    pub tsa_body: Option<Vec<u8>>,
    pub direct_cose_handling: bool,
}

impl CallbackSignerConfig {
    pub fn new(
        alg: SigningAlg,
        certs: Vec<u8>,
        reserve_size: usize,
        tsa_url: Option<String>,
        tsa_headers: Option<Vec<(String, String)>>,
        tsa_body: Option<Vec<u8>>,
        direct_cose_handling: bool,
    ) -> Self {
        Self {
            alg,
            certs,
            reserve_size,
            tsa_url,
            tsa_headers,
            tsa_body,
            direct_cose_handling,
        }
    }

    pub fn from_js_config<'a>(
        cx: &mut FunctionContext<'a>,
        js_config: Handle<JsObject>,
    ) -> JsResult<'a, JsBox<Self>> {
        let alg_str: String = js_config
            .get::<JsString, _, _>(cx, "alg")?
            .downcast_or_throw::<JsString, _>(cx)?
            .value(cx);
        let alg = SigningAlg::from_str(&alg_str)
            .or_else(|_| SigningAlg::from_str(&alg_str.to_uppercase()))
            .or_else(|err| cx.throw_error(err.to_string()))?;

        // Handle certs as an optional array of buffers
        let certs_array = js_config
            .get::<JsArray, _, _>(cx, "certs")?
            .downcast_or_throw::<JsArray, _>(cx)?;
        let mut certs = Vec::new();
        for i in 0..certs_array.len(cx) {
            let cert_buffer = certs_array
                .get::<JsBuffer, _, _>(cx, i)?
                .downcast_or_throw::<JsBuffer, _>(cx)?;
            certs.extend_from_slice(cert_buffer.as_slice(cx));
        }

        let reserve_size = js_config
            .get::<JsNumber, _, _>(cx, "reserveSize")?
            .value(cx) as usize;
        let tsa_url = js_config
            .get_opt::<JsString, _, _>(cx, "tsaUrl")?
            .map(|js_string| js_string.value(cx));
        let direct_cose_handling = js_config
            .get::<JsBoolean, _, _>(cx, "directCoseHandling")?
            .downcast_or_throw::<JsBoolean, _>(cx)?
            .value(cx);
        let tsa_headers =
            if let Some(js_array) = js_config.get_opt::<JsArray, _, _>(cx, "tsaHeaders")? {
                let len = js_array.len(cx);
                let mut headers = Vec::new();
                for i in 0..len {
                    let js_tuple = js_array
                        .get::<JsArray, _, _>(cx, i)?
                        .downcast_or_throw::<JsArray, _>(cx)?;
                    let key = js_tuple
                        .get::<JsString, _, _>(cx, 0)?
                        .downcast_or_throw::<JsString, _>(cx)?;
                    let value = js_tuple
                        .get::<JsString, _, _>(cx, 1)?
                        .downcast_or_throw::<JsString, _>(cx)?;
                    headers.push((key.value(cx), value.value(cx)));
                }
                Some(headers)
            } else {
                None
            };
        let tsa_body = js_config
            .get_opt::<JsBuffer, _, _>(cx, "tsaBody")?
            .map(|js_buffer| js_buffer.as_slice(cx).to_vec());

        Ok(cx.boxed(Self::new(
            alg,
            certs,
            reserve_size,
            tsa_url,
            tsa_headers,
            tsa_body,
            direct_cose_handling,
        )))
    }
}

// Add a new function to convert a JavaScript object to a JsBox<CallbackSignerConfig>
pub fn callback_signer_config_from_js(
    mut cx: FunctionContext,
) -> JsResult<JsBox<CallbackSignerConfig>> {
    let js_config = cx.argument::<JsObject>(0)?;
    CallbackSignerConfig::from_js_config(&mut cx, js_config)
}

#[derive(Clone)]
pub struct NeonCallbackSigner {
    channel: Channel,
    // JsFunction must be of the form (data: Buffer) => Promise<Buffer>
    callback: Arc<Root<JsFunction>>,
    config: CallbackSignerConfig,
}

impl NeonCallbackSigner {
    pub fn new(
        channel: Channel,
        callback: Arc<Root<JsFunction>>,
        config: CallbackSignerConfig,
    ) -> Self {
        Self {
            channel,
            callback,
            config,
        }
    }

    pub fn from_config(mut cx: FunctionContext) -> JsResult<JsBox<Self>> {
        let config_handle = cx.argument::<JsBox<CallbackSignerConfig>>(0)?;
        let config_ref: &CallbackSignerConfig = config_handle.deref();
        let callback = cx.argument::<JsFunction>(1)?.root(&mut cx);
        let channel = cx.channel();
        Ok(cx.boxed(Self::new(channel, Arc::new(callback), config_ref.clone())))
    }

    pub fn alg(mut cx: FunctionContext) -> JsResult<JsString> {
        let this = cx.this::<JsBox<Self>>()?;
        let alg = this.config.alg.to_string();
        Ok(cx.string(alg))
    }

    pub fn certs(mut cx: FunctionContext) -> JsResult<JsArray> {
        let this = cx.this::<JsBox<Self>>()?;
        let certs = this.config.certs.clone();
        let js_array = JsArray::new(&mut cx, certs.len());
        for (i, byte) in certs.iter().enumerate() {
            let js_value = cx.number(*byte as f64);
            js_array.set(&mut cx, i as u32, js_value)?;
        }
        Ok(js_array)
    }

    pub fn reserve_size(mut cx: FunctionContext) -> JsResult<JsNumber> {
        let this = cx.this::<JsBox<Self>>()?;
        let reserve_size = this.config.reserve_size;
        Ok(cx.number(reserve_size as f64))
    }

    pub fn time_authority_url(mut cx: FunctionContext) -> JsResult<JsValue> {
        let this = cx.this::<JsBox<Self>>()?;
        match this.config.tsa_url.clone() {
            Some(url) => Ok(cx.string(url).upcast()),
            None => Ok(cx.undefined().upcast()),
        }
    }

    pub fn direct_cose_handling(mut cx: FunctionContext) -> JsResult<JsBoolean> {
        let this = cx.this::<JsBox<Self>>()?;
        Ok(cx.boolean(this.config.direct_cose_handling))
    }

    pub fn sign(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let rt = runtime();
        let this = cx.this::<JsBox<Self>>()?;
        let data = cx.argument::<JsBuffer>(0)?.as_slice(&cx).to_vec();
        let (deferred, promise) = cx.promise();
        let channel = cx.channel().clone();
        let callback = this.callback.clone();
        let config = this.config.clone();

        rt.spawn(async move {
            let signer = NeonCallbackSigner::new(channel.clone(), callback, config);
            let result = <Self as AsyncSigner>::sign(&signer, data)
                .await
                .map_err(|e| e.to_string());

            deferred.settle_with(&channel, move |mut cx| match result {
                Ok(signature) => {
                    let buffer = JsBuffer::from_slice(&mut cx, &signature)?;
                    Ok(buffer.upcast::<JsValue>())
                }
                Err(e) => cx.throw_error(e),
            });
        });

        Ok(promise)
    }

    pub fn as_raw_signer(&self) -> &dyn AsyncRawSigner {
        self
    }
}

/// # Safety
///
/// The implementations of `Send` and `Sync` are marked as `unsafe` because the compiler cannot automatically
/// verify that the type is safe to send or share between threads. This is because:
/// - The type contains `RwLock` fields (`signer` and `identity_assertions`)
/// - The type interacts with JavaScript through Neon bindings
/// - The type contains references to JavaScript objects and callbacks
///
/// However, the implementation is safe because:
/// - The `RwLock` fields provide thread-safe access to the contained data
/// - The JavaScript interactions are properly synchronized through the Neon runtime
/// - The type is used in a controlled environment where the JavaScript context is properly managed
/// - The type is used in a way that ensures proper synchronization of access to its resources
///
/// These traits are necessary because:
/// - `Send`: Allows the type to be transferred between threads
/// - `Sync`: Allows the type to be shared between threads
///
/// The type needs these capabilities because it:
/// - Implements `AsyncSigner` and `AsyncRawSigner` traits for asynchronous signing operations
/// - Is used in the `identity_sign_async` function which performs asynchronous operations
/// - Is part of a Node.js binding where async operations are common
unsafe impl Send for NeonCallbackSigner {}
unsafe impl Sync for NeonCallbackSigner {}

#[async_trait]
impl AsyncSigner for NeonCallbackSigner {
    async fn sign(&self, data: Vec<u8>) -> Result<Vec<u8>, c2pa::Error> {
        let (tx, rx) = oneshot::channel();
        let sign_fn = self.callback.clone();
        let data = data.to_vec();

        self.channel
            .try_send(move |mut cx| {
                let to_be_signed = JsBuffer::from_slice(&mut cx, &data)?;
                let sign_fn = sign_fn.to_inner(&mut cx);

                let sign_fut = sign_fn
                    .call_with(&cx)
                    .arg(to_be_signed)
                    .apply::<JsPromise, _>(&mut cx)?
                    .to_future(&mut cx, |mut cx, result| match result {
                        Ok(value) => Ok(Ok(value
                            .downcast_or_throw::<JsBuffer, _>(&mut cx)?
                            .as_slice(&cx)
                            .to_vec())),
                        Err(err) => {
                            let js_string_result = err.to_string(&mut cx);
                            match js_string_result {
                                Ok(js_string) => {
                                    let err_string: String = js_string.value(&mut cx);
                                    Ok(Err(OtherError(Box::new(Error::AsyncSigning(err_string)))))
                                }
                                Err(throw) => Err(throw),
                            }
                        }
                    })?;

                let _ = tx.send(sign_fut);

                Ok(())
            })
            .map_err(|err| OtherError(Box::new(err)))?;

        let sign_fut = rx.await.map_err(|err| OtherError(Box::new(err)))?;

        let sign_result = sign_fut
            .await
            .map_err(|err| OtherError(Box::new(err)))?
            .map_err(|err| OtherError(Box::new(err)))?;

        Ok(sign_result)
    }

    fn alg(&self) -> SigningAlg {
        self.config.alg
    }

    fn certs(&self) -> Result<Vec<Vec<u8>>, c2pa::Error> {
        let pems = pem::parse_many(&self.config.certs).map_err(|e| OtherError(Box::new(e)))?;
        Ok(pems.into_iter().map(|p| p.into_contents()).collect())
    }

    fn reserve_size(&self) -> usize {
        self.config.reserve_size
    }

    fn direct_cose_handling(&self) -> bool {
        self.config.direct_cose_handling
    }

    fn async_raw_signer(&self) -> Option<Box<&dyn AsyncRawSigner>> {
        if self.config.direct_cose_handling {
            None
        } else {
            Some(Box::new(self))
        }
    }
}

impl TimeStampProvider for NeonCallbackSigner {
    fn time_stamp_service_url(&self) -> Option<String> {
        self.config.tsa_url.clone()
    }
    fn time_stamp_request_headers(&self) -> Option<Vec<(String, String)>> {
        self.config.tsa_headers.clone()
    }
}

impl AsyncTimeStampProvider for NeonCallbackSigner {
    fn time_stamp_service_url(&self) -> Option<String> {
        self.config.tsa_url.clone()
    }
    fn time_stamp_request_headers(&self) -> Option<Vec<(String, String)>> {
        self.config.tsa_headers.clone()
    }
}

#[async_trait]
impl AsyncRawSigner for NeonCallbackSigner {
    async fn sign(&self, data: Vec<u8>) -> Result<Vec<u8>, RawSignerError> {
        let (tx, rx) = oneshot::channel();
        let sign_fn = self.callback.clone();
        let data = data.to_vec();

        // Send the signing request to the JavaScript side
        self.channel
            .try_send(move |mut cx| {
                let to_be_signed = JsBuffer::from_slice(&mut cx, &data)?;
                let sign_fn = sign_fn.to_inner(&mut cx);

                let sign_fut = sign_fn
                    .call_with(&cx)
                    .arg(to_be_signed)
                    .apply::<JsPromise, _>(&mut cx)?
                    .to_future(&mut cx, |mut cx, result| match result {
                        Ok(value) => {
                            let buffer = value.downcast_or_throw::<JsBuffer, _>(&mut cx)?;
                            Ok(Ok(buffer.as_slice(&cx).to_vec()))
                        }
                        Err(err) => {
                            let err_string = match err.to_string(&mut cx) {
                                Ok(js_string) => js_string.value(&mut cx),
                                Err(e) => return Err(e),
                            };
                            Ok(Err(RawSignerError::CryptoLibraryError(err_string)))
                        }
                    })?;

                let _ = tx.send(sign_fut);
                Ok(())
            })
            .map_err(|err| RawSignerError::CryptoLibraryError(err.to_string()))?;

        // Wait for the JavaScript promise to resolve
        let sign_fut = rx
            .await
            .map_err(|err| RawSignerError::CryptoLibraryError(err.to_string()))?;

        // Get the result from the future
        sign_fut
            .await
            .map_err(|err| RawSignerError::CryptoLibraryError(err.to_string()))?
    }

    fn alg(&self) -> SigningAlg {
        self.config.alg
    }

    fn cert_chain(&self) -> Result<Vec<Vec<u8>>, RawSignerError> {
        let pems = pem::parse_many(&self.config.certs)
            .map_err(|e| RawSignerError::CryptoLibraryError(e.to_string()))?;
        Ok(pems.into_iter().map(|p| p.into_contents()).collect())
    }

    fn reserve_size(&self) -> usize {
        self.config.reserve_size
    }

    async fn ocsp_response(&self) -> Option<Vec<u8>> {
        None
    }
}

impl RawSigner for NeonCallbackSigner {
    fn sign(&self, _data: &[u8]) -> Result<Vec<u8>, RawSignerError> {
        // Synchronous signing is not supported; use AsyncRawSigner instead
        Err(RawSignerError::InternalError(
            "Synchronous signing not supported - use AsyncRawSigner instead".to_string(),
        ))
    }

    fn alg(&self) -> SigningAlg {
        AsyncRawSigner::alg(self)
    }

    fn cert_chain(&self) -> Result<Vec<Vec<u8>>, RawSignerError> {
        AsyncRawSigner::cert_chain(self)
    }

    fn reserve_size(&self) -> usize {
        AsyncRawSigner::reserve_size(self)
    }
}

pub struct NeonLocalSigner {
    signer: Box<dyn Signer>,
}

impl NeonLocalSigner {
    pub fn new(mut cx: FunctionContext) -> JsResult<JsBox<Self>> {
        let signcert = cx.argument::<JsBuffer>(0)?.as_slice(&cx).to_vec();
        let pkey = cx.argument::<JsBuffer>(1)?.as_slice(&cx).to_vec();
        let alg_str = cx.argument::<JsString>(2)?.value(&mut cx);
        let alg = SigningAlg::from_str(&alg_str).or_else(|err| cx.throw_error(err.to_string()))?;
        let tsa_url = cx.argument_opt(3).and_then(|js_value| {
            js_value
                .downcast::<JsString, _>(&mut cx)
                .ok()
                .map(|js_string| js_string.value(&mut cx))
        });
        let signer = create_signer::from_keys(&signcert, &pkey, alg, tsa_url)
            .or_else(|err| cx.throw_error(format!("Failed to create signer from keys: {err}")))?;
        Ok(cx.boxed(Self { signer }))
    }

    #[allow(clippy::borrowed_box)]
    pub(crate) fn signer(&self) -> &Box<dyn Signer> {
        &self.signer
    }

    pub fn sign(mut cx: FunctionContext) -> JsResult<JsBuffer> {
        let this = cx.this::<JsBox<Self>>()?;
        let data = cx.argument::<JsBuffer>(0)?.as_slice(&cx).to_vec();
        let signature =
            Signer::sign(&this.signer, &data).or_else(|err| cx.throw_error(err.to_string()))?;
        let buffer = JsBuffer::from_slice(&mut cx, signature.as_slice())?;
        Ok(buffer)
    }

    pub fn alg(mut cx: FunctionContext) -> JsResult<JsString> {
        let this = cx.this::<JsBox<Self>>()?;
        let alg = Signer::alg(&this.signer).to_string();
        Ok(cx.string(alg))
    }

    pub fn certs(mut cx: FunctionContext) -> JsResult<JsArray> {
        let this = cx.this::<JsBox<Self>>()?;
        let certs = this
            .signer
            .certs()
            .or_else(|err| cx.throw_error(err.to_string()))?;
        let js_array = JsArray::new(&mut cx, certs.len());
        for (i, cert) in certs.iter().enumerate() {
            let js_buffer = JsBuffer::from_slice(&mut cx, cert.as_slice())?;
            js_array.set(&mut cx, i as u32, js_buffer)?;
        }
        Ok(js_array)
    }

    pub fn reserve_size(mut cx: FunctionContext) -> JsResult<JsNumber> {
        let this = cx.this::<JsBox<Self>>()?;
        let reserve_size = Signer::reserve_size(&this.signer);
        Ok(cx.number(reserve_size as f64))
    }

    pub fn time_authority_url(mut cx: FunctionContext) -> JsResult<JsValue> {
        let this = cx.this::<JsBox<Self>>()?;
        match this.signer.time_authority_url() {
            Some(url) => Ok(cx.string(url).upcast()),
            None => Ok(cx.undefined().upcast()),
        }
    }
}

impl Finalize for NeonLocalSigner {}
impl Finalize for CallbackSignerConfig {}
impl Finalize for NeonCallbackSigner {}
