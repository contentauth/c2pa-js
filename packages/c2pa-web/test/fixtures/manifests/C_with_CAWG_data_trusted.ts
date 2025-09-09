/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

export default {
  active_manifest: 'urn:c2pa:822f2ec0-ef27-4d95-88b4-74586c12873d',
  manifests: {
    'urn:c2pa:822f2ec0-ef27-4d95-88b4-74586c12873d': {
      assertions: [
        {
          data: {
            actions: [
              {
                action: 'c2pa.created',
                digitalSourceType:
                  ' http://cv.iptc.org/newscodes/digitalsourcetype/digitalCapture',
              },
            ],
            allActionsIncluded: true,
          },
          label: 'c2pa.actions.v2',
        },
        {
          data: {
            entries: {
              'cawg.ai_generative_training': {
                use: 'notAllowed',
              },
              'cawg.ai_inference': {
                use: 'notAllowed',
              },
            },
          },
          label: 'cawg.training-mining',
        },
        {
          data: {
            signature_info: {
              alg: 'Ed25519',
              cert_serial_number:
                '638838410810235485828984295321338730070538954823',
              issuer: 'C2PA Test Signing Cert',
              revocation_status: true,
            },
            signer_payload: {
              referenced_assertions: [
                {
                  hash: 'rBBgURB+/0Bc2Uk3+blNpYTGQTxOwzXQ2xhjA3gsqI4=',
                  url: 'self#jumbf=c2pa.assertions/cawg.training-mining',
                },
                {
                  hash: 'sASozh9KFSkW+cyMI0Pw5KYoD2qn7MkUEq9jUUhe/sM=',
                  url: 'self#jumbf=c2pa.assertions/c2pa.hash.data',
                },
              ],
              sig_type: 'cawg.x509.cose',
            },
          },
          label: 'cawg.identity',
        },
      ],
      claim_generator_info: [
        {
          name: 'c2pa cawg test',
          'org.contentauth.c2pa_rs': '0.58.0',
          version: '0.58.0',
        },
      ],
      ingredients: [],
      instance_id: 'xmp:iid:855872d9-5358-497e-b7b4-afca591277e1',
      label: 'urn:c2pa:822f2ec0-ef27-4d95-88b4-74586c12873d',
      signature_info: {
        alg: 'Es256',
        cert_serial_number: '640229841392226413189608867977836244731148734950',
        common_name: 'C2PA Signer',
        issuer: 'C2PA Test Signing Cert',
        time: '2025-07-29T23:13:49+00:00',
      },
      thumbnail: {
        format: 'image/jpeg',
        identifier:
          'self#jumbf=/c2pa/urn:c2pa:822f2ec0-ef27-4d95-88b4-74586c12873d/c2pa.assertions/c2pa.thumbnail.claim',
      },
      title: 'C_with_CAWG_data.jpg',
    },
  },
  validation_results: {
    activeManifest: {
      failure: [],
      informational: [
        {
          code: 'timeStamp.untrusted',
          explanation:
            'timestamp cert untrusted: DigiCert SHA256 RSA4096 Timestamp Responder 2025 1',
          url: 'self#jumbf=/c2pa/urn:c2pa:822f2ec0-ef27-4d95-88b4-74586c12873d/c2pa.signature',
        },
      ],
      success: [
        {
          code: 'timeStamp.validated',
          explanation:
            'timestamp message digest matched: DigiCert SHA256 RSA4096 Timestamp Responder 2025 1',
          url: 'self#jumbf=/c2pa/urn:c2pa:822f2ec0-ef27-4d95-88b4-74586c12873d/c2pa.signature',
        },
        {
          code: 'signingCredential.trusted',
          explanation:
            'signing certificate trusted, found in System trust anchors',
          url: 'self#jumbf=/c2pa/urn:c2pa:822f2ec0-ef27-4d95-88b4-74586c12873d/c2pa.signature',
        },
        {
          code: 'claimSignature.insideValidity',
          explanation: 'claim signature valid',
          url: 'self#jumbf=/c2pa/urn:c2pa:822f2ec0-ef27-4d95-88b4-74586c12873d/c2pa.signature',
        },
        {
          code: 'claimSignature.validated',
          explanation: 'claim signature valid',
          url: 'self#jumbf=/c2pa/urn:c2pa:822f2ec0-ef27-4d95-88b4-74586c12873d/c2pa.signature',
        },
        {
          code: 'assertion.hashedURI.match',
          explanation:
            'hashed uri matched: self#jumbf=c2pa.assertions/c2pa.thumbnail.claim',
          url: 'self#jumbf=/c2pa/urn:c2pa:822f2ec0-ef27-4d95-88b4-74586c12873d/c2pa.assertions/c2pa.thumbnail.claim',
        },
        {
          code: 'assertion.hashedURI.match',
          explanation:
            'hashed uri matched: self#jumbf=c2pa.assertions/c2pa.actions.v2',
          url: 'self#jumbf=/c2pa/urn:c2pa:822f2ec0-ef27-4d95-88b4-74586c12873d/c2pa.assertions/c2pa.actions.v2',
        },
        {
          code: 'assertion.hashedURI.match',
          explanation:
            'hashed uri matched: self#jumbf=c2pa.assertions/c2pa.hash.data',
          url: 'self#jumbf=/c2pa/urn:c2pa:822f2ec0-ef27-4d95-88b4-74586c12873d/c2pa.assertions/c2pa.hash.data',
        },
        {
          code: 'assertion.hashedURI.match',
          explanation:
            'hashed uri matched: self#jumbf=c2pa.assertions/cawg.training-mining',
          url: 'self#jumbf=/c2pa/urn:c2pa:822f2ec0-ef27-4d95-88b4-74586c12873d/c2pa.assertions/cawg.training-mining',
        },
        {
          code: 'assertion.hashedURI.match',
          explanation:
            'hashed uri matched: self#jumbf=c2pa.assertions/cawg.identity',
          url: 'self#jumbf=/c2pa/urn:c2pa:822f2ec0-ef27-4d95-88b4-74586c12873d/c2pa.assertions/cawg.identity',
        },
        {
          code: 'assertion.dataHash.match',
          explanation: 'data hash valid',
          url: 'self#jumbf=/c2pa/urn:c2pa:822f2ec0-ef27-4d95-88b4-74586c12873d/c2pa.assertions/c2pa.hash.data',
        },
        {
          code: 'signingCredential.trusted',
          explanation:
            'signing certificate trusted, found in System trust anchors',
          url: 'self#jumbf=/c2pa/urn:c2pa:822f2ec0-ef27-4d95-88b4-74586c12873d/c2pa.assertions/cawg.identity',
        },
        {
          code: 'cawg.identity.well-formed',
          explanation: 'CAWG X.509 identity signature valid',
          url: 'self#jumbf=/c2pa/urn:c2pa:822f2ec0-ef27-4d95-88b4-74586c12873d/c2pa.assertions/cawg.identity',
        },
      ],
    },
  },
  validation_state: 'Trusted',
};
