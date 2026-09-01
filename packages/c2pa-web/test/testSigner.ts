/**
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import type { Signer } from '../src/lib/signer.js';

import ed25519_pub from './trust/ed25519.pub?raw';
import ed25519_pem from './trust/ed25519.pem?raw';

/**
 * Creates a signer suitable for testing from an ed25519 private key / certificate pair.
 */
export async function createTestSigner(): Promise<Signer> {
  const certBytes = extractDerBytes(ed25519_pub);

  const privateKeyBytes = extractDerBytes(ed25519_pem);

  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBytes,
    {
      name: 'Ed25519'
    },
    false,
    ['sign']
  );

  return {
    async sign(data) {
      const signature = await crypto.subtle.sign(
        {
          name: 'Ed25519'
        },
        privateKey,
        data
      );

      return new Uint8Array(signature);
    },
    async reserveSize() {
      return 1000;
    },
    alg: 'ed25519',
    certs: [new Uint8Array(certBytes)],
    directCoseHandling: false
  };
}

function extractDerBytes(str: string): ArrayBuffer {
  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  const pemContents = str.substring(
    pemHeader.length,
    str.length - pemFooter.length - 1
  );
  // base64 decode the string to get the binary data
  const binaryDerString = window.atob(pemContents);
  // convert from a binary string to an ArrayBuffer
  const binaryDer = str2ab(binaryDerString);

  return binaryDer;
}

function str2ab(str: string): ArrayBuffer {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}
