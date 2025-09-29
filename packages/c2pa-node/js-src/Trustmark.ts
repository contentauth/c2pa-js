// Copyright 2025 Adobe. All rights reserved.
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

const neon = require("./index.node");
import type {
  TrustmarkInterface,
  TrustmarkConfig,
  NeonTrustmarkHandle,
} from "./types";

export class Trustmark implements TrustmarkInterface {
  constructor(private trustmark: NeonTrustmarkHandle) {}

  static async newTrustmark(config: TrustmarkConfig): Promise<Trustmark> {
    const trustmark: NeonTrustmarkHandle = await neon.trustmarkNew(config);
    return new Trustmark(trustmark);
  }

  async encode(
    image: Buffer,
    strength: number,
    watermark?: string,
  ): Promise<Buffer> {
    return neon.trustmarkEncode.call(
      this.trustmark,
      image,
      strength,
      watermark,
    );
  }

  async decode(image: Buffer): Promise<string> {
    return neon.trustmarkDecode.call(this.trustmark, image);
  }
}
