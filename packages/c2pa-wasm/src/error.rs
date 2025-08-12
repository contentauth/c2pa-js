use js_sys::Error as JsError;
use std::error::Error;

#[derive(thiserror::Error, Debug)]
pub enum WasmError {
    #[error(transparent)]
    C2pa(#[from] c2pa::Error),

    #[error(transparent)]
    Other(Box<dyn Error>),
}

impl WasmError {
    pub(crate) fn other(e: impl Error + 'static) -> Self {
        WasmError::Other(Box::new(e))
    }
}

impl From<WasmError> for JsError {
    fn from(value: WasmError) -> Self {
        JsError::new(&format!("{:?}", value))
    }
}
