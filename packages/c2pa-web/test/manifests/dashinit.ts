/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { ManifestStore } from '@contentauth/c2pa-types';
import { expect } from 'vitest';

export default {
  active_manifest: 'contoso:urn:uuid:FA0E000D-FA0E-000D-FA0E-000DFA0E000D',
  manifests: {
    'contoso:urn:uuid:FA0E000D-FA0E-000D-FA0E-000DFA0E000D': {
      assertions: [
        {
          data: {
            alg: 'sha256',
            exclusions: [
              {
                xpath: '/ftyp',
              },
              {
                data: [
                  {
                    offset: 8,
                    value: expect.any(Array),
                  },
                ],
                xpath: '/uuid',
              },
              {
                xpath: '/mfra',
              },
            ],
            merkle: [
              {
                alg: 'sha256',
                count: 11,
                hashes: expect.any(Array),
                initHash: expect.any(Array),
                localId: 1,
                uniqueId: 1,
              },
            ],
          },
          label: 'c2pa.hash.bmff.v2',
        },
      ],
      claim_generator: 'drmprovenancemanifestbuilder/1.0',
      claim_generator_info: [
        {
          name: 'Test provenance manaifest builder',
        },
      ],
      format: 'video/mp4',
      instance_id: '1.0',
      label: 'contoso:urn:uuid:FA0E000D-FA0E-000D-FA0E-000DFA0E000D',
      signature_info: {
        alg: 'Es256',
        cert_serial_number: '231582073800106855458784768030131201943489567163',
        common_name: 'Alice',
        issuer: 'Media Publisher Company',
      },
    },
  },
  validation_results: {
    activeManifest: {
      failure: [
        {
          code: 'signingCredential.untrusted',
          explanation: 'signing certificate untrusted',
          url: 'self#jumbf=/c2pa/contoso:urn:uuid:FA0E000D-FA0E-000D-FA0E-000DFA0E000D/c2pa.signature',
        },
      ],
      informational: [],
      success: [
        {
          code: 'claimSignature.insideValidity',
          explanation: 'claim signature valid',
          url: 'self#jumbf=/c2pa/contoso:urn:uuid:FA0E000D-FA0E-000D-FA0E-000DFA0E000D/c2pa.signature',
        },
        {
          code: 'claimSignature.validated',
          explanation: 'claim signature valid',
          url: 'self#jumbf=/c2pa/contoso:urn:uuid:FA0E000D-FA0E-000D-FA0E-000DFA0E000D/c2pa.signature',
        },
        {
          code: 'assertion.hashedURI.match',
          explanation:
            'hashed uri matched: self#jumbf=c2pa/contoso:urn:uuid:FA0E000D-FA0E-000D-FA0E-000DFA0E000D/c2pa.assertions/c2pa.hash.bmff.v2',
          url: 'self#jumbf=c2pa/contoso:urn:uuid:FA0E000D-FA0E-000D-FA0E-000DFA0E000D/c2pa.assertions/c2pa.hash.bmff.v2',
        },
        {
          code: 'assertion.bmffHash.match',
          explanation: 'BMFF hash valid',
          url: 'self#jumbf=/c2pa/contoso:urn:uuid:FA0E000D-FA0E-000D-FA0E-000DFA0E000D/c2pa.assertions/c2pa.hash.bmff.v2',
        },
      ],
    },
  },
  validation_state: 'Valid',
  validation_status: [
    {
      code: 'signingCredential.untrusted',
      explanation: 'signing certificate untrusted',
      url: 'self#jumbf=/c2pa/contoso:urn:uuid:FA0E000D-FA0E-000D-FA0E-000DFA0E000D/c2pa.signature',
    },
  ],
} satisfies ManifestStore;
