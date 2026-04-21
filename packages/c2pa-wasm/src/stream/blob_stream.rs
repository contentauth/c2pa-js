// Copyright 2025 Adobe
// All Rights Reserved.
//
// NOTICE: Adobe permits you to use, modify, and distribute this file in
// accordance with the terms of the Adobe license agreement accompanying
// it.

use std::io::{Error as IoError, Read, Result as IoResult, Seek, SeekFrom};

use js_sys::Uint8Array;
use web_sys::{Blob, FileReaderSync};

/// Wraps a JS-space Blob and a byte offset to support the implementation of Read + Seek.
pub struct BlobStream<'a> {
    offset: u64,
    blob: &'a Blob,
}

impl<'a> BlobStream<'a> {
    /// Create a new BlobStream from a `web_sys::Blob`.
    pub fn new(blob: &'a Blob) -> Self {
        Self { offset: 0, blob }
    }
}

impl Read for BlobStream<'_> {
    fn read(&mut self, buf: &mut [u8]) -> IoResult<usize> {
        let mut slice: &[u8] = &get_vec_u8_from_blob(self.blob, self.offset, buf.len())?;
        let bytes_read = slice.read(buf)?;
        self.offset += bytes_read as u64;
        Ok(bytes_read)
    }
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

impl Seek for BlobStream<'_> {
    fn seek(&mut self, pos: SeekFrom) -> std::io::Result<u64> {
        let new_offset: u64 = match pos {
            SeekFrom::Start(offset) => offset,
            SeekFrom::End(offset) => {
                let pos = (self.blob.size() as i64)
                    .checked_add(offset)
                    .ok_or_else(|| IoError::other("seek overflow"))?;
                if pos < 0 {
                    return Err(IoError::new(
                        std::io::ErrorKind::InvalidInput,
                        "seek before start of stream",
                    ));
                }
                pos as u64
            }
            SeekFrom::Current(offset) => {
                let pos = (self.offset as i64)
                    .checked_add(offset)
                    .ok_or_else(|| IoError::other("seek overflow"))?;
                if pos < 0 {
                    return Err(IoError::new(
                        std::io::ErrorKind::InvalidInput,
                        "seek before start of stream",
                    ));
                }
                pos as u64
            }
        };
        self.offset = new_offset;
        Ok(self.offset)
    }
}

// SAFETY: WASM is single-threaded.
unsafe impl Send for BlobStream<'_> {}

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
