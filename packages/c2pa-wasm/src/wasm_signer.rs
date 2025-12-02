// Copyright 2025 Adobe
// All Rights Reserved.
//
// NOTICE: Adobe permits you to use, modify, and distribute this file in
// accordance with the terms of the Adobe license agreement accompanying
// it.

use async_trait::async_trait;
use base64::Engine as _;
use c2pa::crypto::time_stamp::default_rfc3161_message;
use c2pa::SigningAlg;
use c2pa::{AsyncSigner, Result as C2paResult};
use js_sys::{
    Array, ArrayBuffer, Error as JsError, Function as JsFunction, JsString, Number,
    Promise as JsPromise, Reflect, Uint8Array,
};
use wasm_bindgen::prelude::*;
use wasm_bindgen::{JsCast, JsValue};
use wasm_bindgen_futures::JsFuture;

#[wasm_bindgen(typescript_custom_section)]
const SIGNER_DEFINITION: &'static str = r#"
interface SignerDefinition {
    sign: (bytes: Uint8Array<ArrayBuffer>) => Promise<Uint8Array<ArrayBuffer>>;
    reserveSize: number;
    alg: string;
    certs?: Array<Uint8Array<ArrayBuffer> | string>;
    directCoseHandling?: boolean;
    tsaUrl?: string;
    tsaHeaders?: Array<[string, string]>;
    tsaBody?: Uint8Array<ArrayBuffer> | string;
}
"#;

#[wasm_bindgen]
extern "C" {
    /// Contains the configuration and necessary callbacks for signing.
    #[wasm_bindgen(typescript_type = "SignerDefinition")]
    pub type SignerDefinition;
}

#[derive(Debug)]
#[wasm_bindgen]
pub(crate) struct WasmSigner {
    sign_fn: JsFunction,
    reserve_size: f64,
    signing_alg: SigningAlg,
    cert_chain: Vec<Vec<u8>>,
    direct_cose_handling: bool,
    tsa_url: Option<String>,
    tsa_headers: Vec<(String, String)>,
    tsa_body: Option<Vec<u8>>,
}

#[wasm_bindgen]
impl WasmSigner {
    /// Attempt to create a new [`WasmSigner`] from a SignerDefinition.
    #[wasm_bindgen(js_name = fromDefinition)]
    pub fn from_definition(def: &SignerDefinition) -> Result<Self, JsError> {
        let js_value: JsValue = def.into();

        let reserve_size_result: Number = Reflect::get(&js_value, &"reserveSize".into())?.into();

        let alg_result: JsString = Reflect::get(&js_value, &"alg".into())?.into();

        let signing_alg: SigningAlg = match alg_result.as_string() {
            Some(alg) => match alg.as_str().parse() {
                Ok(alg) => alg,
                Err(_) => SigningAlg::Ps256,
            },
            None => SigningAlg::Ps256,
        };

        let sign_fn: JsFunction = Reflect::get(&js_value, &"sign".into())?.into();
        let certs_value = Reflect::get(&js_value, &"certs".into())?;
        let cert_chain = parse_cert_chain(certs_value)?;

        let direct_cose_value = Reflect::get(&js_value, &"directCoseHandling".into())?;
        let direct_cose_handling = direct_cose_value.as_bool().unwrap_or(false);

        let tsa_url_value = Reflect::get(&js_value, &"tsaUrl".into())?;
        let tsa_url = parse_optional_string(tsa_url_value)?;

        let tsa_headers_value = Reflect::get(&js_value, &"tsaHeaders".into())?;
        let tsa_headers = parse_tsa_headers(tsa_headers_value)?;

        let tsa_body_value = Reflect::get(&js_value, &"tsaBody".into())?;
        let tsa_body = parse_optional_body(tsa_body_value)?;

        Ok(WasmSigner {
            reserve_size: reserve_size_result.into(),
            signing_alg,
            sign_fn,
            cert_chain,
            direct_cose_handling,
            tsa_url,
            tsa_headers,
            tsa_body,
        })
    }
}

#[async_trait(?Send)]
impl AsyncSigner for WasmSigner {
    async fn sign(&self, data: Vec<u8>) -> C2paResult<Vec<u8>> {
        let len: u32 = data.len().try_into().unwrap();
        let to_be_signed = Uint8Array::new_with_length(len);
        to_be_signed.copy_from(&data);

        let sign_promise: JsPromise = self
            .sign_fn
            .call1(&JsValue::undefined(), &to_be_signed)
            .map_err(|err| c2pa::Error::BadParam(format!("Error calling signer: {:?}", err)))?
            .dyn_into()
            .map_err(|err| {
                c2pa::Error::BadParam(format!(
                    "Failed to convert sign result to promise: {:?}",
                    err
                ))
            })?;

        let sign_result: Uint8Array = JsFuture::from(sign_promise)
            .await
            .map_err(|err| {
                c2pa::Error::BadParam(format!("Error awaiting sign promise: {:?}", err))
            })?
            .into();

        let mut signed_bytes = vec![0_u8; sign_result.length() as usize];
        sign_result.copy_to(&mut signed_bytes);

        Ok(signed_bytes)
    }

    fn alg(&self) -> SigningAlg {
        self.signing_alg
    }

    fn certs(&self) -> C2paResult<Vec<Vec<u8>>> {
        Ok(self.cert_chain.clone())
    }

    fn reserve_size(&self) -> usize {
        self.reserve_size as usize
    }

    fn direct_cose_handling(&self) -> bool {
        self.direct_cose_handling
    }

    fn time_authority_url(&self) -> Option<String> {
        self.tsa_url.clone()
    }

    fn timestamp_request_headers(&self) -> Option<Vec<(String, String)>> {
        if self.tsa_headers.is_empty() {
            None
        } else {
            Some(self.tsa_headers.clone())
        }
    }

    fn timestamp_request_body(&self, message: &[u8]) -> C2paResult<Vec<u8>> {
        if let Some(body) = &self.tsa_body {
            return Ok(body.clone());
        }

        default_rfc3161_message(message).map_err(|err| err.into())
    }
}

fn parse_cert_chain(value: JsValue) -> Result<Vec<Vec<u8>>, JsError> {
    if value.is_undefined() || value.is_null() {
        return Ok(Vec::new());
    }

    if !Array::is_array(&value) {
        return Err(JsError::new(
            "SignerDefinition.certs must be an array of PEM strings or binary buffers",
        ));
    }

    let array = Array::from(&value);
    let mut certs: Vec<Vec<u8>> = Vec::with_capacity(array.length() as usize);

    for (index, entry) in array.iter().enumerate() {
        certs.extend(parse_cert_entry(entry, index)?);
    }

    Ok(certs)
}

fn parse_cert_entry(value: JsValue, index: usize) -> Result<Vec<Vec<u8>>, JsError> {
    if let Some(pem) = value.as_string() {
        return decode_pem_or_base64(&pem).map_err(|message| {
            JsError::new(&format!("Failed to decode certificate at index {index}: {message}"))
        });
    }

    if value.is_instance_of::<Uint8Array>() {
        let bytes: Uint8Array = value.unchecked_into();
        return decode_cert_from_bytes(bytes.to_vec(), index);
    }

    if value.is_instance_of::<ArrayBuffer>() {
        let buffer: ArrayBuffer = value.unchecked_into();
        let bytes = Uint8Array::new(&buffer);
        return decode_cert_from_bytes(bytes.to_vec(), index);
    }

    if ArrayBuffer::is_view(&value) {
        let view = Uint8Array::new(&value);
        return decode_cert_from_bytes(view.to_vec(), index);
    }

    Err(JsError::new(&format!(
        "Unsupported certificate value at index {index}; expected a PEM string or ArrayBuffer",
    )))
}

fn parse_optional_string(value: JsValue) -> Result<Option<String>, JsError> {
    if value.is_undefined() || value.is_null() {
        return Ok(None);
    }

    value
        .as_string()
        .map(Some)
        .ok_or_else(|| JsError::new("SignerDefinition.tsaUrl must be a string"))
}

fn parse_tsa_headers(value: JsValue) -> Result<Vec<(String, String)>, JsError> {
    if value.is_undefined() || value.is_null() {
        return Ok(Vec::new());
    }

    if !Array::is_array(&value) {
        return Err(JsError::new(
            "SignerDefinition.tsaHeaders must be an array of [key, value] tuples",
        ));
    }

    let headers_array = Array::from(&value);
    let mut headers: Vec<(String, String)> = Vec::with_capacity(headers_array.length() as usize);

    for (index, entry) in headers_array.iter().enumerate() {
        if !Array::is_array(&entry) {
            return Err(JsError::new(&format!(
                "SignerDefinition.tsaHeaders[{index}] must be an array with [key, value]",
            )));
        }

        let tuple = Array::from(&entry);
        if tuple.length() < 2 {
            return Err(JsError::new(&format!(
                "SignerDefinition.tsaHeaders[{index}] must contain at least two elements",
            )));
        }

        let key = tuple
            .get(0)
            .as_string()
            .ok_or_else(|| JsError::new(&format!(
                "SignerDefinition.tsaHeaders[{index}][0] must be a string",
            )))?;

        let value = tuple
            .get(1)
            .as_string()
            .ok_or_else(|| JsError::new(&format!(
                "SignerDefinition.tsaHeaders[{index}][1] must be a string",
            )))?;

        headers.push((key, value));
    }

    Ok(headers)
}

fn parse_optional_body(value: JsValue) -> Result<Option<Vec<u8>>, JsError> {
    if value.is_undefined() || value.is_null() {
        return Ok(None);
    }

    if let Some(body) = value.as_string() {
        return Ok(Some(body.into_bytes()));
    }

    if value.is_instance_of::<Uint8Array>() {
        let bytes: Uint8Array = value.unchecked_into();
        return Ok(Some(bytes.to_vec()));
    }

    if value.is_instance_of::<ArrayBuffer>() {
        let buffer: ArrayBuffer = value.unchecked_into();
        let bytes = Uint8Array::new(&buffer);
        return Ok(Some(bytes.to_vec()));
    }

    if ArrayBuffer::is_view(&value) {
        let view = Uint8Array::new(&value);
        return Ok(Some(view.to_vec()));
    }

    Err(JsError::new(
        "SignerDefinition.tsaBody must be a string or ArrayBuffer",
    ))
}

fn decode_cert_from_bytes(bytes: Vec<u8>, index: usize) -> Result<Vec<Vec<u8>>, JsError> {
    match std::str::from_utf8(&bytes) {
        Ok(text) => decode_pem_or_base64(text).map_err(|message| {
            JsError::new(&format!(
                "Failed to decode certificate at index {index}: {message}",
            ))
        }),
        Err(_) => Ok(vec![bytes]),
    }
}

fn decode_pem_or_base64(pem: &str) -> Result<Vec<Vec<u8>>, String> {
    let trimmed = pem.trim();
    if trimmed.is_empty() {
        return Err("certificate string is empty".into());
    }

    if trimmed.starts_with("-----BEGIN") {
        match pem::parse_many(trimmed) {
            Ok(mut pems) if !pems.is_empty() => {
                Ok(pems
                    .drain(..)
                    .map(|pem_entry| pem_entry.into_contents())
                    .collect())
            }
            Ok(_) => Err("certificate string contained no PEM entries".into()),
            Err(err) => Err(format!("failed to parse PEM certificate data: {err}")),
        }
    } else {
        let sanitized: String = trimmed.chars().filter(|c| !c.is_whitespace()).collect();

        if sanitized.is_empty() {
            return Err("certificate string contained no base64 data".into());
        }

        base64::engine::general_purpose::STANDARD
            .decode(sanitized.as_bytes())
            .map(|bytes| vec![bytes])
            .map_err(|err| format!("failed to decode base64 certificate data: {err}"))
    }
}
