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

import { getNeonBinary } from "./binary.js";
import type {
  CallbackSignerInterface,
  JsCallbackSignerConfig,
  NeonCallbackSignerHandle,
  NeonLocalSignerHandle,
  LocalSignerInterface,
  SigningAlg,
} from "./types.d.ts";

export class LocalSigner implements LocalSignerInterface {
  constructor(private localSigner: NeonLocalSignerHandle) {}

  static newSigner(
    certificate: Buffer,
    privateKey: Buffer,
    algorithm: SigningAlg,
    tsaUrl?: string,
  ) {
    const signer = getNeonBinary().localSignerNew(
      certificate,
      privateKey,
      algorithm,
      tsaUrl,
    );
    return new LocalSigner(signer);
  }

  sign(data: Buffer): Buffer {
    return getNeonBinary().localSignerSign.call(this.localSigner, data);
  }

  alg(): SigningAlg {
    return getNeonBinary().localSignerAlg.call(this.localSigner);
  }

  certs(): Array<Buffer> {
    return getNeonBinary().localSignerCerts.call(this.localSigner);
  }

  reserveSize(): number {
    return getNeonBinary().localSignerReserveSize.call(this.localSigner);
  }

  timeAuthorityUrl(): string | undefined {
    return getNeonBinary().localSignerTimeAuthorityUrl.call(this.localSigner);
  }

  signer(): NeonLocalSignerHandle {
    return this.localSigner;
  }
}

export class CallbackSigner implements CallbackSignerInterface {
  constructor(private callbackSigner: NeonCallbackSignerHandle) {}

  signer(): NeonCallbackSignerHandle {
    return this.callbackSigner;
  }

  static newSigner(
    config: JsCallbackSignerConfig,
    callback: (data: Buffer) => Promise<Buffer>,
  ) {
    // Convert the config object to a JsBox<CallbackSignerConfig>
    const configBox = getNeonBinary().callbackSignerConfigFromJs(config);
    const signer = getNeonBinary().callbackSignerFromConfig(
      configBox,
      callback,
    );
    return new CallbackSigner(signer);
  }

  async sign(data: Buffer): Promise<Buffer> {
    return getNeonBinary().callbackSignerSign.call(this.callbackSigner, data);
  }

  alg(): SigningAlg {
    return getNeonBinary().callbackSignerAlg.call(this.callbackSigner);
  }

  certs(): Array<Buffer> {
    return getNeonBinary().callbackSignerCerts.call(this.callbackSigner);
  }

  reserveSize(): number {
    return getNeonBinary().callbackSignerReserveSize.call(this.callbackSigner);
  }

  timeAuthorityUrl(): string | undefined {
    return getNeonBinary().callbackSignerTimeAuthorityUrl.call(
      this.callbackSigner,
    );
  }

  directCoseHandling(): boolean {
    return getNeonBinary().callbackSignerDirectCoseHandling.call(
      this.callbackSigner,
    );
  }
}
