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
