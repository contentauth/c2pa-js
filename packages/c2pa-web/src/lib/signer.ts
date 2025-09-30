/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

export type SigningAlg =
  | 'es256'
  | 'es384'
  | 'es512'
  | 'ps256'
  | 'ps384'
  | 'ps512'
  | 'ed25519';

export interface Signer {
  sign: (data: Uint8Array, reserveSize: number) => Promise<Uint8Array>;
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
    alg,
  };
}
