/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import type { SigningAlg } from '@contentauth/c2pa-utilities';
import type { C2pa } from './c2pa.js';

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
 * `WasmCredentialHolder`.
 */
export interface SignerPayload {
  referencedAssertions: HashedUri[];
  sigType: string;
  roles: string[];
}

/** Input to {@link encodeSignerPayload}; absent or empty roles are omitted. */
export type SignerPayloadInput = Omit<SignerPayload, 'roles'> & {
  roles?: string[];
};

/**
 * Encode a CAWG SignerPayload using c2pa_cbor in this instance's existing
 * worker. Hashes become CBOR byte strings; the wire keys are
 * referenced_assertions, sig_type, and (when nonempty) role. The payload is
 * copied to the worker, so encoding does not detach the caller's hash buffers.
 *
 * Input names are case-sensitive: referencedAssertions, sigType, roles, and each
 * reference's url, hash, and alg. Wire-format names are not aliases. Missing or
 * incorrectly cased required fields are rejected; unknown data properties are
 * ignored, including incorrectly cased optional fields. Omitted, undefined, or
 * empty roles are omitted on the wire; null roles are rejected.
 *
 * Use plain data objects with Uint8Array hashes. The entire payload, including
 * unknown properties, must be structured-cloneable. An unknown function
 * property that Node can ignore still causes a cloning failure here. Validation
 * and cloning failures reject the Promise; Node's validation throws synchronously.
 * Error types and messages are binding-specific.
 */
export async function encodeSignerPayload(
  c2pa: C2pa,
  payload: SignerPayloadInput
): Promise<Uint8Array<ArrayBuffer>> {
  return c2pa.worker.tx.encodeSignerPayload(payload);
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
