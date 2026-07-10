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
  getLib,
  SignerCallbackProto,
  SigningAlgValues,
  toNum,
} from "./lib.js";
import { checkPtr } from "./error.js";

export type NativeSigningAlg = keyof typeof SigningAlgValues;

export interface SignerInfo {
  alg: NativeSigningAlg;
  signCert: string;
  privateKey: string;
  taUrl?: string;
}

/**
 * Thin wrapper over a native C2paSigner*, used internally by this package's
 * public LocalSigner/CallbackSigner/AdobeSigner classes to actually sign
 * through Builder.sign()/signAsync().
 */
export class Signer {
  /** @internal */ ptr: unknown;
  private _disposed = false;
  // Keep the JS callback alive as long as this signer exists.
  private _cb: IKoffiRegisteredCallback | null = null;

  private constructor(ptr: unknown) {
    this.ptr = ptr;
  }

  /** Create a signer from PEM credentials. The private key never leaves the process. */
  static fromInfo(info: SignerInfo): Signer {
    const struct = {
      alg: info.alg.toLowerCase(),
      sign_cert: info.signCert,
      private_key: info.privateKey,
      ta_url: info.taUrl ?? null,
    };
    const ptr = checkPtr(
      getLib().c2pa_signer_from_info(struct),
      "Failed to create signer from info",
    );
    return new Signer(ptr);
  }

  /**
   * Create a signer backed by a JS callback. The callback must return the
   * DER-encoded signature *synchronously* — koffi callbacks run on the main
   * thread and cannot await real async work (e.g. a network round-trip).
   * See RFC.md, "Async / threading model".
   */
  static fromCallback(
    sign: (data: Buffer) => Buffer,
    alg: NativeSigningAlg,
    certs: string,
    taUrl?: string,
  ): Signer {
    const MAX_DATA = 1024 * 1024; // 1 MB safety limit

    const wrapped = koffi.register(
      (
        _ctx: unknown,
        dataPtr: unknown,
        len: number | bigint,
        outPtr: unknown,
        outLen: number | bigint,
      ): number => {
        try {
          const n = toNum(len);
          const maxOut = toNum(outLen);
          if (n <= 0 || n > MAX_DATA || maxOut <= 0) return -1;

          const arr = koffi.decode(dataPtr, "uint8_t", n) as number[];
          const signature = sign(Buffer.from(arr));

          const actual = Math.min(signature.length, maxOut);
          koffi.encode(outPtr, "uint8_t", signature.subarray(0, actual), actual);
          return actual;
        } catch {
          return -1;
        }
      },
      koffi.pointer(SignerCallbackProto),
    );

    const ptr = checkPtr(
      getLib().c2pa_signer_create(null, wrapped, SigningAlgValues[alg], certs, taUrl ?? null),
      "Failed to create callback signer",
    );

    const s = new Signer(ptr);
    s._cb = wrapped;
    return s;
  }

  /**
   * Wrap a C2paSigner* created elsewhere (e.g. by native/adobeContext.ts's
   * adobe_context_create_signer_with_options) so it can be used with
   * Builder.sign()/signAsync() like any other Signer.
   */
  static fromPointer(ptr: unknown): Signer {
    return new Signer(checkPtr(ptr, "Signer.fromPointer: null pointer"));
  }

  reserveSize(): number {
    return Number(getLib().c2pa_signer_reserve_size(this.ptr));
  }

  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    if (this.ptr) getLib().c2pa_free(this.ptr);
    if (this._cb) koffi.unregister(this._cb);
  }
}
