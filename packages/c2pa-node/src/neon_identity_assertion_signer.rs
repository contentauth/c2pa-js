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

use crate::{
    neon_identity_assertion_builder::NeonIdentityAssertionBuilder, neon_signer::NeonCallbackSigner,
};
use async_trait::async_trait;
use c2pa::{dynamic_assertion::AsyncDynamicAssertion, AsyncSigner, SigningAlg};
use c2pa_crypto::{
    raw_signature::{AsyncRawSigner, RawSignerError},
    time_stamp::AsyncTimeStampProvider,
};
use neon::prelude::FunctionContext;
use neon::prelude::*;
use std::ops::Deref;
use std::sync::RwLock;

pub struct NeonIdentityAssertionSigner {
    signer: RwLock<NeonCallbackSigner>,
    identity_assertions: RwLock<Vec<NeonIdentityAssertionBuilder>>,
}

impl NeonIdentityAssertionSigner {
    pub fn new(mut cx: FunctionContext) -> JsResult<JsBox<Self>> {
        let signer_handle = cx.argument::<JsBox<NeonCallbackSigner>>(0)?;
        let signer_ref: &NeonCallbackSigner = signer_handle.deref();
        Ok(cx.boxed(Self {
            signer: RwLock::new(signer_ref.clone()),
            identity_assertions: RwLock::new(vec![]),
        }))
    }

    pub fn add_identity_assertion(mut cx: FunctionContext) -> JsResult<JsUndefined> {
        let this = cx.this::<JsBox<Self>>()?;
        let iab = cx.argument::<JsBox<NeonIdentityAssertionBuilder>>(0)?;
        let iab_ref: &NeonIdentityAssertionBuilder = iab.deref();
        let this_ref = this.deref();
        this_ref
            .identity_assertions
            .write()
            .unwrap()
            .push(iab_ref.clone());
        Ok(cx.undefined())
    }
}

impl Clone for NeonIdentityAssertionSigner {
    fn clone(&self) -> Self {
        Self {
            signer: RwLock::new(self.signer.read().unwrap().clone()),
            identity_assertions: RwLock::new(self.identity_assertions.read().unwrap().clone()),
        }
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
unsafe impl Send for NeonIdentityAssertionSigner {}
unsafe impl Sync for NeonIdentityAssertionSigner {}

#[async_trait]
impl AsyncRawSigner for NeonIdentityAssertionSigner {
    async fn sign(&self, data: Vec<u8>) -> Result<Vec<u8>, RawSignerError> {
        let signer = self.signer.read().unwrap().clone();
        AsyncRawSigner::sign(&signer, data).await
    }

    fn alg(&self) -> SigningAlg {
        AsyncRawSigner::alg(&*self.signer.read().unwrap())
    }

    fn cert_chain(&self) -> Result<Vec<Vec<u8>>, RawSignerError> {
        self.signer.read().unwrap().cert_chain()
    }

    fn reserve_size(&self) -> usize {
        AsyncRawSigner::reserve_size(&*self.signer.read().unwrap())
    }

    async fn ocsp_response(&self) -> Option<Vec<u8>> {
        let signer = self.signer.read().unwrap().clone();
        AsyncRawSigner::ocsp_response(&signer).await
    }
}

impl AsyncTimeStampProvider for NeonIdentityAssertionSigner {
    fn time_stamp_service_url(&self) -> Option<String> {
        self.signer.read().unwrap().time_stamp_service_url()
    }

    fn time_stamp_request_headers(&self) -> Option<Vec<(String, String)>> {
        self.signer.read().unwrap().time_stamp_request_headers()
    }
}

#[async_trait]
impl AsyncSigner for NeonIdentityAssertionSigner {
    async fn sign(&self, data: Vec<u8>) -> Result<Vec<u8>, c2pa::Error> {
        let signer = self.signer.read().unwrap().clone();
        c2pa::AsyncSigner::sign(&signer, data).await
    }

    fn alg(&self) -> SigningAlg {
        c2pa::AsyncSigner::alg(&*self.signer.read().unwrap())
    }

    fn certs(&self) -> Result<Vec<Vec<u8>>, c2pa::Error> {
        self.signer
            .read()
            .unwrap()
            .cert_chain()
            .map_err(|e| e.into())
    }

    fn reserve_size(&self) -> usize {
        c2pa::AsyncSigner::reserve_size(&*self.signer.read().unwrap())
    }

    async fn ocsp_val(&self) -> Option<Vec<u8>> {
        let signer = self.signer.read().unwrap().clone();
        c2pa::AsyncSigner::ocsp_val(&signer).await
    }

    fn time_authority_url(&self) -> Option<String> {
        c2pa::AsyncSigner::time_authority_url(&*self.signer.read().unwrap())
    }

    fn timestamp_request_headers(&self) -> Option<Vec<(String, String)>> {
        c2pa::AsyncSigner::timestamp_request_headers(&*self.signer.read().unwrap())
    }

    fn timestamp_request_body(&self, message: &[u8]) -> Result<Vec<u8>, c2pa::Error> {
        c2pa::AsyncSigner::timestamp_request_body(&*self.signer.read().unwrap(), message)
    }

    async fn send_timestamp_request(&self, message: &[u8]) -> Option<Result<Vec<u8>, c2pa::Error>> {
        let signer = self.signer.read().unwrap().clone();
        c2pa::AsyncSigner::send_timestamp_request(&signer, message).await
    }

    fn async_raw_signer(&self) -> Option<Box<&dyn AsyncRawSigner>> {
        Some(Box::new(self))
    }

    fn dynamic_assertions(&self) -> Vec<Box<dyn AsyncDynamicAssertion>> {
        let mut identity_assertions = self.identity_assertions.write().unwrap();
        let ia_clone = identity_assertions.split_off(0);
        let mut dynamic_assertions: Vec<Box<dyn AsyncDynamicAssertion>> = vec![];

        for ia in ia_clone.into_iter() {
            dynamic_assertions.push(Box::new(ia));
        }

        dynamic_assertions
    }
}

impl Finalize for NeonIdentityAssertionSigner {}
