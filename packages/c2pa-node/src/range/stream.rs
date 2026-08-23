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

use std::io::{Error as IoError, Result as IoResult};
use std::sync::{mpsc, Arc};

use c2pa::{AssetSourceError, RangeInfo, SyncRangeReader};
use neon::prelude::*;
use neon::types::buffer::TypedArray;

/// A random-access byte source whose bytes come from a JavaScript
/// `readRange(offset, length) => Promise<Buffer>` callback. The SDK layers its
/// window cache over this; only the transport lives here.
///
/// c2pa-rs reads assets synchronously, so each `read_range` blocks the current
/// (Tokio worker) thread while the Node event loop resolves the callback's
/// promise. This is safe because the reader runs on a Tokio worker, never on the
/// JS main thread.
pub(crate) struct NodeRangeReader {
    channel: Channel,
    read_range: Arc<Root<JsFunction>>,
    on_fetch: Option<Arc<Root<JsFunction>>>,
    total: u64,
}

impl NodeRangeReader {
    pub(crate) fn new(
        channel: Channel,
        read_range: Arc<Root<JsFunction>>,
        on_fetch: Option<Arc<Root<JsFunction>>>,
        total: u64,
    ) -> Self {
        Self {
            channel,
            read_range,
            on_fetch,
            total,
        }
    }

    /// Invoke the JS `readRange` callback and block for its resolved bytes.
    fn fetch(&self, offset: u64, len: u64) -> IoResult<Vec<u8>> {
        let (tx, rx) = mpsc::channel();
        let cb = self.read_range.clone();

        self.channel.send(move |mut cx| {
            let read_range = cb.to_inner(&mut cx);
            let future = read_range
                .call_with(&cx)
                .arg(cx.number(offset as f64))
                .arg(cx.number(len as f64))
                .apply::<JsPromise, _>(&mut cx)?
                .to_future(&mut cx, |mut cx, result| match result {
                    Ok(value) => {
                        let buffer = value.downcast_or_throw::<JsBuffer, _>(&mut cx)?;
                        Ok(Ok(buffer.as_slice(&cx).to_vec()))
                    }
                    Err(err) => {
                        let message = err
                            .to_string(&mut cx)
                            .map(|s| s.value(&mut cx))
                            .unwrap_or_else(|_| "readRange callback rejected".to_owned());
                        Ok(Err(message))
                    }
                })?;
            let _ = tx.send(future);
            Ok(())
        });

        let future = rx
            .recv()
            .map_err(|e| IoError::other(format!("range bridge closed: {e}")))?;
        futures::executor::block_on(future)
            .map_err(|e| IoError::other(format!("readRange await failed: {e}")))?
            .map_err(IoError::other)
    }

    fn report(&self, offset: u64, length: u64) {
        let Some(cb) = self.on_fetch.clone() else {
            return;
        };
        let total = self.total;
        self.channel.send(move |mut cx| {
            let on_fetch = cb.to_inner(&mut cx);
            let _ = on_fetch
                .call_with(&cx)
                .arg(cx.number(offset as f64))
                .arg(cx.number(length as f64))
                .arg(cx.number(total as f64))
                .apply::<JsValue, _>(&mut cx);
            Ok(())
        });
    }
}

impl SyncRangeReader for NodeRangeReader {
    fn info(&self) -> Result<RangeInfo, AssetSourceError> {
        Ok(RangeInfo::new(self.total))
    }

    fn read_range(&self, offset: u64, len: u64) -> Result<Vec<u8>, AssetSourceError> {
        if len == 0 {
            return Ok(Vec::new());
        }
        let bytes = self.fetch(offset, len).map_err(AssetSourceError::Io)?;
        self.report(offset, bytes.len() as u64);
        Ok(bytes)
    }
}
