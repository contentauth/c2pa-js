use js_sys::Uint8Array;
use std::{
    cmp::min,
    io::{Error as IoError, ErrorKind as IoErrorKind, Read, Result as IoResult, Seek, SeekFrom},
};
use web_sys::{Blob, FileReaderSync};

pub struct BlobStream<'a> {
    offset: usize,
    pub blob: &'a Blob,
}

impl<'a> BlobStream<'a> {
    pub fn new(blob: &'a Blob) -> Self {
        Self { offset: 0, blob }
    }
}

impl Read for BlobStream<'_> {
    fn read(&mut self, buf: &mut [u8]) -> IoResult<usize> {
        let pos = self.offset;
        let buffer_len = self.blob.size() as usize;
        let into_len = buf.len();

        if pos < buffer_len {
            let end = min(buffer_len, pos + into_len);
            let slice = self
                .blob
                .slice_with_f64_and_f64(pos as f64, end as f64)
                .map_err(|err| {
                    IoError::new(
                        IoErrorKind::Other,
                        format!("Failed to create slice from blob. Details: {:?}", err),
                    )
                })?;

            let reader_sync = FileReaderSync::new().map_err(|err| {
                IoError::new(
                    IoErrorKind::Other,
                    format!(
                        "Failed to create FileReaderSync on blob slice. Details: {:?}",
                        err
                    ),
                )
            })?;

            let slice_buf = reader_sync
                .read_as_array_buffer(&slice)
                .map(|array_buffer| Uint8Array::new(&array_buffer))
                .map_err(|err| {
                    IoError::new(
                        IoErrorKind::Other,
                        format!("Failed to read blob slice. Details: {:?}", err),
                    )
                })?;

            let slice_len = slice_buf.byte_length() as usize;

            if slice_len == into_len {
                slice_buf.copy_to(buf);
            } else {
                let mut slice_with_padding = vec![0; slice_len];
                slice_buf.copy_to(&mut slice_with_padding);
                slice_with_padding.resize(into_len, 0);
                buf.copy_from_slice(&slice_with_padding);
            }

            self.offset += slice_len;

            Ok(slice_len)
        } else {
            Ok(0)
        }
    }
}

impl Seek for BlobStream<'_> {
    fn seek(&mut self, pos: SeekFrom) -> std::io::Result<u64> {
        match pos {
            SeekFrom::Start(offset) => {
                self.offset = offset as usize;
            }
            SeekFrom::End(offset) => {
                self.offset = (self.blob.size() as i64 + offset) as usize;
            }
            SeekFrom::Current(offset) => {
                self.offset = (self.offset as i64 + offset) as usize;
            }
        }

        Ok(self.offset as u64)
    }
}

// WASM is single-threaded so this "unsafe" is acceptable
unsafe impl Send for BlobStream<'_> {}

#[cfg(test)]
mod tests {
    use super::*;
    use js_sys::Array;
    use wasm_bindgen_test::wasm_bindgen_test;

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

    fn blob_from_vec(vec: Vec<u8>) -> Blob {
        let u8array = Uint8Array::from(vec.as_slice());
        let parts = Array::new();
        parts.push(&u8array);

        Blob::new_with_u8_array_sequence(&parts).unwrap()
    }
}
