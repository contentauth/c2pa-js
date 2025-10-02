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

use crate::neon_credential_holder::NeonCallbackCredentialHolder;
use c2pa::{
    dynamic_assertion::{AsyncDynamicAssertion, DynamicAssertionContent},
    identity::{builder::AsyncCredentialHolder, SignerPayload},
};
use neon::prelude::*;
use serde::{Deserialize, Serialize};
use serde_bytes::ByteBuf;
use std::ops::Deref;
use std::sync::RwLock;

/// A `NeonIdentityAssertionBuilder` gathers the necessary components
/// for an identity assertion using a Neon-based credential holder.
pub struct NeonIdentityAssertionBuilder {
    credential_holder: RwLock<NeonCallbackCredentialHolder>,
    referenced_assertions: RwLock<Vec<String>>,
    roles: RwLock<Vec<String>>,
}

#[derive(Deserialize, Serialize)]
pub struct IdentityAssertion {
    pub(crate) signer_payload: SignerPayload,

    #[serde(with = "serde_bytes")]
    pub(crate) signature: Vec<u8>,

    #[serde(with = "serde_bytes")]
    pub(crate) pad1: Vec<u8>,

    // Must use explicit ByteBuf here because #[serde(with = "serde_bytes")]
    // does not work with Option<Vec<u8>>.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) pad2: Option<ByteBuf>,

    // Label for the assertion. Only assigned when reading from a manifest.
    #[serde(skip)]
    pub(crate) label: Option<String>,
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
        let credential_holder_handle = cx.argument::<JsBox<NeonCallbackCredentialHolder>>(0)?;
        let credential_holder_ref: &NeonCallbackCredentialHolder = credential_holder_handle.deref();
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
                // Always include hash data assertions
                if a.url().contains("c2pa.assertions/c2pa.hash.") {
                    return true;
                }
                // Otherwise include if user-added label matches
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

        finalize_identity_assertion(signer_payload, size, signature)
    }
}

fn finalize_identity_assertion(
    signer_payload: SignerPayload,
    size: Option<usize>,
    signature: Vec<u8>,
) -> c2pa::Result<DynamicAssertionContent> {
    let mut ia = IdentityAssertion {
        signer_payload,
        signature,
        pad1: vec![],
        pad2: None,
        label: None,
    };

    let mut assertion_cbor: Vec<u8> = vec![];
    ciborium::into_writer(&ia, &mut assertion_cbor)
        .map_err(|e| c2pa::Error::BadParam(e.to_string()))?;
    // TO DO: Think through how errors map into crate::Error.

    if let Some(assertion_size) = size {
        if assertion_cbor.len() > assertion_size {
            return Err(c2pa::Error::BadParam(format!("Serialized assertion is {len} bytes, which exceeds the planned size of {assertion_size} bytes", len = assertion_cbor.len())));
        }

        ia.pad1 = vec![0u8; assertion_size - assertion_cbor.len() - 15];

        assertion_cbor.clear();
        ciborium::into_writer(&ia, &mut assertion_cbor)
            .map_err(|e| c2pa::Error::BadParam(e.to_string()))?;

        ia.pad2 = Some(ByteBuf::from(vec![
            0u8;
            assertion_size - assertion_cbor.len() - 6
        ]));

        assertion_cbor.clear();
        ciborium::into_writer(&ia, &mut assertion_cbor)
            .map_err(|e| c2pa::Error::BadParam(e.to_string()))?;
        assert_eq!(assertion_size, assertion_cbor.len());
    }

    Ok(DynamicAssertionContent::Cbor(assertion_cbor))
}
