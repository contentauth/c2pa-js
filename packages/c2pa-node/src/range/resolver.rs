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

use c2pa::{AssetRef, AssetRequest, AssetSourceError, RangeAssetSource};
use neon::prelude::*;

use super::stream::NodeRangeReader;

/// A resolvable range source: its total size plus the JS `readRange` callback.
pub(crate) struct SourceEntry {
    pub size: u64,
    pub read_range: Arc<Root<JsFunction>>,
}

/// Builds a [`RangeAssetSource`] that maps a URL reference to its registered JS
/// `readRange` callback. Transport lives entirely in JavaScript; no HTTP client is
/// compiled into Rust.
pub(crate) fn range_source(
    channel: Channel,
    sources: Arc<HashMap<String, SourceEntry>>,
    on_fetch: Option<Arc<Root<JsFunction>>>,
) -> RangeAssetSource<impl Fn(&AssetRequest<'_>) -> Result<NodeRangeReader, AssetSourceError>> {
    RangeAssetSource::new(move |request: &AssetRequest<'_>| {
        let url = match request.reference {
            AssetRef::Uri(u) | AssetRef::Opaque(u) => u,
            _ => return Err(AssetSourceError::UnsupportedReference),
        };
        let entry = sources.get(url).ok_or_else(|| AssetSourceError::NotFound {
            reference: url.to_owned(),
        })?;
        Ok(NodeRangeReader::new(
            channel.clone(),
            entry.read_range.clone(),
            on_fetch.clone(),
            entry.size,
        ))
    })
}
