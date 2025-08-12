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
