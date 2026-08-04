/**
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import type { SigningAlg as SchemaSigningAlg } from '@contentauth/c2pa-types';

/**
 * The digital signature algorithms allowed by the C2PA spec, as accepted/produced by `c2pa-rs`
 * at the signer construction boundary (`Signer.alg`, `LocalSigner`/`CallbackSigner` config, etc).
 *
 * `c2pa-rs` deserializes and displays this value as lowercase here, which is distinct from the
 * PascalCase casing it serializes into manifests (see `SigningAlg` from `@contentauth/c2pa-types`,
 * used for `SignatureInfo.alg` when reading manifests) — hence this is derived from that schema
 * type rather than being identical to it.
 */
export type SigningAlg = Lowercase<SchemaSigningAlg>;
