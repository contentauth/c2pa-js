// Copyright 2026 Adobe. All rights reserved.
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

import koffi, { IKoffiRegisteredCallback } from "koffi";
import {
  openSync,
  closeSync,
  readSync,
  writeSync,
  fstatSync,
  constants as fsConstants,
} from "fs";
import { extname } from "path";
import {
  getLib,
  ReadCallbackProto,
  SeekCallbackProto,
  WriteCallbackProto,
  FlushCallbackProto,
  toNum,
} from "./lib.js";
import { checkPtr } from "./error.js";
import type { DestinationAsset, ResourceAsset, SourceAsset } from "../types.d.ts";

function isFileAsset(v: object): v is { path: string; mimeType?: string } {
  return "path" in v && typeof (v as { path: unknown }).path === "string";
}

function isDestinationBufferAsset(v: object): v is { buffer: Buffer | null } {
  return "buffer" in v;
}

// c2pa-rs's format parameter accepts a bare extension or a full mime type;
// normalize a couple of common extensions that don't already match their
// c2pa-rs format name (e.g. ".jpg" -> "jpeg").
const EXTENSION_TO_FORMAT: Record<string, string> = {
  jpg: "jpeg",
  tif: "tiff",
};

/**
 * Resolve the format string to pass to the C API: the asset's explicit
 * mimeType if given, otherwise (for FileAsset) inferred from the file
 * extension — mirroring this package's documented FileAsset behavior,
 * since koffi streams give the native library no visibility into the
 * original file path/extension.
 */
export function mimeTypeOf(asset: SourceAsset): string | undefined {
  if ("mimeType" in asset && asset.mimeType) return asset.mimeType;
  if (isFileAsset(asset)) {
    const ext = extname(asset.path).slice(1).toLowerCase();
    return EXTENSION_TO_FORMAT[ext] ?? ext;
  }
  return undefined;
}

interface StreamBackend {
  read(out: Buffer): number;
  write(data: Buffer): number;
  seek(offset: number, mode: number): number;
  size(): number;
  close(): void;
  getBytes?(): Buffer;
}

/** In-memory backend. Grows on write; the whole asset is held in JS memory. */
class BufferBackend implements StreamBackend {
  private _buf: Buffer;
  private _pos = 0;
  private _size: number;

  constructor(buf: Buffer, size: number) {
    this._buf = buf;
    this._size = size;
  }

  read(out: Buffer): number {
    const available = Math.min(out.length, this._size - this._pos);
    if (available <= 0) return 0;
    this._buf.copy(out, 0, this._pos, this._pos + available);
    this._pos += available;
    return available;
  }

  write(data: Buffer): number {
    const end = this._pos + data.length;
    this._ensureCapacity(end);
    data.copy(this._buf, this._pos);
    this._pos += data.length;
    if (this._pos > this._size) this._size = this._pos;
    return data.length;
  }

  seek(offset: number, mode: number): number {
    const newPos = seekTo(offset, mode, this._pos, this._size);
    if (newPos < 0) return -1;
    return (this._pos = newPos);
  }

  size(): number {
    return this._size;
  }

  close(): void {}

  getBytes(): Buffer {
    return this._buf.subarray(0, this._size);
  }

  private _ensureCapacity(needed: number): void {
    if (needed <= this._buf.length) return;
    const newBuf = Buffer.alloc(Math.max(needed, this._buf.length * 2));
    this._buf.copy(newBuf, 0, 0, this._size);
    this._buf = newBuf;
  }
}

/** File-descriptor backend: reads/writes go straight to disk, no full buffering. */
class FileBackend implements StreamBackend {
  private readonly _fd: number;
  private readonly _ownsFd: boolean;
  private _pos = 0;
  private _size: number;

  constructor(fd: number, initialSize: number, ownsFd: boolean) {
    this._fd = fd;
    this._size = initialSize;
    this._ownsFd = ownsFd;
  }

  read(out: Buffer): number {
    const n = readSync(this._fd, out, 0, out.length, this._pos);
    this._pos += n;
    return n;
  }

  write(data: Buffer): number {
    const n = writeSync(this._fd, data, 0, data.length, this._pos);
    this._pos += n;
    if (this._pos > this._size) this._size = this._pos;
    return n;
  }

  seek(offset: number, mode: number): number {
    const newPos = seekTo(offset, mode, this._pos, this._size);
    if (newPos < 0) return -1;
    return (this._pos = newPos);
  }

  size(): number {
    return this._size;
  }

  close(): void {
    if (this._ownsFd) closeSync(this._fd);
  }
}

function seekTo(offset: number, mode: number, pos: number, size: number): number {
  switch (mode) {
    case 0:
      return offset; // Start
    case 1:
      return pos + offset; // Current
    case 2:
      return size + offset; // End
    default:
      return -1;
  }
}

/**
 * Seekable stream bridged to the C2PA C API via koffi callbacks. Backed by
 * either an in-memory Buffer or a file descriptor. Internal — callers use
 * this package's plain SourceAsset/DestinationAsset shapes.
 */
export class C2paStream {
  readonly ptr: unknown;

  private readonly _backend: StreamBackend;
  private _disposed = false;
  private readonly _cbs: IKoffiRegisteredCallback[];
  private _scratch = Buffer.alloc(64 * 1024);

  private constructor(backend: StreamBackend) {
    this._backend = backend;

    const readCb = koffi.register(
      (_ctx: unknown, outPtr: unknown, len: number | bigint): number => {
        try {
          const n = toNum(len);
          if (this._scratch.length < n) this._scratch = Buffer.alloc(n);
          const actual = this._backend.read(this._scratch.subarray(0, n));
          if (actual <= 0) return 0;
          koffi.encode(outPtr, "uint8_t", this._scratch.subarray(0, actual), actual);
          return actual;
        } catch {
          return -1;
        }
      },
      koffi.pointer(ReadCallbackProto),
    );

    const seekCb = koffi.register(
      (_ctx: unknown, offset: number | bigint, mode: number): number => {
        try {
          return this._backend.seek(toNum(offset), mode);
        } catch {
          return -1;
        }
      },
      koffi.pointer(SeekCallbackProto),
    );

    const writeCb = koffi.register(
      (_ctx: unknown, inPtr: unknown, len: number | bigint): number => {
        try {
          const n = toNum(len);
          const arr = koffi.decode(inPtr, "uint8_t", n) as Uint8Array;
          return this._backend.write(Buffer.from(arr));
        } catch {
          return -1;
        }
      },
      koffi.pointer(WriteCallbackProto),
    );

    const flushCb = koffi.register(
      (_ctx: unknown): number => 0,
      koffi.pointer(FlushCallbackProto),
    );

    this._cbs = [readCb, seekCb, writeCb, flushCb];
    this.ptr = checkPtr(
      getLib().c2pa_create_stream(null, readCb, seekCb, writeCb, flushCb),
      "Failed to create C2paStream",
    );
  }

  static fromBuffer(data: Buffer | Uint8Array): C2paStream {
    const buf = Buffer.isBuffer(data)
      ? data
      : Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    return new C2paStream(new BufferBackend(buf, buf.length));
  }

  static writable(initialCapacity = 4 * 1024 * 1024): C2paStream {
    return new C2paStream(new BufferBackend(Buffer.alloc(initialCapacity), 0));
  }

  static fromFile(path: string): C2paStream {
    const fd = openSync(path, fsConstants.O_RDONLY);
    const size = fstatSync(fd).size;
    return new C2paStream(new FileBackend(fd, size, true));
  }

  static toFile(path: string): C2paStream {
    const fd = openSync(
      path,
      fsConstants.O_RDWR | fsConstants.O_CREAT | fsConstants.O_TRUNC,
    );
    return new C2paStream(new FileBackend(fd, 0, true));
  }

  /** Build a read-only stream from this package's SourceAsset shape. */
  static fromSource(source: SourceAsset): C2paStream {
    if ("buffer" in source) return C2paStream.fromBuffer(source.buffer);
    if (isFileAsset(source)) return C2paStream.fromFile(source.path);
    throw new Error("Unrecognized SourceAsset shape");
  }

  /** Build a read+write+seek stream for this package's DestinationAsset shape. */
  static forDestination(dest?: DestinationAsset): C2paStream {
    if (dest === undefined || isDestinationBufferAsset(dest)) {
      return C2paStream.writable();
    }
    if (isFileAsset(dest)) return C2paStream.toFile(dest.path);
    throw new Error("Unrecognized DestinationAsset shape");
  }

  /**
   * After writing to a stream built by forDestination(), populate
   * dest.buffer if dest was a DestinationBufferAsset, and return a
   * ResourceAsset-shaped result matching this package's existing API.
   */
  static finalizeDestination(
    dest: DestinationAsset | undefined,
    stream: C2paStream,
    bytesWritten: number,
  ): ResourceAsset {
    if (dest === undefined || isDestinationBufferAsset(dest)) {
      const buffer = stream.getBytes();
      if (dest !== undefined) dest.buffer = buffer;
      return { buffer, bytes_written: bytesWritten };
    }
    return { buffer: undefined as unknown as Buffer, bytes_written: bytesWritten };
  }

  getBytes(): Buffer {
    if (!this._backend.getBytes) {
      throw new Error("getBytes() is not supported for file-backed streams");
    }
    return this._backend.getBytes();
  }

  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    getLib().c2pa_release_stream(this.ptr);
    for (const cb of this._cbs) koffi.unregister(cb);
    this._backend.close();
  }
}
