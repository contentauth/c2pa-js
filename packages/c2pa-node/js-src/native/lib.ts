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

// koffi FFI binding over the c2pa-rs C API (and, when the loaded library is
// `libadobe_c2pa` rather than plain `libc2pa_c`, the additional Adobe
// `adobe_c2pa` C API in native/adobeContext.ts). Adapted from a koffi
// binding prototype (github.com/gpeacock/c2pa-koffi) exploring the same
// replacement for this package's Neon binding.

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
  // libadobe_c2pa is a superset of libc2pa_c (it links c2pa-rs statically
  // and re-exports every c2pa_* symbol alongside the adobe_* ones), so a
  // single library covers both the plain reader/builder path and the
  // Adobe-specific signer/identity path in native/adobeContext.ts.
  const adobeLibName =
    plat === "darwin"
      ? "libadobe_c2pa.dylib"
      : plat === "win32"
        ? "adobe_c2pa.dll"
        : "libadobe_c2pa.so";
  const plainLibName =
    plat === "darwin"
      ? "libc2pa_c.dylib"
      : plat === "win32"
        ? "c2pa_c.dll"
        : "libc2pa_c.so";

  const searchPaths = [
    join(__dirname, "..", "..", "libs", adobeLibName),
    join(__dirname, "..", "..", "libs", plainLibName),
    // Sibling checkout of the Adobe `adobe_api` repo, built via
    // `cargo build --release -p adobe_c2pa` — see README.md.
    join(
      __dirname,
      "..",
      "..",
      "..",
      "..",
      "..",
      "adobe_api",
      "target",
      "release",
      adobeLibName,
    ),
  ];

  for (const p of searchPaths) {
    if (existsSync(p)) return p;
  }
  return adobeLibName;
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

/** True if the loaded library exports the Adobe adobe_c2pa API (i.e. it's
 * libadobe_c2pa, not plain libc2pa_c). */
export function isAdobeApiAvailable(): boolean {
  return !(getLib().adobe_context_create as unknown as { unavailable?: true })
    .unavailable;
}

function createLib(libPath: string) {
  const lib = koffi.load(libPath);
  // Adobe-specific symbols aren't present when the loaded library is plain
  // libc2pa_c rather than libadobe_c2pa. Rather than typing these as
  // `T | null` (which forces a null-check at every call site), return a
  // stub that throws only if actually called, marked with `.unavailable`
  // so isAdobeApiAvailable() can check for it up front.
  const optionalFunc = (
    name: string,
    resultType: string,
    argTypes: unknown[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): any => {
    try {
      return lib.func(name, resultType, argTypes as never[]);
    } catch {
      const stub = (...args: unknown[]) => {
        void args;
        throw new Error(`Native function ${name} is not available in this library`);
      };
      (stub as typeof stub & { unavailable: true }).unavailable = true;
      return stub;
    }
  };

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

    // Adobe-specific (only present when the loaded library is
    // libadobe_c2pa) — declared optional so this file still loads against
    // plain libc2pa_c. See native/adobeContext.ts for the higher-level API.
    adobe_context_create: optionalFunc("adobe_context_create", "int", [
      "str",
      "str",
      koffi.out(koffi.pointer("void *")),
    ]),
    adobe_context_create_ims_user_client: optionalFunc(
      "adobe_context_create_ims_user_client",
      "int",
      [koffi.inout(koffi.pointer("void *")), koffi.out(koffi.pointer("void *"))],
    ),
    adobe_context_get_identities: optionalFunc(
      "adobe_context_get_identities",
      "int",
      [koffi.inout(koffi.pointer("void *")), koffi.out(koffi.pointer("void *"))],
    ),
    adobe_identity_type: optionalFunc("adobe_identity_type", "str", [
      "void *",
    ]),
    adobe_identity_display_name: optionalFunc(
      "adobe_identity_display_name",
      "str",
      ["void *"],
    ),
    adobe_identity_username: optionalFunc("adobe_identity_username", "str", [
      "void *",
    ]),
    adobe_identity_is_verified: optionalFunc(
      "adobe_identity_is_verified",
      "bool",
      ["void *"],
    ),
    adobe_context_create_signer_with_options: optionalFunc(
      "adobe_context_create_signer_with_options",
      "int",
      [
        koffi.inout(koffi.pointer("void *")),
        koffi.out(koffi.pointer("void *")),
        koffi.pointer(
          koffi.struct("AdobeSignerOptions", {
            identities: "str *",
            identities_count: "size_t",
            disable_timestamping: "bool",
          }),
        ),
      ],
    ),
    free_adobe_context: optionalFunc("free_adobe_context", "void", [
      "void *",
    ]),
    free_ims_client: optionalFunc("free_ims_client", "void", ["void *"]),
    free_identities: optionalFunc("free_identities", "void", ["void *"]),
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
