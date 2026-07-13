// Copyright 2024 Adobe. All rights reserved.
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

import * as crypto from "crypto";

import { Signer as NativeSigner } from "./native/signer.js";
import type {
  CallbackSignerInterface,
  JsCallbackSignerConfig,
  LocalSignerInterface,
  SigningAlg,
} from "./types.d.ts";

/** Internal contract Builder uses to reach the underlying native signer,
 * regardless of which public signer class this is. */
export interface HasNativeSigner {
  nativeSigner(): NativeSigner;
  /** See CallbackSigner.nativeSigner() — the real reason a sync callback
   * bridge failed, when the native error alone wouldn't explain it. */
  lastSyncError?(): Error | undefined;
}

function certsToPem(certs: Array<Buffer> | undefined): string {
  return (certs ?? []).map((c) => c.toString("utf8")).join("\n");
}

export class LocalSigner implements LocalSignerInterface, HasNativeSigner {
  private _native?: NativeSigner;

  private constructor(
    private _alg: SigningAlg,
    private _certs: Array<Buffer>,
    private _privateKey: Buffer,
    private _tsaUrl?: string,
  ) {}

  static newSigner(
    certificate: Buffer,
    privateKey: Buffer,
    algorithm: SigningAlg,
    tsaUrl?: string,
  ) {
    return new LocalSigner(algorithm, [certificate], privateKey, tsaUrl);
  }

  /** Sign raw bytes directly with Node's built-in crypto (no native call —
   * this is a standalone utility surface, separate from the manifest-signing
   * pipeline in Builder.sign(), which uses the native signer via
   * nativeSigner() instead). */
  sign(data: Buffer): Buffer {
    const key = crypto.createPrivateKey({ key: this._privateKey, format: "pem" });
    const isPss = this._alg.startsWith("ps");
    const hashAlg = { es256: "sha256", es384: "sha384", es512: "sha512", ps256: "sha256", ps384: "sha384", ps512: "sha512", ed25519: "sha512" }[this._alg];
    if (this._alg === "ed25519") {
      return crypto.sign(null, data, key);
    }
    const signer = crypto.createSign(hashAlg!);
    signer.update(data);
    signer.end();
    return isPss
      ? signer.sign({ key, padding: crypto.constants.RSA_PKCS1_PSS_PADDING })
      : signer.sign(key);
  }

  alg(): SigningAlg {
    return this._alg;
  }

  certs(): Array<Buffer> {
    return this._certs;
  }

  reserveSize(): number {
    return this.nativeSigner().reserveSize();
  }

  timeAuthorityUrl(): string | undefined {
    return this._tsaUrl;
  }

  nativeSigner(): NativeSigner {
    if (!this._native) {
      this._native = NativeSigner.fromInfo({
        alg: this._alg,
        signCert: certsToPem(this._certs),
        privateKey: this._privateKey.toString("utf8"),
        taUrl: this._tsaUrl,
      });
    }
    return this._native;
  }

  getHandle(): unknown {
    return this;
  }
}

export class CallbackSigner implements CallbackSignerInterface, HasNativeSigner {
  private _native?: NativeSigner;

  private constructor(
    private _config: JsCallbackSignerConfig,
    private _callback: (data: Buffer) => Promise<Buffer>,
  ) {}

  static newSigner(
    config: JsCallbackSignerConfig,
    callback: (data: Buffer) => Promise<Buffer>,
  ) {
    return new CallbackSigner(config, callback);
  }

  async sign(data: Buffer): Promise<Buffer> {
    return this._callback(data);
  }

  alg(): SigningAlg {
    return this._config.alg;
  }

  certs(): Array<Buffer> {
    return this._config.certs ?? [];
  }

  reserveSize(): number {
    return this._config.reserveSize;
  }

  timeAuthorityUrl(): string | undefined {
    return this._config.tsaUrl;
  }

  directCoseHandling(): boolean {
    return this._config.directCoseHandling;
  }

  /**
   * Build the native signer used by Builder.signAsync(). koffi's signer
   * callback runs synchronously on the main thread and cannot await real
   * async work (e.g. a network round-trip). This only works if the
   * callback's promise happens to already be settled by the time koffi
   * calls it synchronously, which in practice means it will fail for any
   * callback that performs genuine async I/O.
   */
  nativeSigner(): NativeSigner {
    if (!this._native) {
      // `this._callback` is typed `(data: Buffer) => Promise<Buffer>`, so it
      // always returns a real Promise — there is no standard JS mechanism to
      // unwrap that synchronously, even when the underlying work already
      // completed. koffi's signer callback must return synchronously, so a
      // genuine async JS callback signer cannot be bridged through it at
      // all. This is not a bug to fix here — it's a fundamental mismatch
      // between koffi's synchronous callback model and a Promise-based
      // signer API. native/signer.ts's koffi callback wrapper swallows
      // thrown errors (returns -1) since koffi callbacks can't propagate JS
      // exceptions, so this message is stashed on `lastSyncError()` for
      // Builder to surface instead of a generic "COSE signature invalid"
      // error from the native signing failure.
      const syncBridge = (): Buffer => {
        this._lastSyncError = new Error(
          "CallbackSigner cannot be used with Builder.sign()/signAsync(): " +
            "koffi's native signer callback must return synchronously, and " +
            "this signer's callback is async — a genuine async JS signer " +
            "callback cannot be bridged through koffi. Use LocalSigner for " +
            "local-key signing instead.",
        );
        throw this._lastSyncError;
      };

      this._native = NativeSigner.fromCallback(
        syncBridge,
        this._config.alg,
        certsToPem(this._config.certs),
        this._config.tsaUrl,
      );
    }
    return this._native;
  }

  private _lastSyncError?: Error;

  /** See nativeSigner() — surfaces the real reason a sign() call failed,
   * since koffi callbacks can't propagate exceptions themselves. */
  lastSyncError(): Error | undefined {
    return this._lastSyncError;
  }

  getHandle(): unknown {
    return this;
  }
}
