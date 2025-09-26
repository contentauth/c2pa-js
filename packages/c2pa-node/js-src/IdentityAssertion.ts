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

const neon = require("./index.node");
import type {
  CallbackCredentialHolderInterface,
  CallbackSignerInterface,
  IdentityAssertionBuilderInterface,
  IdentityAssertionSignerInterface,
  SignerPayload,
} from "./types";

export class IdentityAssertionBuilder
  implements IdentityAssertionBuilderInterface
{
  constructor(private _builder: IdentityAssertionBuilderInterface) {}

  static async identityBuilderForCredentialHolder(
    credentialHolder: CallbackCredentialHolderInterface,
  ): Promise<IdentityAssertionBuilder> {
    const builder = neon.identityBuilderForCredentialHolder(
      credentialHolder.signer(),
    );
    return new IdentityAssertionBuilder(builder);
  }

  addReferencedAssertions(referencedAssertions: string[]): void {
    neon.identityBuilderAddReferencedAssertions.call(
      this._builder,
      referencedAssertions,
    );
  }

  addRoles(roles: string[]): void {
    neon.identityBuilderAddRoles.call(this._builder, roles);
  }

  builder(): IdentityAssertionBuilderInterface {
    return this._builder;
  }
}

export class IdentityAssertionSigner
  implements IdentityAssertionSignerInterface
{
  constructor(private _signer: IdentityAssertionSignerInterface) {}

  static new(signer: CallbackSignerInterface): IdentityAssertionSigner {
    const identitySigner = neon.identitySignerNew(signer.signer());
    return new IdentityAssertionSigner(identitySigner);
  }

  addIdentityAssertion(
    identityAssertionBuilder: IdentityAssertionBuilder,
  ): void {
    neon.identitySignerAddIdentityAssertion.call(
      this._signer,
      identityAssertionBuilder.builder(),
    );
  }

  signer(): IdentityAssertionSignerInterface {
    return this._signer;
  }
}

export class CallbackCredentialHolder
  implements CallbackCredentialHolderInterface
{
  constructor(
    private callbackCredentialHolder: CallbackCredentialHolderInterface,
  ) {}

  signer(): CallbackCredentialHolderInterface {
    return this.callbackCredentialHolder;
  }

  static newCallbackCredentialHolder(
    reserveSize: number,
    sigType: string,
    callback: (signerPayload: SignerPayload) => Promise<Buffer>,
  ) {
    const credentialHolder = neon.newCallbackCredentialHolder(
      reserveSize,
      sigType,
      callback,
    );
    return new CallbackCredentialHolder(credentialHolder);
  }

  async sign(payload: SignerPayload): Promise<Buffer> {
    return neon.callbackSignerSignPayload.call(
      this.callbackCredentialHolder,
      payload,
    );
  }

  reserveSize(): number {
    return neon.callbackCredentialHolderReserveSize.call(
      this.callbackCredentialHolder,
    );
  }

  sigType(): string {
    return neon.callbackCredentialHolderSigType.call(
      this.callbackCredentialHolder,
    );
  }
}
