// Copyright 2025 Adobe
// All Rights Reserved.
//
// NOTICE: Adobe permits you to use, modify, and distribute this file in
// accordance with the terms of the Adobe license agreement accompanying
// it.

use async_trait::async_trait;
use c2pa::identity::SignerPayload;
use c2pa::identity::builder::{AsyncCredentialHolder, IdentityBuilderError};
use js_sys::{Function as JsFunction, JsString, Number, Promise as JsPromise, Reflect, Uint8Array};
use serde::Serialize;
use serde_wasm_bindgen::Serializer;
use wasm_bindgen::JsValue;
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::JsFuture;

#[wasm_bindgen(typescript_custom_section)]
const SIGNER_PAYLOAD: &'static str = r#"
interface HashedUri {
    url: string;
    hash: Uint8Array<ArrayBuffer>;
    alg?: string;
}

interface SignerPayload {
    referencedAssertions: HashedUri[];
    sigType: string;
    roles: string[];
}
"#;

/// JS-facing camelCase mirror of `c2pa::HashedUri`.
///
/// This is deliberately *not* a verbatim serde port of `c2pa::HashedUri`
/// (which serializes with its own snake_case field names). We build this
/// shape explicitly so the JS credential-holder `sign` callback always sees
/// `{ url, hash, alg }`, matching the public `HashedUri` TS type and the
/// adobe-web/utilities `encodeSignerPayload` contract.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct JsHashedUri {
    url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    alg: Option<String>,
    #[serde(with = "serde_bytes")]
    hash: Vec<u8>,
}

/// JS-facing camelCase mirror of `c2pa::identity::SignerPayload`. See
/// [`JsHashedUri`] for why this isn't a verbatim serde port of the c2pa
/// type (whose fields serialize as `referenced_assertions`/`sig_type`/`role`).
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct JsSignerPayload {
    referenced_assertions: Vec<JsHashedUri>,
    sig_type: String,
    roles: Vec<String>,
}

impl From<&SignerPayload> for JsSignerPayload {
    fn from(payload: &SignerPayload) -> Self {
        JsSignerPayload {
            referenced_assertions: payload
                .referenced_assertions
                .iter()
                .map(|hashed_uri| JsHashedUri {
                    url: hashed_uri.url(),
                    alg: hashed_uri.alg(),
                    hash: hashed_uri.hash(),
                })
                .collect(),
            sig_type: payload.sig_type.clone(),
            roles: payload.roles.clone(),
        }
    }
}

/// `WasmCredentialHolder` allows JS to asynchronously sign a `SignerPayload`
/// on behalf of a CAWG credential holder. Mirrors `WasmSigner`'s JS-callback
/// marshaling and `NeonCallbackCredentialHolder`'s `sign` logic
/// (`packages/c2pa-node/src/neon_credential_holder.rs`).
#[derive(Debug, Clone)]
pub(crate) struct WasmCredentialHolder {
    sign_fn: JsFunction,
    reserve_size: f64,
    sig_type: String,
}

// NOTE: we can only return Err(JsString) or Err(JsValue) as error types here, because for some as-of-yet unknown
// reason, wasm-bindgen appears to mishandle JsErrors when created in a Firefox web worker.
//
// See: https://github.com/wasm-bindgen/wasm-bindgen/issues/4961

impl WasmCredentialHolder {
    /// Build a `WasmCredentialHolder` from a JS object with `sigType`,
    /// `reserveSize`, and `sign` fields (a subset of the identity-assertion
    /// definition object; see `WasmIdentityAssertionBuilder::from_definition`).
    pub(crate) fn from_definition(def: &JsValue) -> Result<Self, JsString> {
        let reserve_size: Number = Reflect::get(def, &"reserveSize".into())?.into();
        let sig_type: JsString = Reflect::get(def, &"sigType".into())?.into();
        let sign_fn: JsFunction = Reflect::get(def, &"sign".into())?.into();

        let sig_type = sig_type
            .as_string()
            .ok_or_else(|| JsString::from("identity assertion sigType must be a string"))?;

        Ok(WasmCredentialHolder {
            sign_fn,
            reserve_size: reserve_size.into(),
            sig_type,
        })
    }
}

#[cfg_attr(target_arch = "wasm32", async_trait(?Send))]
#[cfg_attr(not(target_arch = "wasm32"), async_trait)]
impl AsyncCredentialHolder for WasmCredentialHolder {
    fn sig_type(&self) -> &'static str {
        // This is safe because sig_type is stored as String and lives as long as self.
        // We leak the string to get a &'static str.
        Box::leak(self.sig_type.clone().into_boxed_str())
    }

    fn reserve_size(&self) -> usize {
        self.reserve_size as usize
    }

    async fn sign(&self, signer_payload: &SignerPayload) -> Result<Vec<u8>, IdentityBuilderError> {
        let js_payload = JsSignerPayload::from(signer_payload);
        let serializer = Serializer::new().serialize_maps_as_objects(true);
        let js_payload_value = js_payload
            .serialize(&serializer)
            .map_err(|err| IdentityBuilderError::SignerError(err.to_string()))?;

        let sign_promise: JsPromise = self
            .sign_fn
            .call1(&JsValue::undefined(), &js_payload_value)
            .map_err(|err| {
                IdentityBuilderError::SignerError(format!(
                    "Error calling credential holder sign: {err:?}"
                ))
            })?
            .dyn_into()
            .map_err(|err| {
                IdentityBuilderError::SignerError(format!(
                    "Failed to convert sign result to promise: {err:?}"
                ))
            })?;

        let sign_result: Uint8Array = JsFuture::from(sign_promise)
            .await
            .map_err(|err| {
                IdentityBuilderError::SignerError(format!(
                    "Error awaiting credential holder sign promise: {err:?}"
                ))
            })?
            .into();

        let mut signed_bytes = vec![0_u8; sign_result.length() as usize];
        sign_result.copy_to(&mut signed_bytes);

        Ok(signed_bytes)
    }
}
