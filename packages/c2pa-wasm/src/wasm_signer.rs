// Copyright 2025 Adobe
// All Rights Reserved.
//
// NOTICE: Adobe permits you to use, modify, and distribute this file in
// accordance with the terms of the Adobe license agreement accompanying
// it.

use async_trait::async_trait;
use c2pa::SigningAlg;
use c2pa::{AsyncSigner, Result as C2paResult};
use js_sys::{
    Error as JsError, Function as JsFunction, JsString, Number, Promise as JsPromise, Reflect,
    Uint8Array,
};
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::JsFuture;

#[wasm_bindgen(typescript_custom_section)]
const SIGNER_DEFINITION: &'static str = r#"
interface SignerDefinition {
    sign: (bytes: Uint8Array<ArrayBuffer>) => Promise<Uint8Array<ArrayBuffer>>;
    reserveSize: number;
    alg: string;
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

        Ok(WasmSigner {
            reserve_size: reserve_size_result.into(),
            signing_alg,
            sign_fn,
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
        // @TODO: make configurable
        Ok(Vec::new())
    }

    fn reserve_size(&self) -> usize {
        self.reserve_size as usize
    }

    fn direct_cose_handling(&self) -> bool {
        // @TODO: make configurable
        true
    }
}
