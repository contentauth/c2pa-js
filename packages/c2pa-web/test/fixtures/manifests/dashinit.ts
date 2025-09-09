/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

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
                    value: '2P7D1hsOSDySl1goh37EgQ==',
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
                hashes: [
                  [
                    32, 27, 124, 253, 19, 16, 238, 99, 19, 245, 165, 233, 110,
                    225, 224, 222, 161, 102, 0, 71, 38, 206, 73, 77, 223, 1,
                    107, 162, 104, 32, 243, 9,
                  ],
                  [
                    192, 181, 181, 219, 136, 29, 104, 246, 176, 186, 209, 51,
                    55, 131, 205, 169, 239, 127, 116, 236, 64, 87, 223, 54, 112,
                    105, 28, 230, 157, 81, 34, 38,
                  ],
                  [
                    153, 235, 245, 57, 193, 14, 6, 251, 138, 167, 158, 186, 20,
                    9, 28, 207, 137, 31, 115, 195, 30, 109, 233, 70, 144, 84, 8,
                    59, 16, 37, 141, 201,
                  ],
                ],
                initHash: 'I06fNAlptpr/4DcJZ/wIMRgd0bb6qygVCrodNQhhvbI=',
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
      ingredients: [],
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
      failure: [],
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
          explanation: 'data hash valid',
          url: 'self#jumbf=/c2pa/contoso:urn:uuid:FA0E000D-FA0E-000D-FA0E-000DFA0E000D/c2pa.assertions/c2pa.hash.bmff.v2',
        },
      ],
    },
  },
  validation_state: 'Valid',
};
