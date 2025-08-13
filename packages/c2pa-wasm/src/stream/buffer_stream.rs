use js_sys::{ArrayBuffer, Uint8Array};
use std::{
    cmp::min,
    io::{Read, Result as IoResult, Seek, SeekFrom},
};

pub struct BufferStream<'a> {
    offset: usize,
    pub buffer: &'a ArrayBuffer,
}

impl<'a> BufferStream<'a> {
    pub fn new(buffer: &'a ArrayBuffer) -> Self {
        Self { offset: 0, buffer }
    }
}

impl Read for BufferStream<'_> {
    fn read(&mut self, buf: &mut [u8]) -> IoResult<usize> {
        let pos = self.offset;
        let buffer_len = self.buffer.byte_length() as usize;
        let into_len = buf.len();

        if pos < buffer_len {
            let end = min(buffer_len, pos + into_len);
            let slice = self.buffer.slice_with_end(pos as u32, end as u32);
            let slice_len = slice.byte_length() as usize;
            let slice_buf = Uint8Array::new(&slice);

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

impl Seek for BufferStream<'_> {
    fn seek(&mut self, pos: SeekFrom) -> IoResult<u64> {
        match pos {
            SeekFrom::Start(offset) => {
                self.offset = offset as usize;
            }
            SeekFrom::End(offset) => {
                self.offset = (self.buffer.byte_length() as i64 + offset) as usize;
            }
            SeekFrom::Current(offset) => {
                self.offset = (self.offset as i64 + offset) as usize;
            }
        }

        Ok(self.offset as u64)
    }
}

// WASM is single-threaded so this "unsafe" is acceptable
unsafe impl Send for BufferStream<'_> {}

#[cfg(test)]
mod tests {
    use super::*;
    use wasm_bindgen_test::wasm_bindgen_test;

    wasm_bindgen_test::wasm_bindgen_test_configure!(run_in_dedicated_worker);

    #[wasm_bindgen_test]
    fn test_read_in_sequence() {
        let blob = buffer_from_vec(vec![0, 1, 2, 3]);

        let mut stream = BufferStream::new(&blob);

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
        let blob = buffer_from_vec(vec![0, 1, 2, 3]);

        let mut stream = BufferStream::new(&blob);

        let mut buf = vec![0; 6];
        let bytes_read = stream.read(&mut buf).unwrap();

        assert_eq!(buf, vec![0, 1, 2, 3, 0, 0]);
        assert_eq!(bytes_read, 4);
    }

    #[wasm_bindgen_test]
    fn test_read_and_seek() {
        let blob = buffer_from_vec(vec![0, 1, 2, 3]);

        let mut stream = BufferStream::new(&blob);

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
        let blob = buffer_from_vec(vec![0, 1, 2, 3]);

        let mut stream = BufferStream::new(&blob);

        stream.seek(SeekFrom::Start(10)).unwrap();
        let mut buf = vec![0; 2];
        let bytes_read = stream.read(&mut buf).unwrap();

        assert_eq!(buf, vec![0, 0]);
        assert_eq!(bytes_read, 0)
    }

    fn buffer_from_vec(vec: Vec<u8>) -> ArrayBuffer {
        let array_buffer = ArrayBuffer::new(vec.len() as u32);
        let u8array = Uint8Array::new(&array_buffer);
        u8array.copy_from(&vec);

        array_buffer
    }
}
