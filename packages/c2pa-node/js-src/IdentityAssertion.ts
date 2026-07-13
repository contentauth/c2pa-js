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

// This is the generic X.509/CAWG-identity signing path. The plain c2pa-rs
// C API does expose c2pa_identity_signer_create, but marshaling its char**
// identity arrays through koffi was left as an unfinished stub in the koffi
// prototype this is based on — not attempted here either.

import type {
  CallbackCredentialHolderInterface,
  IdentityAssertionBuilderInterface,
  IdentityAssertionSignerInterface,
  SignerPayload,
} from "./types.d.ts";

function notImplemented(): Error {
  return new Error(
    "CAWG X.509 identity signing is not implemented in this koffi PoC.",
  );
}

export class IdentityAssertionBuilder implements IdentityAssertionBuilderInterface {
  private constructor() {}

  static async identityBuilderForCredentialHolder(
    _credentialHolder: CallbackCredentialHolderInterface,
  ): Promise<IdentityAssertionBuilder> {
    throw notImplemented();
  }

  addReferencedAssertions(_referencedAssertions: string[]): void {
    throw notImplemented();
  }

  addRoles(_roles: string[]): void {
    throw notImplemented();
  }

  builder(): unknown {
    throw notImplemented();
  }
}

export class IdentityAssertionSigner implements IdentityAssertionSignerInterface {
  private constructor() {}

  static new(_signer: unknown): IdentityAssertionSigner {
    throw notImplemented();
  }

  addIdentityAssertion(_identityAssertionBuilder: IdentityAssertionBuilder): void {
    throw notImplemented();
  }

  getHandle(): unknown {
    throw notImplemented();
  }
}

export class CallbackCredentialHolder implements CallbackCredentialHolderInterface {
  private constructor() {}

  static newCallbackCredentialHolder(
    _reserveSize: number,
    _sigType: string,
    _callback: (signerPayload: SignerPayload) => Promise<Buffer>,
  ): CallbackCredentialHolder {
    throw notImplemented();
  }

  getHandle(): unknown {
    throw notImplemented();
  }

  async sign(_payload: SignerPayload): Promise<Buffer> {
    throw notImplemented();
  }

  reserveSize(): number {
    throw notImplemented();
  }

  sigType(): string {
    throw notImplemented();
  }
}
