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

// koffi FFI binding over c2pa-rs's public C API (c2pa_c_ffi, libc2pa_c).
// Adapted from a koffi binding prototype (github.com/gpeacock/c2pa-koffi)
// exploring the same replacement for this package's Neon binding.

import koffi from "koffi";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { platform } from "os";
import { fileURLToPath } from "url";

// This package compiles to real ESM ("type": "module" in package.json), so
// __dirname isn't available as an ambient global the way it is in CommonJS.
const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Opaque types (registered once globally by name) ─────────────────────────

koffi.opaque("C2paStream");
koffi.opaque("C2paReader");
koffi.opaque("C2paBuilder");
koffi.opaque("C2paSigner");
koffi.opaque("C2paContext");
koffi.opaque("C2paSettings");
koffi.opaque("C2paContextBuilder");

// ── Callback prototypes ──────────────────────────────────────────────────────

export const ReadCallbackProto = koffi.proto(
  "intptr_t ReadCallback(void *ctx, uint8_t *data, intptr_t len)",
);
export const SeekCallbackProto = koffi.proto(
  "intptr_t SeekCallback(void *ctx, intptr_t offset, int mode)",
);
export const WriteCallbackProto = koffi.proto(
  "intptr_t WriteCallback(void *ctx, const uint8_t *data, intptr_t len)",
);
export const FlushCallbackProto = koffi.proto(
  "intptr_t FlushCallback(void *ctx)",
);
export const SignerCallbackProto = koffi.proto(
  "intptr_t SignerCallback(const void *ctx, const uint8_t *data, uintptr_t len, uint8_t *signed_bytes, uintptr_t signed_len)",
);

// ── SignerInfo struct ────────────────────────────────────────────────────────

export const SignerInfoType = koffi.struct("C2paSignerInfo", {
  alg: "str",
  sign_cert: "str",
  private_key: "str",
  ta_url: "str",
});

// ── Enum values ──────────────────────────────────────────────────────────────

export const SigningAlgValues = {
  es256: 0,
  es384: 1,
  es512: 2,
  ps256: 3,
  ps384: 4,
  ps512: 5,
  ed25519: 6,
} as const;

// ── Library loading ──────────────────────────────────────────────────────────

function findLibraryPath(): string {
  if (process.env.C2PA_LIBRARY_PATH) return process.env.C2PA_LIBRARY_PATH;

  const plat = platform();
  const libName =
    plat === "darwin"
      ? "libc2pa_c.dylib"
      : plat === "win32"
        ? "c2pa_c.dll"
        : "libc2pa_c.so";

  const searchPaths = [
    join(__dirname, "..", "..", "libs", libName),
    join(__dirname, "..", "..", "artifacts", libName),
  ];

  for (const p of searchPaths) {
    if (existsSync(p)) return p;
  }
  return libName;
}

// ── Function declarations ────────────────────────────────────────────────────

export type Lib = ReturnType<typeof createLib>;
let _lib: Lib | null = null;

export function getLib(): Lib {
  if (!_lib) _lib = createLib(findLibraryPath());
  return _lib;
}

export function loadLibrary(path?: string): void {
  _lib = createLib(path ?? findLibraryPath());
}

function createLib(libPath: string) {
  const lib = koffi.load(libPath);

  return {
    // Version / error
    c2pa_version: lib.func("c2pa_version", "void *", []),
    c2pa_error: lib.func("c2pa_error", "void *", []),
    c2pa_free: lib.func("c2pa_free", "int", ["void *"]),

    // Streams
    c2pa_create_stream: lib.func("c2pa_create_stream", "C2paStream *", [
      "void *",
      "ReadCallback *",
      "SeekCallback *",
      "WriteCallback *",
      "FlushCallback *",
    ]),
    c2pa_release_stream: lib.func("c2pa_release_stream", "void", [
      "C2paStream *",
    ]),

    // Settings
    c2pa_settings_new: lib.func("c2pa_settings_new", "C2paSettings *", []),
    c2pa_settings_update_from_string: lib.func(
      "c2pa_settings_update_from_string",
      "int",
      ["C2paSettings *", "str", "str"],
    ),

    // Context builder
    c2pa_context_builder_new: lib.func(
      "c2pa_context_builder_new",
      "C2paContextBuilder *",
      [],
    ),
    c2pa_context_builder_set_settings: lib.func(
      "c2pa_context_builder_set_settings",
      "int",
      ["C2paContextBuilder *", "C2paSettings *"],
    ),
    c2pa_context_builder_build: lib.func(
      "c2pa_context_builder_build",
      "C2paContext *",
      ["C2paContextBuilder *"],
    ),

    // Context
    c2pa_context_new: lib.func("c2pa_context_new", "C2paContext *", []),

    // Reader
    c2pa_reader_from_context: lib.func(
      "c2pa_reader_from_context",
      "C2paReader *",
      ["C2paContext *"],
    ),
    c2pa_reader_with_stream: lib.func(
      "c2pa_reader_with_stream",
      "C2paReader *",
      ["C2paReader *", "str", "C2paStream *"],
    ),
    c2pa_reader_with_manifest_data_and_stream: lib.func(
      "c2pa_reader_with_manifest_data_and_stream",
      "C2paReader *",
      ["C2paReader *", "str", "C2paStream *", "void *", "uintptr_t"],
    ),
    c2pa_reader_json: lib.func("c2pa_reader_json", "void *", [
      "C2paReader *",
    ]),
    c2pa_reader_remote_url: lib.func("c2pa_reader_remote_url", "str", [
      "C2paReader *",
    ]), // NOT owned
    c2pa_reader_is_embedded: lib.func("c2pa_reader_is_embedded", "bool", [
      "C2paReader *",
    ]),
    c2pa_reader_resource_to_stream: lib.func(
      "c2pa_reader_resource_to_stream",
      "int64",
      ["C2paReader *", "str", "C2paStream *"],
    ),

    // Builder
    c2pa_builder_from_context: lib.func(
      "c2pa_builder_from_context",
      "C2paBuilder *",
      ["C2paContext *"],
    ),
    c2pa_builder_with_definition: lib.func(
      "c2pa_builder_with_definition",
      "C2paBuilder *",
      ["C2paBuilder *", "str"],
    ),
    c2pa_builder_with_archive: lib.func(
      "c2pa_builder_with_archive",
      "C2paBuilder *",
      ["C2paBuilder *", "C2paStream *"],
    ),
    c2pa_builder_set_intent: lib.func("c2pa_builder_set_intent", "int", [
      "C2paBuilder *",
      "int",
      "int",
    ]),
    c2pa_builder_set_no_embed: lib.func(
      "c2pa_builder_set_no_embed",
      "void",
      ["C2paBuilder *"],
    ),
    c2pa_builder_set_remote_url: lib.func(
      "c2pa_builder_set_remote_url",
      "int",
      ["C2paBuilder *", "str"],
    ),
    c2pa_builder_add_resource: lib.func(
      "c2pa_builder_add_resource",
      "int",
      ["C2paBuilder *", "str", "C2paStream *"],
    ),
    c2pa_builder_add_ingredient_from_stream: lib.func(
      "c2pa_builder_add_ingredient_from_stream",
      "int",
      ["C2paBuilder *", "str", "str", "C2paStream *"],
    ),
    c2pa_builder_add_action: lib.func("c2pa_builder_add_action", "int", [
      "C2paBuilder *",
      "str",
    ]),
    c2pa_builder_to_archive: lib.func("c2pa_builder_to_archive", "int", [
      "C2paBuilder *",
      "C2paStream *",
    ]),

    // sign — signer passed explicitly per call (not attached to the
    // context), matching this package's existing per-call-signer API.
    c2pa_builder_sign: lib.func("c2pa_builder_sign", "int64", [
      "C2paBuilder *",
      "str",
      "C2paStream *",
      "C2paStream *",
      "C2paSigner *",
      koffi.out(koffi.pointer("void *")),
    ]),

    // Signer
    c2pa_signer_create: lib.func("c2pa_signer_create", "C2paSigner *", [
      "void *",
      "SignerCallback *",
      "int",
      "str",
      "str",
    ]),
    c2pa_signer_from_info: lib.func(
      "c2pa_signer_from_info",
      "C2paSigner *",
      [koffi.pointer(SignerInfoType)],
    ),
    c2pa_signer_reserve_size: lib.func(
      "c2pa_signer_reserve_size",
      "int64",
      ["C2paSigner *"],
    ),
  };
}

// ── Shared helpers ───────────────────────────────────────────────────────────

// MAX_CSTRING_LEN from c2pa.h (1 MB). koffi.decode stops at the null terminator.
const MAX_CSTRING_LEN = 1_048_576;

/** Read a Rust-allocated null-terminated string and free it. */
export function decodeAndFree(ptr: unknown): string {
  if (!ptr) return "";
  const str = koffi.decode(ptr, "char", MAX_CSTRING_LEN) as string;
  getLib().c2pa_free(ptr);
  return str;
}

/** Read `size` Rust-allocated bytes and free them. */
export function decodeBytesAndFree(ptr: unknown, size: number): Buffer {
  if (!ptr || size <= 0) return Buffer.alloc(0);
  const arr = koffi.decode(ptr, "uint8_t", size) as Uint8Array;
  getLib().c2pa_free(ptr);
  return Buffer.from(arr);
}

/** Convert number | bigint to number (stream/size values never exceed 2^53). */
export function toNum(v: number | bigint): number {
  return typeof v === "bigint" ? Number(v) : v;
}

/**
 * Promisify a koffi function's built-in `.async()` call, which runs the
 * native call on a koffi-managed worker thread instead of blocking the
 * event loop. Registered stream callbacks (read/write/seek) invoked during
 * the call are safely marshaled back to the main thread by koffi.
 */
export function callAsync<T>(
  fn: { async: (...a: unknown[]) => void },
  ...args: unknown[]
): Promise<T> {
  return new Promise((resolve, reject) => {
    fn.async(...args, (err: unknown, res: T) => {
      if (err) reject(err instanceof Error ? err : new Error(String(err)));
      else resolve(res);
    });
  });
}
