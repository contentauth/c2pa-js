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

use std::collections::HashMap;
use std::sync::Arc;

use async_trait::async_trait;
use c2pa::{asset_io::CAIRead, AsyncAssetResolver, Error, Result};
use neon::prelude::*;

use super::stream::JsRangeStream;

/// A resolvable range source: its total size plus the JS `readRange` callback.
pub(crate) struct SourceEntry {
    pub size: u64,
    pub read_range: Arc<Root<JsFunction>>,
}

/// A [`c2pa::AsyncAssetResolver`] that opens references as JS-backed range streams.
///
/// Transport lives entirely in JavaScript: each source supplies a `readRange`
/// callback, keyed by reference (URL). No HTTP client is compiled into Rust.
pub(crate) struct HttpRangeResolver {
    channel: Channel,
    sources: Arc<HashMap<String, SourceEntry>>,
    on_fetch: Option<Arc<Root<JsFunction>>>,
}

impl HttpRangeResolver {
    pub(crate) fn new(
        channel: Channel,
        sources: Arc<HashMap<String, SourceEntry>>,
        on_fetch: Option<Arc<Root<JsFunction>>>,
    ) -> Self {
        Self {
            channel,
            sources,
            on_fetch,
        }
    }
}

#[async_trait]
impl AsyncAssetResolver for HttpRangeResolver {
    async fn open_async(&self, reference: &str, _format: &str) -> Result<Box<dyn CAIRead>> {
        let entry = self.sources.get(reference).ok_or_else(|| {
            Error::OtherError(format!("no range source registered for {reference}").into())
        })?;
        let stream = JsRangeStream::new(
            self.channel.clone(),
            entry.read_range.clone(),
            self.on_fetch.clone(),
            entry.size,
        );
        Ok(Box::new(stream))
    }
}
