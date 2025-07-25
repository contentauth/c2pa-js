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

use crate::neon_signer::NeonCallbackSigner;
use c2pa::dynamic_assertion::{AsyncDynamicAssertion, DynamicAssertionContent};
use cawg_identity::builder::AsyncCredentialHolder;
use cawg_identity::SignerPayload;
use neon::prelude::*;
use std::ops::Deref;
use std::sync::RwLock;

/// A `NeonIdentityAssertionBuilder` gathers the necessary components
/// for an identity assertion using a Neon-based credential holder.
pub struct NeonIdentityAssertionBuilder {
    credential_holder: RwLock<NeonCallbackSigner>,
    referenced_assertions: RwLock<Vec<String>>,
    roles: RwLock<Vec<String>>,
}

// Note: unwrap is used on read() and write() results, as poisoning only occurs as a result of a
// panic on another thread.
impl Clone for NeonIdentityAssertionBuilder {
    fn clone(&self) -> Self {
        Self {
            credential_holder: RwLock::new(self.credential_holder.read().unwrap().clone()),
            referenced_assertions: RwLock::new(self.referenced_assertions.read().unwrap().clone()),
            roles: RwLock::new(self.roles.read().unwrap().clone()),
        }
    }
}

impl NeonIdentityAssertionBuilder {
    /// Create a `NeonIdentityAssertionBuilder` for the given JS credential holder.
    pub fn for_credential_holder(mut cx: FunctionContext) -> JsResult<JsBox<Self>> {
        let credential_holder_handle = cx.argument::<JsBox<NeonCallbackSigner>>(0)?;
        let credential_holder_ref: &NeonCallbackSigner = credential_holder_handle.deref();
        Ok(cx.boxed(Self {
            credential_holder: RwLock::new(credential_holder_ref.clone()),
            referenced_assertions: RwLock::new(vec![]),
            roles: RwLock::new(vec![]),
        }))
    }

    /// Add assertion labels to consider as referenced assertions.
    pub fn add_referenced_assertions(mut cx: FunctionContext) -> JsResult<JsUndefined> {
        let js_array = cx.argument::<JsArray>(0)?;
        let this = cx.this::<JsBox<Self>>()?;
        let mut referenced_assertions = this.referenced_assertions.write().unwrap();
        let assertions: Vec<String> = js_array
            .to_vec(&mut cx)?
            .into_iter()
            .map(|value| {
                let js_string = value.downcast_or_throw::<JsString, _>(&mut cx)?;
                Ok(js_string.value(&mut cx))
            })
            .collect::<Result<_, neon::result::Throw>>()?;
        referenced_assertions.extend(assertions);
        Ok(cx.undefined())
    }

    /// Add roles to attach to the named actor for this identity assertion.
    pub fn add_roles(mut cx: FunctionContext) -> JsResult<JsUndefined> {
        let js_array = cx.argument::<JsArray>(0)?;
        let this = cx.this::<JsBox<Self>>()?;
        let mut roles = this.roles.write().unwrap();
        let new_roles: Vec<String> = js_array
            .to_vec(&mut cx)?
            .into_iter()
            .map(|value| {
                let js_string = value.downcast_or_throw::<JsString, _>(&mut cx)?;
                Ok(js_string.value(&mut cx))
            })
            .collect::<Result<_, neon::result::Throw>>()?;
        roles.extend(new_roles);
        Ok(cx.undefined())
    }
}

impl Finalize for NeonIdentityAssertionBuilder {}

#[async_trait::async_trait]
impl AsyncDynamicAssertion for NeonIdentityAssertionBuilder {
    fn label(&self) -> String {
        "cawg.identity".to_string()
    }

    fn reserve_size(&self) -> c2pa::Result<usize> {
        Ok(self.credential_holder.read().unwrap().reserve_size())
    }

    async fn content(
        &self,
        _label: &str,
        size: Option<usize>,
        claim: &c2pa::dynamic_assertion::PartialClaim,
    ) -> c2pa::Result<c2pa::dynamic_assertion::DynamicAssertionContent> {
        let referenced_assertions = claim
            .assertions()
            .filter(|a| {
                if a.url().contains("c2pa.assertions/c2pa.hash.") {
                    return true;
                }
                let label = if let Some((_, label)) = a.url().rsplit_once('/') {
                    label.to_string()
                } else {
                    a.url()
                };
                self.referenced_assertions.read().unwrap().contains(&label)
            })
            .cloned()
            .collect();

        let signer_payload = SignerPayload {
            referenced_assertions,
            sig_type: self
                .credential_holder
                .read()
                .unwrap()
                .sig_type()
                .to_string(),
            roles: self.roles.read().unwrap().clone(),
        };

        let credential_holder = self.credential_holder.read().unwrap().clone();
        let signature = credential_holder
            .sign(&signer_payload)
            .await
            .map_err(|e| c2pa::Error::OtherError(Box::new(e)))?;

        let mut assertion_cbor: Vec<u8> = vec![];
        ciborium::into_writer(&(signer_payload, signature), &mut assertion_cbor)
            .map_err(|e| c2pa::Error::BadParam(e.to_string()))?;

        if let Some(assertion_size) = size {
            if assertion_cbor.len() > assertion_size {
                return Err(c2pa::Error::BadParam(format!(
                    "Serialized assertion is {} bytes, which exceeds the planned size of {} bytes",
                    assertion_cbor.len(),
                    assertion_size
                )));
            }
        }

        Ok(DynamicAssertionContent::Cbor(assertion_cbor))
    }
}
