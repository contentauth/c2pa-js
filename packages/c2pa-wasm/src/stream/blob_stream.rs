// Copyright 2025 Adobe
// All Rights Reserved.
//
// NOTICE: Adobe permits you to use, modify, and distribute this file in
// accordance with the terms of the Adobe license agreement accompanying
// it.

use std::{
    cmp::min,
    io::{Cursor, Error as IoError, Read, Result as IoResult, Seek, SeekFrom},
};

use js_sys::Uint8Array;
use web_sys::{Blob, FileReaderSync};

/// Files at or below this size are read entirely into WASM memory on construction,
/// eliminating repeated JS/WASM boundary crossings. Larger files fall back to
/// per-read `Blob.slice()` to avoid excessive memory duplication.
const BUFFER_THRESHOLD_BYTES: usize = 50 * 1024 * 1024; // 50 MB

enum StreamImpl {
    /// Entire blob pre-loaded into WASM memory. All Read/Seek ops are pure in-memory.
    Buffered(Cursor<Vec<u8>>),
    /// Original lazy approach: each read() crosses the JS/WASM boundary via Blob.slice().
    Lazy { offset: usize, blob: Blob },
}

/// Wraps a JS-space Blob to support Read + Seek.
///
/// For blobs <= 50 MB the data is eagerly copied into WASM linear memory so that
/// subsequent reads and seeks are pure in-memory operations - no JS interop overhead.
/// Larger blobs use a lazy per-read strategy to avoid doubling memory usage.
pub struct BlobStream {
    inner: StreamImpl,
}

impl BlobStream {
    /// Create a new BlobStream from a `web_sys::Blob`.
    pub fn new(blob: &Blob) -> Self {
        let size = blob.size() as usize;
        if size <= BUFFER_THRESHOLD_BYTES {
            let data = read_entire_blob(blob).unwrap_or_default();
            Self {
                inner: StreamImpl::Buffered(Cursor::new(data)),
            }
        } else {
            Self {
                inner: StreamImpl::Lazy {
                    offset: 0,
                    blob: blob.clone(),
                },
            }
        }
    }
}

fn read_entire_blob(blob: &Blob) -> IoResult<Vec<u8>> {
    let size = blob.size() as usize;
    if size == 0 {
        return Ok(Vec::new());
    }

    let reader_sync = FileReaderSync::new().map_err(|err| {
        IoError::other(format!(
            "Failed to create FileReaderSync. Details: {err:?}"
        ))
    })?;

    let array_buffer = reader_sync
        .read_as_array_buffer(blob)
        .map_err(|err| IoError::other(format!("Failed to read blob. Details: {err:?}")))?;

    let u8array = Uint8Array::new(&array_buffer);
    let mut buf = vec![0u8; u8array.byte_length() as usize];
    u8array.copy_to(&mut buf);

    Ok(buf)
}

fn get_vec_u8_from_blob(blob: &Blob, offset: u64, len: usize) -> IoResult<Vec<u8>> {
    let end = (blob.size() as u64).min(offset + len as u64);
    let slice = blob
        .slice_with_f64_and_f64(offset as f64, end as f64)
        .map_err(|err| {
            IoError::other(format!(
                "Failed to create slice from blob. Details: {err:?}"
            ))
        })?;

    let reader_sync = FileReaderSync::new().map_err(|err| {
        IoError::other(format!(
            "Failed to create FileReaderSync on blob slice. Details: {err:?}"
        ))
    })?;

    let slice_u8array = reader_sync
        .read_as_array_buffer(&slice)
        .map(|array_buffer| Uint8Array::new(&array_buffer))
        .map_err(|err| IoError::other(format!("Failed to read blob slice. Details: {err:?}")))?;

    let mut buf = vec![0; slice_u8array.byte_length() as usize];
    slice_u8array.copy_to(&mut buf);

    Ok(buf)
}

impl Read for BlobStream {
    fn read(&mut self, buf: &mut [u8]) -> IoResult<usize> {
        match &mut self.inner {
            StreamImpl::Buffered(cursor) => cursor.read(buf),
            StreamImpl::Lazy { offset, blob } => {
                let mut slice: &[u8] = &get_vec_u8_from_blob(blob, *offset, buf.len())?;
                let bytes_read = slice.read(buf)?;
                *offset += bytes_read;
                Ok(bytes_read)
            }
        }
    }
}

impl Seek for BlobStream {
    fn seek(&mut self, pos: SeekFrom) -> IoResult<u64> {
        match &mut self.inner {
            StreamImpl::Buffered(cursor) => cursor.seek(pos),
            StreamImpl::Lazy { offset, blob } => {
                match pos {
                    SeekFrom::Start(o) => {
                        *offset = o as usize;
                    }
                    SeekFrom::End(o) => {
                        *offset = (blob.size() as i64 + o) as usize;
                    }
                    SeekFrom::Current(o) => {
                        *offset = (*offset as i64 + o) as usize;
                    }
                }
                Ok(*offset as u64)
            }
        }
    }
}

// SAFETY: WASM is single-threaded.
unsafe impl Send for BlobStream {}

#[cfg(test)]
mod tests {
    use js_sys::Array;
    use wasm_bindgen_test::wasm_bindgen_test;

    use super::*;

    wasm_bindgen_test::wasm_bindgen_test_configure!(run_in_dedicated_worker);

    #[wasm_bindgen_test]
    fn test_read_in_sequence() {
        let blob = blob_from_vec(vec![0, 1, 2, 3]);

        let mut stream = BlobStream::new(&blob);

        let mut buf = vec![0; 2];
        let bytes_read = stream.read(&mut buf).unwrap();

        assert_eq!(buf, vec![0, 1]);
        assert_eq!(bytes_read, 2);

        let mut next_buf = vec![0; 2];
        let next_bytes_read = stream.read(&mut next_buf).unwrap();

        assert_eq!(next_buf, vec![2, 3]);
        assert_eq!(next_bytes_read, 2);
    }

    #[wasm_bindgen_test]
    fn test_read_into_oversize_buffer() {
        let blob = blob_from_vec(vec![0, 1, 2, 3]);

        let mut stream = BlobStream::new(&blob);

        let mut buf = vec![0; 6];
        let bytes_read = stream.read(&mut buf).unwrap();

        assert_eq!(buf, vec![0, 1, 2, 3, 0, 0]);
        assert_eq!(bytes_read, 4);
    }

    #[wasm_bindgen_test]
    fn test_read_and_seek() {
        let blob = blob_from_vec(vec![0, 1, 2, 3]);

        let mut stream = BlobStream::new(&blob);

        stream.seek(SeekFrom::Start(2)).unwrap();
        let mut buf = vec![0; 2];
        stream.read(&mut buf).unwrap();

        assert_eq!(buf, vec![2, 3]);

        stream.seek(SeekFrom::Current(-4)).unwrap();
        let mut next_buf = vec![0; 2];
        stream.read(&mut next_buf).unwrap();

        assert_eq!(next_buf, vec![0, 1]);

        stream.seek(SeekFrom::End(-2)).unwrap();
        let mut final_buf = vec![0; 2];
        stream.read(&mut final_buf).unwrap();

        assert_eq!(final_buf, vec![2, 3]);
    }

    #[wasm_bindgen_test]
    fn test_seek_past_end_and_read() {
        let blob = blob_from_vec(vec![0, 1, 2, 3]);

        let mut stream = BlobStream::new(&blob);

        stream.seek(SeekFrom::Start(10)).unwrap();
        let mut buf = vec![0; 2];
        let bytes_read = stream.read(&mut buf).unwrap();

        assert_eq!(buf, vec![0, 0]);
        assert_eq!(bytes_read, 0)
    }

    #[wasm_bindgen_test]
    fn test_crafted_png_seek_does_not_wrap() {
        // A crafted PNG triggers seek(Current(0xFFFFFFE7)) from offset 41.
        // On wasm32 with usize (32-bit), this wrapped to offset 16, causing an infinite loop.
        // With u64 offsets the seek resolves to a large value past EOF and reads 0 bytes.
        let blob = blob_from_vec(vec![0u8; 41]);
        let mut stream = BlobStream::new(&blob);
        stream.seek(SeekFrom::Start(41)).unwrap();

        // 0xFFFFFFE7 as i64 = 4294967271; 41 + 4294967271 = 4294967312 >> blob size
        let result = stream.seek(SeekFrom::Current(0xFFFF_FFE7_u32 as i64));
        assert!(result.is_ok(), "seek past EOF must succeed");
        assert!(result.unwrap() > 41, "offset must not have wrapped");

        // Read must return 0 (past EOF), not loop forever
        let mut buf = vec![0u8; 4];
        let n = stream.read(&mut buf).unwrap();
        assert_eq!(n, 0, "read past EOF must return 0 bytes");
    }

    fn blob_from_vec(vec: Vec<u8>) -> Blob {
        let u8array = Uint8Array::from(vec.as_slice());
        let parts = Array::new();
        parts.push(&u8array);

        Blob::new_with_u8_array_sequence(&parts).unwrap()
    }
}
