/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { expect } from 'vitest';

export default {
  active_manifest: 'urn:c2pa:822f2ec0-ef27-4d95-88b4-74586c12873d',
  manifests: {
    'urn:c2pa:822f2ec0-ef27-4d95-88b4-74586c12873d': {
      claim_generator_info: [
        {
          name: 'c2pa cawg test',
          version: '0.58.0',
          'org.contentauth.c2pa_rs': '0.58.0',
        },
      ],
      title: 'C_with_CAWG_data.jpg',
      instance_id: 'xmp:iid:855872d9-5358-497e-b7b4-afca591277e1',
      thumbnail: {
        format: 'image/jpeg',
        identifier:
          'self#jumbf=/c2pa/urn:c2pa:822f2ec0-ef27-4d95-88b4-74586c12873d/c2pa.assertions/c2pa.thumbnail.claim',
      },
      ingredients: [],
      assertions: [
        {
          label: 'c2pa.actions.v2',
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
        },
        {
          label: 'cawg.training-mining',
          data: {
            entries: {
              'cawg.ai_inference': {
                use: 'notAllowed',
              },
              'cawg.ai_generative_training': {
                use: 'notAllowed',
              },
            },
          },
        },
        {
          label: 'cawg.identity',
          data: {
            pad1: expect.any(String),
            pad2: 'AAAAAAAAAA==',
            signature:
              '0oRZBIWiAScYIYJZAkwwggJIMIIB+qADAgECAhRv5oFNfUKyMnWK4wn2RG53P/uoRzAFBgMrZXAwgYwxCzAJBgNVBAYTAlVTMQswCQYDVQQIDAJDQTESMBAGA1UEBwwJU29tZXdoZXJlMScwJQYDVQQKDB5DMlBBIFRlc3QgSW50ZXJtZWRpYXRlIFJvb3QgQ0ExGTAXBgNVBAsMEEZPUiBURVNUSU5HX09OTFkxGDAWBgNVBAMMD0ludGVybWVkaWF0ZSBDQTAeFw0yMjA2MTAxODQ2NDFaFw0zMDA4MjYxODQ2NDFaMIGAMQswCQYDVQQGEwJVUzELMAkGA1UECAwCQ0ExEjAQBgNVBAcMCVNvbWV3aGVyZTEfMB0GA1UECgwWQzJQQSBUZXN0IFNpZ25pbmcgQ2VydDEZMBcGA1UECwwQRk9SIFRFU1RJTkdfT05MWTEUMBIGA1UEAwwLQzJQQSBTaWduZXIwKjAFBgMrZXADIQAynn7R7zec2BCF2EFbxGyGSPL3SxrUD0kjOQi1wOoK4qN4MHYwDAYDVR0TAQH/BAIwADAWBgNVHSUBAf8EDDAKBggrBgEFBQcDBDAOBgNVHQ8BAf8EBAMCBsAwHQYDVR0OBBYEFO4uthGpbjC7rKMgrX+Jby53t2aRMB8GA1UdIwQYMBaAFFdMB8L8nFC9GWT9sJt08wNuxJ+pMAUGAytlcANBAHZHq9sj5fwJNELniPc1O+xSPjngbX9t3NuIdWCXef5KE4AnzkUmKATsShq/tJ5d5Wc2NzxBnVSskbCAEEQ/zgZZAi0wggIpMIIB26ADAgECAhRaqDhJpQO49XLrvU8saB/NwiwczDAFBgMrZXAwdzELMAkGA1UEBhMCVVMxCzAJBgNVBAgMAkNBMRIwEAYDVQQHDAlTb21ld2hlcmUxGjAYBgNVBAoMEUMyUEEgVGVzdCBSb290IENBMRkwFwYDVQQLDBBGT1IgVEVTVElOR19PTkxZMRAwDgYDVQQDDAdSb290IENBMB4XDTIyMDYxMDE4NDY0MVoXDTMwMDgyNzE4NDY0MVowgYwxCzAJBgNVBAYTAlVTMQswCQYDVQQIDAJDQTESMBAGA1UEBwwJU29tZXdoZXJlMScwJQYDVQQKDB5DMlBBIFRlc3QgSW50ZXJtZWRpYXRlIFJvb3QgQ0ExGTAXBgNVBAsMEEZPUiBURVNUSU5HX09OTFkxGDAWBgNVBAMMD0ludGVybWVkaWF0ZSBDQTAqMAUGAytlcAMhACTN1gFm2l1Z+nTcYs5vWWYiv/QI6x9Rrdvx5u33QOiuo2MwYTAPBgNVHRMBAf8EBTADAQH/MA4GA1UdDwEB/wQEAwIBhjAdBgNVHQ4EFgQUV0wHwvycUL0ZZP2wm3TzA27En6kwHwYDVR0jBBgwFoAUXuZWArP1jiRMfgye6ZqRyGupTowwBQYDK2VwA0EAFdqTPm9x1+1Tw9t7wkMRwVJz6tOeilPwNdjCG053ce+jtm+/R9O7A5gibEt2a7QnW75QvE2or6NE7v+NKdy/AKD2WEBHQNY8VKPuajqPbCWEqtErxuarFWhcwuD7Y9Sai5b0r9IP8MJKt5trlbu+0QVZmhc4yZtPXAazzaadUbrOXCoO',
            signer_payload: {
              referenced_assertions: [
                {
                  url: 'self#jumbf=c2pa.assertions/cawg.training-mining',
                  hash: 'rBBgURB+/0Bc2Uk3+blNpYTGQTxOwzXQ2xhjA3gsqI4=',
                },
                {
                  url: 'self#jumbf=c2pa.assertions/c2pa.hash.data',
                  hash: 'sASozh9KFSkW+cyMI0Pw5KYoD2qn7MkUEq9jUUhe/sM=',
                },
              ],
              sig_type: 'cawg.x509.cose',
            },
          },
        },
      ],
      signature_info: {
        alg: 'Es256',
        issuer: 'C2PA Test Signing Cert',
        cert_serial_number: '640229841392226413189608867977836244731148734950',
        common_name: 'C2PA Signer',
        time: '2025-07-29T23:13:49+00:00',
      },
      label: 'urn:c2pa:822f2ec0-ef27-4d95-88b4-74586c12873d',
    },
  },
  validation_results: {
    activeManifest: {
      success: [
        {
          code: 'timeStamp.validated',
          url: 'self#jumbf=/c2pa/urn:c2pa:822f2ec0-ef27-4d95-88b4-74586c12873d/c2pa.signature',
          explanation:
            'timestamp message digest matched: DigiCert SHA256 RSA4096 Timestamp Responder 2025 1',
        },
        {
          code: 'claimSignature.insideValidity',
          url: 'self#jumbf=/c2pa/urn:c2pa:822f2ec0-ef27-4d95-88b4-74586c12873d/c2pa.signature',
          explanation: 'claim signature valid',
        },
        {
          code: 'claimSignature.validated',
          url: 'self#jumbf=/c2pa/urn:c2pa:822f2ec0-ef27-4d95-88b4-74586c12873d/c2pa.signature',
          explanation: 'claim signature valid',
        },
        {
          code: 'assertion.hashedURI.match',
          url: 'self#jumbf=/c2pa/urn:c2pa:822f2ec0-ef27-4d95-88b4-74586c12873d/c2pa.assertions/c2pa.thumbnail.claim',
          explanation:
            'hashed uri matched: self#jumbf=c2pa.assertions/c2pa.thumbnail.claim',
        },
        {
          code: 'assertion.hashedURI.match',
          url: 'self#jumbf=/c2pa/urn:c2pa:822f2ec0-ef27-4d95-88b4-74586c12873d/c2pa.assertions/c2pa.actions.v2',
          explanation:
            'hashed uri matched: self#jumbf=c2pa.assertions/c2pa.actions.v2',
        },
        {
          code: 'assertion.hashedURI.match',
          url: 'self#jumbf=/c2pa/urn:c2pa:822f2ec0-ef27-4d95-88b4-74586c12873d/c2pa.assertions/c2pa.hash.data',
          explanation:
            'hashed uri matched: self#jumbf=c2pa.assertions/c2pa.hash.data',
        },
        {
          code: 'assertion.hashedURI.match',
          url: 'self#jumbf=/c2pa/urn:c2pa:822f2ec0-ef27-4d95-88b4-74586c12873d/c2pa.assertions/cawg.training-mining',
          explanation:
            'hashed uri matched: self#jumbf=c2pa.assertions/cawg.training-mining',
        },
        {
          code: 'assertion.hashedURI.match',
          url: 'self#jumbf=/c2pa/urn:c2pa:822f2ec0-ef27-4d95-88b4-74586c12873d/c2pa.assertions/cawg.identity',
          explanation:
            'hashed uri matched: self#jumbf=c2pa.assertions/cawg.identity',
        },
        {
          code: 'assertion.dataHash.match',
          url: 'self#jumbf=/c2pa/urn:c2pa:822f2ec0-ef27-4d95-88b4-74586c12873d/c2pa.assertions/c2pa.hash.data',
          explanation: 'data hash valid',
        },
      ],
      informational: [
        {
          code: 'timeStamp.untrusted',
          url: 'self#jumbf=/c2pa/urn:c2pa:822f2ec0-ef27-4d95-88b4-74586c12873d/c2pa.signature',
          explanation:
            'timestamp cert untrusted: DigiCert SHA256 RSA4096 Timestamp Responder 2025 1',
        },
      ],
      failure: [
        {
          code: 'signingCredential.untrusted',
          url: 'self#jumbf=/c2pa/urn:c2pa:822f2ec0-ef27-4d95-88b4-74586c12873d/c2pa.assertions/cawg.identity',
          explanation: 'signing certificate untrusted',
        },
      ],
    },
  },
  validation_state: 'Valid',
};
