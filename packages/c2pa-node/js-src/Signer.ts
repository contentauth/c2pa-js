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

import * as neon from 'index.node';

export class LocalSigner implements neon.LocalSigner {
  private constructor(private localSigner: neon.LocalSigner) {}

  static newSigner(
    certificate: Buffer,
    privateKey: Buffer,
    algorithm: neon.SigningAlg,
    tsaUrl?: string,
  ) {
    const signer = neon.localSignerNew(
      certificate,
      privateKey,
      algorithm,
      tsaUrl,
    );
    return new LocalSigner(signer);
  }

  sign(data: Buffer): Buffer {
    return neon.localSignerSign.call(this.localSigner, data);
  }

  alg(): neon.SigningAlg {
    return neon.localSignerAlg.call(this.localSigner);
  }

  certs(): Array<Buffer> {
    return neon.localSignerCerts.call(this.localSigner);
  }

  reserveSize(): number {
    return neon.localSignerReserveSize.call(this.localSigner);
  }

  timeAuthorityUrl(): string | undefined {
    return neon.localSignerTimeAuthorityUrl.call(this.localSigner);
  }

  signer(): neon.LocalSigner {
    return this.localSigner;
  }
}

export class CallbackSigner implements neon.CallbackSigner {
  private constructor(private callbackSigner: neon.CallbackSigner) {}

  signer(): neon.CallbackSigner {
    return this.callbackSigner;
  }

  static newSigner(
    config: neon.JsCallbackSignerConfig,
    callback: (data: Buffer) => Promise<Buffer>,
  ) {
    // Convert the config object to a JsBox<CallbackSignerConfig>
    const configBox = neon.callbackSignerConfigFromJs(config);
    const signer = neon.callbackSignerFromConfig(configBox, callback);
    return new CallbackSigner(signer);
  }

  async sign(data: Buffer): Promise<Buffer> {
    return neon.callbackSignerSign.call(this.callbackSigner, data);
  }

  alg(): neon.SigningAlg {
    return neon.callbackSignerAlg.call(this.callbackSigner);
  }

  certs(): Array<Buffer> {
    return neon.callbackSignerCerts.call(this.callbackSigner);
  }

  reserveSize(): number {
    return neon.callbackSignerReserveSize.call(this.callbackSigner);
  }

  timeAuthorityUrl(): string | undefined {
    return neon.callbackSignerTimeAuthorityUrl.call(this.callbackSigner);
  }
}
