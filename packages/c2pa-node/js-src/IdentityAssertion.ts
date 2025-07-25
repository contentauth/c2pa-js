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
import { CallbackSigner } from './index';

export class IdentityAssertionBuilder implements neon.IdentityAssertionBuilder {
  private constructor(private _builder: neon.IdentityAssertionBuilder) {}

  static async identityBuilderForCredentialHolder(
    credentialHolder: CallbackSigner,
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

  builder(): neon.IdentityAssertionBuilder {
    return this._builder;
  }
}

export class IdentityAssertionSigner implements neon.IdentityAssertionSigner {
  private constructor(private _signer: neon.IdentityAssertionSigner) {}

  static new(signer: CallbackSigner): IdentityAssertionSigner {
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

  signer(): neon.IdentityAssertionSigner {
    return this._signer;
  }
}
