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

use std::io::{Error as IoError, Read, Result as IoResult, Seek, SeekFrom};
use std::sync::{mpsc, Arc};

use neon::prelude::*;
use neon::types::buffer::TypedArray;

/// Bytes fetched ahead per network read to amortize the JS round-trip.
const WINDOW_BYTES: u64 = 64 * 1024;

/// A `Read + Seek` stream whose bytes come from a JavaScript
/// `readRange(offset, length) => Promise<Buffer>` callback.
///
/// c2pa-rs reads assets synchronously, so each `read` blocks the current (Tokio
/// worker) thread while the Node event loop resolves the callback's promise. This
/// is safe because the reader runs on a Tokio worker, never on the JS main thread.
pub(crate) struct JsRangeStream {
    channel: Channel,
    read_range: Arc<Root<JsFunction>>,
    on_fetch: Option<Arc<Root<JsFunction>>>,
    total: u64,
    offset: u64,
    // Cached window covering [win_start, win_start + data.len()).
    win_start: u64,
    data: Vec<u8>,
}

impl JsRangeStream {
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
            offset: 0,
            win_start: 0,
            data: Vec::new(),
        }
    }

    fn cache_has(&self, start: u64, len: usize) -> bool {
        start >= self.win_start
            && start.saturating_add(len as u64) <= self.win_start + self.data.len() as u64
    }

    fn fill_window(&mut self, start: u64, min_len: u64) -> IoResult<()> {
        let want = min_len.max(WINDOW_BYTES);
        let end_excl = (start + want).min(self.total);
        if end_excl <= start {
            self.win_start = start;
            self.data.clear();
            return Ok(());
        }
        let bytes = self.fetch(start, end_excl - start)?;
        self.report(start, bytes.len() as u64);
        self.win_start = start;
        self.data = bytes;
        Ok(())
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

impl Read for JsRangeStream {
    fn read(&mut self, buf: &mut [u8]) -> IoResult<usize> {
        if self.offset >= self.total || buf.is_empty() {
            return Ok(0);
        }
        let remaining = self.total - self.offset;
        let want = (buf.len() as u64).min(remaining) as usize;

        if !self.cache_has(self.offset, want) {
            self.fill_window(self.offset, want as u64)?;
        }
        let rel = (self.offset - self.win_start) as usize;
        let available = self.data.len().saturating_sub(rel);
        let n = want.min(available);
        if n == 0 {
            return Ok(0);
        }
        buf[..n].copy_from_slice(&self.data[rel..rel + n]);
        self.offset += n as u64;
        Ok(n)
    }
}

impl Seek for JsRangeStream {
    fn seek(&mut self, pos: SeekFrom) -> IoResult<u64> {
        let new_offset: i64 = match pos {
            SeekFrom::Start(o) => o as i64,
            SeekFrom::End(o) => self.total as i64 + o,
            SeekFrom::Current(o) => self.offset as i64 + o,
        };
        if new_offset < 0 {
            return Err(IoError::new(
                std::io::ErrorKind::InvalidInput,
                "seek before start of stream",
            ));
        }
        self.offset = new_offset as u64;
        Ok(self.offset)
    }
}
