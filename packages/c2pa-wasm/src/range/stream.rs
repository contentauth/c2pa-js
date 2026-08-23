// Copyright 2025 Adobe
// All Rights Reserved.
//
// NOTICE: Adobe permits you to use, modify, and distribute this file in
// accordance with the terms of the Adobe license agreement accompanying
// it.

use std::io::{Error as IoError, Read, Result as IoResult, Seek, SeekFrom};

use js_sys::{Function, Uint8Array};
use wasm_bindgen::JsValue;
use web_sys::{XmlHttpRequest, XmlHttpRequestResponseType};

/// Bytes fetched ahead per network read to amortize round-trips.
const WINDOW_BYTES: u64 = 64 * 1024;

/// Where a [`RangeStream`] pulls its bytes from. A declarative source the worker
/// can reconstruct; carries no live JS closure.
#[derive(Clone)]
pub(crate) enum RangeSource {
    /// Fetch ranges over HTTP from this URL via synchronous XHR (worker-only).
    Url(String),
}

impl RangeSource {
    fn label(&self) -> &str {
        match self {
            RangeSource::Url(u) => u,
        }
    }
}

/// A `Read + Seek` stream backed by HTTP Range requests. Fetches only the bytes
/// the caller reads, plus a small read-ahead window, and optionally reports each
/// network fetch through `on_fetch`.
pub(crate) struct RangeStream {
    source: RangeSource,
    total: u64,
    offset: u64,
    // Cached window: bytes for [win_start, win_start + data.len()).
    win_start: u64,
    data: Vec<u8>,
    on_fetch: Option<Function>,
}

impl RangeStream {
    /// Open `source`, discovering its total length via an initial one-byte Range
    /// request. `on_fetch(offset, length, total)` fires on every network fetch.
    pub(crate) fn open(source: RangeSource, on_fetch: Option<Function>) -> IoResult<Self> {
        let (_probe, total) = fetch_range(source.label(), 0, 0)?;
        let total = total.ok_or_else(|| {
            IoError::other("range source did not report a total length (missing Content-Range)")
        })?;
        Ok(Self {
            source,
            total,
            offset: 0,
            win_start: 0,
            data: Vec::new(),
            on_fetch,
        })
    }

    fn cache_has(&self, start: u64, len: usize) -> bool {
        start >= self.win_start
            && start.saturating_add(len as u64) <= self.win_start + self.data.len() as u64
    }

    fn report(&self, offset: u64, length: u64) {
        if let Some(cb) = &self.on_fetch {
            let _ = cb.call3(
                &JsValue::NULL,
                &JsValue::from_f64(offset as f64),
                &JsValue::from_f64(length as f64),
                &JsValue::from_f64(self.total as f64),
            );
        }
    }

    fn fill_window(&mut self, start: u64, min_len: u64) -> IoResult<()> {
        let want = min_len.max(WINDOW_BYTES);
        let end_excl = (start + want).min(self.total);
        if end_excl <= start {
            self.win_start = start;
            self.data.clear();
            return Ok(());
        }
        let (bytes, _) = fetch_range(self.source.label(), start, end_excl - 1)?;
        self.report(start, bytes.len() as u64);
        self.win_start = start;
        self.data = bytes;
        Ok(())
    }
}

impl Read for RangeStream {
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

impl Seek for RangeStream {
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

// SAFETY: WASM is single-threaded; the stored JS handles are never sent across threads.
unsafe impl Send for RangeStream {}

/// Synchronous HTTP Range GET via XMLHttpRequest. Only valid inside a Web Worker
/// (synchronous XHR with `responseType` is forbidden on the main thread).
///
/// Returns the fetched bytes and, when present, the total resource length parsed
/// from the `Content-Range` response header.
fn fetch_range(url: &str, start: u64, end_inclusive: u64) -> IoResult<(Vec<u8>, Option<u64>)> {
    let xhr = XmlHttpRequest::new().map_err(js_err)?;
    xhr.open_with_async("GET", url, false).map_err(js_err)?;
    xhr.set_request_header("Range", &format!("bytes={start}-{end_inclusive}"))
        .map_err(js_err)?;
    xhr.set_response_type(XmlHttpRequestResponseType::Arraybuffer);
    xhr.send().map_err(js_err)?;

    let status = xhr.status().map_err(js_err)?;
    if status != 206 {
        return Err(IoError::other(format!(
            "expected 206 Partial Content from {url}, got {status} (server may not honor Range)"
        )));
    }

    let total = xhr
        .get_response_header("Content-Range")
        .ok()
        .flatten()
        .and_then(|h| parse_content_range_total(&h));

    let resp = xhr.response().map_err(js_err)?;
    let u8 = Uint8Array::new(&resp);
    let mut bytes = vec![0u8; u8.byte_length() as usize];
    u8.copy_to(&mut bytes);
    Ok((bytes, total))
}

/// Parse the total length from a `Content-Range: bytes START-END/TOTAL` header.
fn parse_content_range_total(header: &str) -> Option<u64> {
    let total = header.rsplit('/').next()?.trim();
    if total == "*" {
        return None;
    }
    total.parse::<u64>().ok()
}

fn js_err(e: JsValue) -> IoError {
    IoError::other(format!("{e:?}"))
}
