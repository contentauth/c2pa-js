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
use std::num::NonZeroU64;
use std::sync::{mpsc, Arc};

use c2pa::asset_transport::{
    http_range::RangeResponse, AssetTransportError, ObjectVersion, RangeChunk, RangeInfo,
    SyncRangeTransport,
};
use neon::prelude::*;
use neon::types::buffer::TypedArray;

/// One resolved `readRange` result.
///
/// `offset` and `version` are what the callback reported about the response, and are
/// `None` when it reported nothing.
enum FetchedRange {
    /// Bytes the callback has already placed: bare bytes, or `{ bytes, offset?,
    /// version? }`. The callback applied whatever HTTP rules it chose.
    Placed {
        bytes: Vec<u8>,
        offset: Option<u64>,
        version: Option<String>,
    },
    /// A raw response, `{ bytes, status, headers }`. The SDK applies the range
    /// contract to it, so a callback does not reimplement the RFC 9110 rules.
    Raw(Box<RangeResponse>),
}

/// A random-access byte source whose bytes come from a JavaScript
/// `readRange(offset, length)` callback. The SDK layers its window cache over
/// this. Only the transport lives here.
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
    /// The URL this reader serves, named in an error a raw response fails.
    reference: String,
}

impl NodeRangeReader {
    pub(crate) fn new(
        channel: Channel,
        read_range: Arc<Root<JsFunction>>,
        on_fetch: Option<Arc<Root<JsFunction>>>,
        total: u64,
        reference: String,
    ) -> Self {
        Self {
            channel,
            read_range,
            on_fetch,
            total,
            reference,
        }
    }

    /// Invoke the JS `readRange` callback and block for what it resolves.
    ///
    /// The callback may resolve bare bytes; `{ bytes, offset?, version? }` when it can
    /// report what the origin served, where `offset` is the position `Content-Range`
    /// gave; or `{ bytes, status, headers }`, which hands the raw response to the SDK
    /// so the callback applies no HTTP rules of its own.
    fn fetch(&self, offset: u64, len: u64) -> IoResult<FetchedRange> {
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
                        // Bare bytes keep older callbacks working.
                        if let Ok(buffer) = value.downcast::<JsBuffer, _>(&mut cx) {
                            return Ok(Ok(FetchedRange::Placed {
                                bytes: buffer.as_slice(&cx).to_vec(),
                                offset: None,
                                version: None,
                            }));
                        }
                        let object = value.downcast_or_throw::<JsObject, _>(&mut cx)?;
                        let bytes = object
                            .get::<JsBuffer, _, _>(&mut cx, "bytes")?
                            .as_slice(&cx)
                            .to_vec();
                        let offset = object
                            .get_opt::<JsNumber, _, _>(&mut cx, "offset")?
                            .map(|n| n.value(&mut cx) as u64);
                        let version = object
                            .get_opt::<JsString, _, _>(&mut cx, "version")?
                            .map(|s| s.value(&mut cx));
                        let status = object
                            .get_opt::<JsNumber, _, _>(&mut cx, "status")?
                            .map(|n| n.value(&mut cx) as u16);

                        let Some(status) = status else {
                            return Ok(Ok(FetchedRange::Placed {
                                bytes,
                                offset,
                                version,
                            }));
                        };
                        // `status` says the callback handed back a raw response, so the
                        // SDK derives placement and version. A response that also
                        // carries them was placed by two owners at once.
                        if offset.is_some() || version.is_some() {
                            return Ok(Err(
                                "readRange resolved an object with `status` as well as \
                                 `offset` or `version`: return a raw response or a placed \
                                 one, not both"
                                    .to_owned(),
                            ));
                        }
                        let header = |cx: &mut _, name: &str| -> NeonResult<Option<String>> {
                            let headers = object.get_opt::<JsObject, _, _>(cx, "headers")?;
                            let Some(headers) = headers else {
                                return Ok(None);
                            };
                            Ok(headers
                                .get_opt::<JsString, _, _>(cx, name)?
                                .map(|s| s.value(cx)))
                        };
                        Ok(Ok(FetchedRange::Raw(Box::new(RangeResponse {
                            status,
                            content_range: header(&mut cx, "content-range")?,
                            etag: header(&mut cx, "etag")?,
                            last_modified: header(&mut cx, "last-modified")?,
                            content_encoding: header(&mut cx, "content-encoding")?,
                            body: bytes,
                        }))))
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

impl SyncRangeTransport for NodeRangeReader {
    fn info(&self) -> Result<RangeInfo, AssetTransportError> {
        Ok(RangeInfo::new(self.total))
    }

    fn read_range(
        &self,
        offset: u64,
        len: u64,
        _expect: Option<&ObjectVersion>,
    ) -> Result<RangeChunk, AssetTransportError> {
        if len == 0 {
            return Ok(RangeChunk::new(offset, Vec::new()));
        }
        let fetched = self.fetch(offset, len).map_err(AssetTransportError::Io)?;
        let chunk = match fetched {
            FetchedRange::Placed {
                bytes,
                offset: served,
                version,
            } => {
                // A callback reporting no offset falls back to the requested one.
                let chunk = RangeChunk::new(served.unwrap_or(offset), bytes);
                match version {
                    Some(version) => chunk.with_version(version),
                    None => chunk,
                }
            }
            FetchedRange::Raw(resp) => {
                let Some(len) = NonZeroU64::new(len) else {
                    return Ok(RangeChunk::new(offset, Vec::new()));
                };
                resp.into_chunk(&self.reference, (offset, len), Some(self.total), _expect)?
            }
        };
        self.report(offset, chunk.bytes.len() as u64);
        Ok(chunk)
    }
}
