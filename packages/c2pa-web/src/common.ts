/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

export type { Config, C2pa } from './lib/c2pa.js';
export { encodeSignerPayload } from './lib/signer.js';

export type { ManifestAndAssetBytes } from './lib/builder.js';

export type {
  Signer,
  SigningAlg,
  HashedUri,
  SignerPayload,
  SignerPayloadInput,
  CredentialHolder,
  IdentityAssertion,
  SignOptions
} from './lib/signer.js';

// Re-export types from c2pa-types for convenience.
export type * from '@contentauth/c2pa-types';
