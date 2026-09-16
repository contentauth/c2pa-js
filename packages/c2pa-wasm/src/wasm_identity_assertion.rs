// Copyright 2025 Adobe
// All Rights Reserved.
//
// NOTICE: Adobe permits you to use, modify, and distribute this file in
// accordance with the terms of the Adobe license agreement accompanying
// it.

use async_trait::async_trait;
use c2pa::dynamic_assertion::{AsyncDynamicAssertion, DynamicAssertionContent, PartialClaim};
use c2pa::identity::SignerPayload;
use c2pa::identity::builder::AsyncCredentialHolder;
use c2pa::{AsyncSigner, SigningAlg};
use js_sys::{Array as JsArray, JsString, Reflect};
use serde::{Deserialize, Serialize};
use serde_bytes::ByteBuf;
use wasm_bindgen::prelude::*;

use crate::wasm_credential_holder::WasmCredentialHolder;
use crate::wasm_signer::WasmSigner;

#[wasm_bindgen(typescript_custom_section)]
const IDENTITY_ASSERTION_DEFINITION: &'static str = r#"
interface IdentityAssertionDefinition {
    sigType: string;
    reserveSize: number;
    referencedAssertions: string[];
    roles: string[];
    sign: (payload: SignerPayload) => Promise<Uint8Array<ArrayBuffer>>;
}
"#;

/// `WasmIdentityAssertionBuilder` gathers together the necessary components
/// for a CAWG identity assertion (`cawg.identity`). Mirrors
/// `NeonIdentityAssertionBuilder`
/// (`packages/c2pa-node/src/neon_identity_assertion_builder.rs`); the
/// `content()` logic and `finalize_identity_assertion`/`IdentityAssertion`
/// below are ported verbatim since they are runtime-agnostic.
#[derive(Clone)]
pub(crate) struct WasmIdentityAssertionBuilder {
    credential_holder: WasmCredentialHolder,
    referenced_assertions: Vec<String>,
    roles: Vec<String>,
}

#[derive(Deserialize, Serialize)]
struct IdentityAssertion {
    signer_payload: SignerPayload,

    #[serde(with = "serde_bytes")]
    signature: Vec<u8>,

    #[serde(with = "serde_bytes")]
    pad1: Vec<u8>,

    // Must use explicit ByteBuf here because #[serde(with = "serde_bytes")]
    // does not work with Option<Vec<u8>>.
    #[serde(skip_serializing_if = "Option::is_none")]
    pad2: Option<ByteBuf>,

    // Label for the assertion. Only assigned when reading from a manifest.
    #[allow(dead_code)]
    #[serde(skip)]
    label: Option<String>,
}

impl WasmIdentityAssertionBuilder {
    /// Build a `WasmIdentityAssertionBuilder` from a single entry of the
    /// `identity_assertions` array passed to `WasmBuilder::sign`/
    /// `sign_and_get_manifest_bytes`: a JS object with `sigType`,
    /// `reserveSize`, `sign` (consumed by the inner `WasmCredentialHolder`),
    /// plus `referencedAssertions` and `roles`.
    pub(crate) fn from_definition(def: &JsValue) -> Result<Self, JsString> {
        let credential_holder = WasmCredentialHolder::from_definition(def)?;

        let referenced_assertions =
            js_string_array(&Reflect::get(def, &"referencedAssertions".into())?)?;
        let roles = js_string_array(&Reflect::get(def, &"roles".into())?)?;

        Ok(Self {
            credential_holder,
            referenced_assertions,
            roles,
        })
    }
}

fn js_string_array(value: &JsValue) -> Result<Vec<String>, JsString> {
    if value.is_undefined() || value.is_null() {
        return Ok(Vec::new());
    }

    let array: JsArray = value
        .clone()
        .dyn_into()
        .map_err(|err| JsString::from(format!("expected an array of strings: {err:?}")))?;

    array
        .iter()
        .map(|value| {
            value
                .as_string()
                .ok_or_else(|| JsString::from("expected array element to be a string"))
        })
        .collect()
}

#[cfg_attr(target_arch = "wasm32", async_trait(?Send))]
#[cfg_attr(not(target_arch = "wasm32"), async_trait)]
impl AsyncDynamicAssertion for WasmIdentityAssertionBuilder {
    fn label(&self) -> String {
        "cawg.identity".to_string()
    }

    fn reserve_size(&self) -> c2pa::Result<usize> {
        Ok(self.credential_holder.reserve_size())
    }

    async fn content(
        &self,
        _label: &str,
        size: Option<usize>,
        claim: &PartialClaim,
    ) -> c2pa::Result<DynamicAssertionContent> {
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
                self.referenced_assertions.contains(&label)
            })
            .cloned()
            .collect();

        let signer_payload = SignerPayload {
            referenced_assertions,
            sig_type: self.credential_holder.sig_type().to_string(),
            roles: self.roles.clone(),
        };

        let signature = self
            .credential_holder
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
    c2pa_cbor::to_writer(&mut assertion_cbor, &ia)
        .map_err(|e| c2pa::Error::BadParam(e.to_string()))?;
    // TO DO: Think through how errors map into crate::Error.

    if let Some(assertion_size) = size {
        if assertion_cbor.len() > assertion_size {
            return Err(c2pa::Error::BadParam(format!(
                "Serialized assertion is {len} bytes, which exceeds the planned size of {assertion_size} bytes",
                len = assertion_cbor.len()
            )));
        }

        ia.pad1 = vec![0u8; assertion_size - assertion_cbor.len() - 15];

        assertion_cbor.clear();
        c2pa_cbor::to_writer(&mut assertion_cbor, &ia)
            .map_err(|e| c2pa::Error::BadParam(e.to_string()))?;

        ia.pad2 = Some(ByteBuf::from(vec![
            0u8;
            assertion_size - assertion_cbor.len() - 6
        ]));

        assertion_cbor.clear();
        c2pa_cbor::to_writer(&mut assertion_cbor, &ia)
            .map_err(|e| c2pa::Error::BadParam(e.to_string()))?;
        assert_eq!(assertion_size, assertion_cbor.len());
    }

    Ok(DynamicAssertionContent::Cbor(assertion_cbor))
}

/// `WasmIdentityAssertionSigner` wraps a `WasmSigner` plus zero or more
/// `WasmIdentityAssertionBuilder`s, delegating all `AsyncSigner` methods to
/// the inner signer and returning the identity-assertion builders from
/// `dynamic_assertions()`. Mirrors `NeonIdentityAssertionSigner`
/// (`packages/c2pa-node/src/neon_identity_assertion_signer.rs`). Unlike the
/// Neon signer, this does not implement `AsyncRawSigner`/
/// `AsyncTimeStampProvider`: `WasmSigner` uses `direct_cose_handling()` and
/// has no raw-signer/timestamp path to delegate to.
pub(crate) struct WasmIdentityAssertionSigner {
    signer: WasmSigner,
    identity_assertions: Vec<WasmIdentityAssertionBuilder>,
}

impl WasmIdentityAssertionSigner {
    pub(crate) fn new(
        signer: WasmSigner,
        identity_assertions: Vec<WasmIdentityAssertionBuilder>,
    ) -> Self {
        Self {
            signer,
            identity_assertions,
        }
    }
}

#[cfg_attr(target_arch = "wasm32", async_trait(?Send))]
#[cfg_attr(not(target_arch = "wasm32"), async_trait)]
impl AsyncSigner for WasmIdentityAssertionSigner {
    async fn sign(&self, data: Vec<u8>) -> c2pa::Result<Vec<u8>> {
        AsyncSigner::sign(&self.signer, data).await
    }

    fn alg(&self) -> SigningAlg {
        AsyncSigner::alg(&self.signer)
    }

    fn certs(&self) -> c2pa::Result<Vec<Vec<u8>>> {
        AsyncSigner::certs(&self.signer)
    }

    fn reserve_size(&self) -> usize {
        AsyncSigner::reserve_size(&self.signer)
    }

    fn direct_cose_handling(&self) -> bool {
        AsyncSigner::direct_cose_handling(&self.signer)
    }

    fn dynamic_assertions(&self) -> Vec<Box<dyn AsyncDynamicAssertion>> {
        self.identity_assertions
            .iter()
            .cloned()
            .map(|ia| Box::new(ia) as Box<dyn AsyncDynamicAssertion>)
            .collect()
    }
}

/// Parse the `identity_assertions` array argument (see `WasmBuilder::sign`)
/// into a list of `WasmIdentityAssertionBuilder`s. Returns an empty `Vec`
/// when `value` is `undefined`/`null`, so the plain-signer path is unchanged
/// when no identity assertions are requested.
pub(crate) fn parse_identity_assertions(
    value: &JsValue,
) -> Result<Vec<WasmIdentityAssertionBuilder>, JsString> {
    if value.is_undefined() || value.is_null() {
        return Ok(Vec::new());
    }

    let array: JsArray = value
        .clone()
        .dyn_into()
        .map_err(|err| JsString::from(format!("identityAssertions must be an array: {err:?}")))?;

    array
        .iter()
        .map(|entry| WasmIdentityAssertionBuilder::from_definition(&entry))
        .collect()
}
