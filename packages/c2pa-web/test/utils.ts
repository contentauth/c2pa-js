/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import type { Signer, SigningAlg } from '../src/lib/signer.js';

export async function getBlobForAsset(src: string): Promise<Blob> {
  const response = await fetch(src);
  const blob = await response.blob();

  return blob;
}

/**
 * Creates a no-op signer for tests that use verifyAfterReading: false.
 * Returns zero-filled bytes of the required reserveSize — sufficient because
 * direct_cose_handling=true stores the bytes as-is and verification is skipped.
 */
export async function createTestSigner(): Promise<Signer> {
  return {
    alg: 'es256' as SigningAlg,
    reserveSize: async () => 10000,
    sign: async (_data, reserveSize) =>
      new Uint8Array(reserveSize) as Uint8Array<ArrayBuffer>
  };
}
