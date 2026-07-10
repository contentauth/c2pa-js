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

export type * from "./types.d.ts";
export { Builder } from "./Builder.js";
export { Reader } from "./Reader.js";
export { LocalSigner, CallbackSigner } from "./Signer.js";
export {
  IdentityAssertionBuilder,
  IdentityAssertionSigner,
  CallbackCredentialHolder,
} from "./IdentityAssertion.js";
export { Trustmark } from "./Trustmark.js";
export { isActionsAssertion } from "./assertions.js";
export * from "./Settings.js";

// New in the koffi PoC: Adobe claims-signer/CAWG-identity signing,
// implemented in shared Rust (adobe_api) rather than reimplemented per
// language binding. See RFC.md.
export { AdobeSigner } from "./AdobeSigner.js";
export type { AdobeIdentity } from "./native/adobeContext.js";
