/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import type { SigningAlg } from '@contentauth/c2pa-utilities';

export type { SigningAlg };

export interface Signer {
  sign: (
    data: Uint8Array<ArrayBuffer>,
    reserveSize: number
  ) => Promise<Uint8Array<ArrayBuffer>>;
  reserveSize: () => Promise<number>;
  alg: SigningAlg;
}

export interface SerializableSigningPayload {
  reserveSize: number;
  alg: SigningAlg;
}

export async function getSerializablePayload(
  signer: Signer
): Promise<SerializableSigningPayload> {
  const { alg } = signer;
  const reserveSize = await signer.reserveSize();

  return {
    reserveSize,
    alg
  };
}

/**
 * A hashed reference to another assertion within the same manifest. Mirrors
 * the shape the c2pa-wasm `WasmCredentialHolder` builds from c2pa-rs's
 * `HashedUri` (see `packages/c2pa-wasm/src/wasm_credential_holder.rs`).
 */
export interface HashedUri {
  url: string;
  hash: Uint8Array<ArrayBuffer>;
  alg?: string;
}

/**
 * The data a CAWG {@link CredentialHolder} is asked to sign over. Passed to
 * {@link CredentialHolder.sign} exactly as built by c2pa-wasm's
 * `WasmCredentialHolder` (camelCase field names, matching the
 * adobe-web/utilities `encodeSignerPayload` contract).
 */
export interface SignerPayload {
  referencedAssertions: HashedUri[];
  sigType: string;
  roles: string[];
}

/**
 * A CAWG credential holder: something able to produce a signature over a
 * {@link SignerPayload} on behalf of a credential (e.g. a verified identity,
 * or an enterprise x509 certificate). Analogous to {@link Signer}, but for
 * a `cawg.identity` assertion rather than the manifest's own claim signature.
 *
 * `sign`, like {@link Signer.sign}, always runs on the main thread: it never
 * crosses into the worker directly. See `Builder.sign`/
 * `Builder.signAndGetManifestBytes` for how it's wired up via reverse-RPC.
 */
export interface CredentialHolder {
  sigType: string;
  reserveSize: number;
  sign: (payload: SignerPayload) => Promise<Uint8Array<ArrayBuffer>>;
}

/**
 * Configuration for a single CAWG identity assertion (`cawg.identity`) to
 * attach when signing.
 */
export interface IdentityAssertion {
  credentialHolder: CredentialHolder;
  /**
   * Assertion labels to include as referenced assertions for this identity
   * assertion, in addition to the hard-binding hash assertion (which is
   * always included).
   */
  referencedAssertions?: string[];
  /** Named actor roles to attach to this identity assertion. */
  roles?: string[];
}

/** Options accepted by `Builder.sign`/`Builder.signAndGetManifestBytes`. */
export interface SignOptions {
  identityAssertions?: IdentityAssertion[];
}

/**
 * The serializable (structured-cloneable) form of an {@link IdentityAssertion}
 * sent browser->worker alongside the main signer payload. `requestId`
 * identifies the reverse-RPC registration for this identity assertion's
 * `credentialHolder.sign`, mirroring how the plain signer's `sign` is
 * registered and referenced by `requestId` in {@link SerializableSigningPayload}'s
 * companion RPC call.
 */
export interface SerializableIdentityAssertion {
  requestId: number;
  sigType: string;
  reserveSize: number;
  referencedAssertions: string[];
  roles: string[];
}

/**
 * Builds the serializable payload for a single {@link IdentityAssertion},
 * given the `requestId` already assigned to its credential holder's `sign`
 * (via `WorkerManager.registerCredentialHolderReceiver`).
 */
export function getSerializableIdentityAssertion(
  identityAssertion: IdentityAssertion,
  requestId: number
): SerializableIdentityAssertion {
  const { credentialHolder, referencedAssertions, roles } = identityAssertion;

  return {
    requestId,
    sigType: credentialHolder.sigType,
    reserveSize: credentialHolder.reserveSize,
    referencedAssertions: referencedAssertions ?? [],
    roles: roles ?? []
  };
}
