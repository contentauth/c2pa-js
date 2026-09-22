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

use std::ops::Deref;
use std::sync::Arc;

use async_trait::async_trait;
use c2pa::identity::builder::{AsyncCredentialHolder, IdentityBuilderError};
use c2pa::identity::SignerPayload;
use c2pa::HashedUri;
use neon::prelude::*;
use neon::types::buffer::TypedArray;
use neon_serde4;
use serde::{Deserialize, Serialize};
use tokio::sync::oneshot;

use crate::runtime::runtime;

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct JsSignerPayload {
    referenced_assertions: Vec<JsHashedUri>,
    sig_type: String,
    #[serde(default)]
    roles: Vec<String>,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct JsHashedUri {
    url: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    alg: Option<String>,
    #[serde(with = "serde_bytes")]
    hash: Vec<u8>,
}

impl From<&SignerPayload> for JsSignerPayload {
    fn from(payload: &SignerPayload) -> Self {
        JsSignerPayload {
            referenced_assertions: payload
                .referenced_assertions
                .iter()
                .map(|uri| JsHashedUri {
                    url: uri.url(),
                    alg: uri.alg(),
                    hash: uri.hash(),
                })
                .collect(),
            sig_type: payload.sig_type.clone(),
            roles: payload.roles.clone(),
        }
    }
}

impl From<JsSignerPayload> for SignerPayload {
    fn from(payload: JsSignerPayload) -> Self {
        SignerPayload {
            referenced_assertions: payload
                .referenced_assertions
                .into_iter()
                .map(|uri| HashedUri::new(uri.url, uri.alg, &uri.hash))
                .collect(),
            sig_type: payload.sig_type,
            roles: payload.roles,
        }
    }
}

/// NeonCallbackCredentialHolder allows JS to asynchronously sign a SignerPayload.
#[derive(Clone)]
pub struct NeonCallbackCredentialHolder {
    channel: Channel,
    // JS function: (payload: Buffer) => Promise<Buffer>
    callback: Arc<Root<JsFunction>>,
    reserve_size: usize,
    sig_type: String,
}

impl NeonCallbackCredentialHolder {
    pub fn new(
        channel: Channel,
        callback: Arc<Root<JsFunction>>,
        reserve_size: usize,
        sig_type: String,
    ) -> Self {
        Self {
            channel,
            callback,
            reserve_size,
            sig_type,
        }
    }

    pub fn from_js(mut cx: FunctionContext) -> JsResult<JsBox<Self>> {
        let reserve_size = cx.argument::<JsNumber>(0)?.value(&mut cx) as usize;
        let sig_type = cx.argument::<JsString>(1)?.value(&mut cx);
        let callback = cx.argument::<JsFunction>(2)?.root(&mut cx);
        let channel = cx.channel();
        Ok(cx.boxed(Self::new(
            channel,
            Arc::new(callback),
            reserve_size,
            sig_type,
        )))
    }

    /// JS accessor for the reserve size of this holder instance.
    pub fn reserve_size_js(mut cx: FunctionContext) -> JsResult<JsNumber> {
        let this = cx.this::<JsBox<Self>>()?;
        let reserve_size = this.reserve_size as f64;
        Ok(cx.number(reserve_size))
    }

    /// JS accessor for the signature type  of this holder instance.
    pub fn sig_type_js(mut cx: FunctionContext) -> JsResult<JsString> {
        let this = cx.this::<JsBox<Self>>()?;
        let sig_type = this.sig_type.clone();
        Ok(cx.string(sig_type))
    }

    /// Sign a `SignerPayload` supplied from JS,
    /// resolving to the signature bytes.
    pub fn sign_payload(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let payload_arg = cx.argument::<JsValue>(0)?;
        let js_payload: JsSignerPayload = match neon_serde4::from_value(&mut cx, payload_arg) {
            Ok(payload) => payload,
            Err(err) => return cx.throw_error(err.to_string()),
        };
        let signer_payload: SignerPayload = js_payload.into();

        let holder_handle = cx.this::<JsBox<Self>>()?;
        let holder_ref: &Self = holder_handle.deref();
        let holder = holder_ref.clone();
        let channel = cx.channel();
        let (deferred, promise) = cx.promise();
        let rt = runtime();

        // The credential holder's `sign` awaits a JS callback.
        rt.spawn(async move {
            let result = holder.sign(&signer_payload).await;
            deferred.settle_with(&channel, move |mut cx| match result {
                Ok(bytes) => Ok(JsBuffer::from_slice(&mut cx, &bytes)?),
                Err(err) => cx.throw_error(err.to_string()),
            });
        });

        Ok(promise)
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
unsafe impl Send for NeonCallbackCredentialHolder {}
unsafe impl Sync for NeonCallbackCredentialHolder {}

#[async_trait]
impl AsyncCredentialHolder for NeonCallbackCredentialHolder {
    fn sig_type(&self) -> &'static str {
        // This is safe because sig_type is stored as String and lives as long as self.
        // We leak the string to get a &'static str.
        Box::leak(self.sig_type.clone().into_boxed_str())
    }

    fn reserve_size(&self) -> usize {
        self.reserve_size
    }

    async fn sign(&self, signer_payload: &SignerPayload) -> Result<Vec<u8>, IdentityBuilderError> {
        let (tx, rx) = oneshot::channel();
        let callback = self.callback.clone();
        let channel = self.channel.clone();

        let payload = JsSignerPayload::from(signer_payload);

        channel
            .try_send(move |mut cx| {
                let js_payload = match neon_serde4::to_value(&mut cx, &payload) {
                    Ok(val) => val,
                    Err(err) => return cx.throw_error(err.to_string()),
                };
                let js_fn = callback.to_inner(&mut cx);
                let promise = js_fn
                    .call_with(&cx)
                    .arg(js_payload)
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
                                    Ok(Err(IdentityBuilderError::SignerError(err_string)))
                                }
                                Err(throw) => Err(throw),
                            }
                        }
                    })?;
                let _ = tx.send(promise);
                Ok(())
            })
            .map_err(|err| IdentityBuilderError::SignerError(err.to_string()))?;

        let fut = rx
            .await
            .map_err(|err| IdentityBuilderError::SignerError(err.to_string()))?;

        fut.await
            .map_err(|err| IdentityBuilderError::SignerError(err.to_string()))?
    }
}

impl Finalize for NeonCallbackCredentialHolder {}
