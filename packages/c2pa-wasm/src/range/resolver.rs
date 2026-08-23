// Copyright 2025 Adobe
// All Rights Reserved.
//
// NOTICE: Adobe permits you to use, modify, and distribute this file in
// accordance with the terms of the Adobe license agreement accompanying
// it.

use async_trait::async_trait;
use c2pa::{asset_io::CAIRead, AsyncAssetResolver, Result};
use js_sys::Function;

use super::stream::{RangeSource, RangeStream};

/// A [`c2pa::AsyncAssetResolver`] that opens references as HTTP Range streams.
///
/// Each `open_async` returns a [`RangeStream`] that fetches only the bytes the SDK
/// reads. Any per-fetch reporting is forwarded to the optional `on_fetch` callback.
pub(crate) struct HttpRangeResolver {
    on_fetch: Option<Function>,
}

impl HttpRangeResolver {
    pub(crate) fn new(on_fetch: Option<Function>) -> Self {
        Self { on_fetch }
    }
}

#[async_trait(?Send)]
impl AsyncAssetResolver for HttpRangeResolver {
    async fn open_async(&self, reference: &str, _format: &str) -> Result<Box<dyn CAIRead>> {
        let stream =
            RangeStream::open(RangeSource::Url(reference.to_owned()), self.on_fetch.clone())
                .map_err(c2pa::Error::IoError)?;
        Ok(Box::new(stream))
    }
}
