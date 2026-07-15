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

// This is the generic X.509/CAWG-identity signing path, built on
// c2pa_identity_signer_create — a public c2pa-rs C API function that
// combines an already-built C2PA signer and an already-built identity
// signer into one signer that embeds a cawg.identity assertion (sig_type
// cawg.x509.cose) into every manifest it signs. Unlike the other gaps in
// this PoC, this one had no upstream blocker: the function already exists,
// this file just finishes the koffi-side marshaling for it.
//
// The one real constraint is the same one CallbackSigner hits (see
// Signer.ts): koffi's native signer callback must return synchronously, so
// a genuinely async JS credential-holder callback (CallbackCredentialHolder)
// can't be bridged through it. LocalCredentialHolder is the synchronous,
// local-key counterpart — the identity-side equivalent of LocalSigner —
// and works today with no such limitation.

import type { HasNativeSigner } from "./Signer.js";
import { Signer as NativeSigner, type NativeSigningAlg } from "./native/signer.js";
import type {
  CallbackCredentialHolderInterface,
  IdentityAssertionBuilderInterface,
  IdentityAssertionSignerInterface,
  SignerPayload,
  SigningAlg,
} from "./types.d.ts";

interface CredentialHolderLike extends HasNativeSigner {
  getHandle(): unknown;
}

/**
 * Synchronous, local-key X.509 identity/credential holder — the
 * counterpart to LocalSigner, for the CAWG identity side of
 * c2pa_identity_signer_create. No async bridge needed, so (unlike
 * CallbackCredentialHolder) this works today.
 */
export class LocalCredentialHolder implements HasNativeSigner {
  private _native?: NativeSigner;

  private constructor(
    private _alg: NativeSigningAlg,
    private _certs: Buffer,
    private _privateKey: Buffer,
    private _tsaUrl?: string,
  ) {}

  static newCredentialHolder(
    certificate: Buffer,
    privateKey: Buffer,
    algorithm: SigningAlg,
    tsaUrl?: string,
  ): LocalCredentialHolder {
    return new LocalCredentialHolder(algorithm, certificate, privateKey, tsaUrl);
  }

  nativeSigner(): NativeSigner {
    if (!this._native) {
      this._native = NativeSigner.fromInfo({
        alg: this._alg,
        signCert: this._certs.toString("utf8"),
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

export class CallbackCredentialHolder
  implements CallbackCredentialHolderInterface, HasNativeSigner
{
  private constructor(
    private _reserveSize: number,
    private _sigType: string,
    private _callback: (payload: SignerPayload) => Promise<Buffer>,
  ) {}

  static newCallbackCredentialHolder(
    reserveSize: number,
    sigType: string,
    callback: (signerPayload: SignerPayload) => Promise<Buffer>,
  ): CallbackCredentialHolder {
    return new CallbackCredentialHolder(reserveSize, sigType, callback);
  }

  getHandle(): unknown {
    return this;
  }

  async sign(payload: SignerPayload): Promise<Buffer> {
    return this._callback(payload);
  }

  reserveSize(): number {
    return this._reserveSize;
  }

  sigType(): string {
    return this._sigType;
  }

  /**
   * c2pa_identity_signer_create needs a real, already-built C2paSigner*
   * for the identity side. A genuinely async JS callback can't be bridged
   * into one — same root cause as CallbackSigner (see Signer.ts and
   * Decision 2 in the migration proposal). Unlike CallbackSigner, there's
   * no certificate data on this class to even attempt building a native
   * signer with, so this fails immediately and explicitly rather than
   * deferring to a callback that would fail later anyway.
   */
  nativeSigner(): NativeSigner {
    throw new Error(
      "CallbackCredentialHolder cannot be used with Builder.signAsync(): " +
        "koffi's native signer callback must return synchronously, and " +
        "this credential holder's callback is async — a genuine async JS " +
        "callback cannot be bridged through koffi. Use " +
        "LocalCredentialHolder for local-key identity signing instead.",
    );
  }
}

export class IdentityAssertionBuilder implements IdentityAssertionBuilderInterface {
  private _referencedAssertions: string[] = [];
  private _roles: string[] = [];

  private constructor(private _credentialHolder: CredentialHolderLike) {}

  static async identityBuilderForCredentialHolder(
    credentialHolder: CallbackCredentialHolderInterface | LocalCredentialHolder,
  ): Promise<IdentityAssertionBuilder> {
    return new IdentityAssertionBuilder(credentialHolder as unknown as CredentialHolderLike);
  }

  addReferencedAssertions(referencedAssertions: string[]): void {
    this._referencedAssertions.push(...referencedAssertions);
  }

  addRoles(roles: string[]): void {
    this._roles.push(...roles);
  }

  builder(): unknown {
    return this;
  }

  /** @internal */ credentialHolder(): CredentialHolderLike {
    return this._credentialHolder;
  }

  /** @internal */ referencedAssertionsList(): string[] {
    return this._referencedAssertions;
  }

  /** @internal */ rolesList(): string[] {
    return this._roles;
  }
}

export class IdentityAssertionSigner
  implements IdentityAssertionSignerInterface, HasNativeSigner
{
  private _pendingAssertion?: IdentityAssertionBuilder;
  private _combined?: NativeSigner;

  private constructor(private _c2paSigner: HasNativeSigner) {}

  /** `signer` is the opaque handle from a LocalSigner/CallbackSigner's
   * getHandle() — matches this codebase's existing convention (see
   * Builder.ts) of treating these as `unknown` at the public API boundary
   * and casting to `HasNativeSigner` internally. */
  static new(signer: unknown): IdentityAssertionSigner {
    return new IdentityAssertionSigner(signer as HasNativeSigner);
  }

  /**
   * IMPORTANT: c2pa_identity_signer_create (the C API this PoC uses for
   * Decision 4) combines exactly one identity signer per call — unlike
   * Neon's generic dynamic-assertion mechanism, which supports attaching
   * multiple identity assertions to one signer. Calling this more than
   * once is not supported here.
   */
  addIdentityAssertion(identityAssertionBuilder: IdentityAssertionBuilderInterface): void {
    if (this._pendingAssertion) {
      throw new Error(
        "This koffi PoC's c2pa_identity_signer_create supports only one " +
          "identity assertion per sign operation (Neon's generic dynamic-" +
          "assertion mechanism supports multiple; the simpler C API " +
          "convenience wrapper used here for Decision 4 does not). " +
          "addIdentityAssertion() was called more than once.",
      );
    }
    this._pendingAssertion = identityAssertionBuilder as IdentityAssertionBuilder;
  }

  nativeSigner(): NativeSigner {
    if (!this._combined) {
      if (!this._pendingAssertion) {
        throw new Error(
          "IdentityAssertionSigner has no identity assertion — call " +
            "addIdentityAssertion() before signing.",
        );
      }
      const c2paNative = this._c2paSigner.nativeSigner();
      const identityNative = this._pendingAssertion.credentialHolder().nativeSigner();
      this._combined = NativeSigner.fromIdentity(
        c2paNative,
        identityNative,
        this._pendingAssertion.referencedAssertionsList(),
        this._pendingAssertion.rolesList(),
      );
    }
    return this._combined;
  }

  /** See CallbackSigner.lastSyncError() — surfaces the real reason a sign()
   * call failed when the wrapped c2pa signer's callback couldn't bridge. */
  lastSyncError(): Error | undefined {
    return this._c2paSigner.lastSyncError?.();
  }

  getHandle(): unknown {
    return this;
  }
}
