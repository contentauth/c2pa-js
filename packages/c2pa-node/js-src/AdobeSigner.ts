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

// New capability, not present in the Neon binding: a signer backed by
// Adobe's claims-signer service and (optionally) CAWG-verified identities,
// implemented entirely in Rust (adobe_api) and reached here via a thin
// koffi binding — see native/adobeContext.ts and RFC.md.
//
// Unlike CallbackSigner (see Signer.ts), this has no async-JS-callback
// problem: the network round-trip happens inside Rust as a single blocking
// C call, dispatched off the main thread via koffi's .async() when used
// through Builder.signAsync().

import {
  AdobeContext,
  type AdobeIdentity,
} from "./native/adobeContext.js";
import type { Signer as NativeSigner } from "./native/signer.js";
import type { HasNativeSigner } from "./Signer.js";

export class AdobeSigner implements HasNativeSigner {
  private constructor(private _native: NativeSigner) {}

  /**
   * Fetch the caller's connected identities and create a signer that
   * attaches all of them as CAWG-verified identities. Pass
   * `identityTypes` explicitly to attach only a subset (e.g. just
   * "behance"), or an empty array for a plain (non-CAWG) Adobe signer.
   */
  static create(
    authToken: string,
    apiKey: string,
    opts: { identityTypes?: string[]; disableTimestamping?: boolean } = {},
  ): AdobeSigner {
    const ctx = AdobeContext.create(authToken, apiKey);
    try {
      const identityTypes =
        opts.identityTypes ?? ctx.getIdentities().map((i) => i.type);
      const native = ctx.createSigner(identityTypes, {
        disableTimestamping: opts.disableTimestamping,
      });
      return new AdobeSigner(native);
    } finally {
      // Safe once the signer exists — AdobeSigner clones its own network
      // client/runtime references (confirmed against the real adobe_api C
      // API this session).
      ctx.dispose();
    }
  }

  /** Convenience: fetch identities without creating a signer, e.g. to let a
   * caller choose which ones to attach before calling create(). */
  static getIdentities(authToken: string, apiKey: string): AdobeIdentity[] {
    const ctx = AdobeContext.create(authToken, apiKey);
    try {
      return ctx.getIdentities();
    } finally {
      ctx.dispose();
    }
  }

  nativeSigner(): NativeSigner {
    return this._native;
  }
}
