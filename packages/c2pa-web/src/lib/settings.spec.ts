/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { test, describe, expect } from 'test/methods.js';
import { http, HttpResponse } from 'msw';
import { resolveSettings, MAX_RESPONSE_SIZE } from './settings.js';

describe('settings', () => {
  describe('resolveSettings', () => {
    describe('general behavior', () => {
      test('should return undefined when neither argument is provided', async () => {
        const result = await resolveSettings(undefined, undefined);
        expect(result).toBeUndefined();
      });

      test('should serialize base settings when only base is provided', async () => {
        const result = await resolveSettings({ verify: { verifyTrust: false } }, undefined);
        expect(result).toEqual(
          JSON.stringify({ builder: { generate_c2pa_archive: true }, verify: { verify_trust: false } })
        );
      });

      test('should serialize override settings when only override is provided', async () => {
        const result = await resolveSettings(undefined, { verify: { verifyTrust: false } });
        expect(result).toEqual(
          JSON.stringify({ builder: { generate_c2pa_archive: true }, verify: { verify_trust: false } })
        );
      });

      test('should accept an empty object as override', async () => {
        const result = await resolveSettings(undefined, {});
        expect(result).toEqual(
          JSON.stringify({ builder: { generate_c2pa_archive: true } })
        );
      });

      test('should merge override settings on top of base settings', async () => {
        const base = {
          verify: { verifyTrust: true, verifyAfterReading: true }
        };
        const override = {
          verify: { verifyTrust: false }
        };

        const result = await resolveSettings(base, override);

        // verifyTrust from override wins; verifyAfterReading from base is preserved
        expect(result).toEqual(
          JSON.stringify({
            builder: { generate_c2pa_archive: true },
            verify: { verify_trust: false, verify_after_reading: true }
          })
        );
      });

      test('should preserve base settings keys not present in override', async () => {
        const base = {
          verify: { verifyAfterReading: false },
          builder: { generateC2paArchive: false }
        };
        const override = {
          verify: { verifyTrust: true }
        };

        const result = await resolveSettings(base, override);

        expect(result).toEqual(
          JSON.stringify({
            builder: { generate_c2pa_archive: false },
            verify: { verify_after_reading: false, verify_trust: true }
          })
        );
      });

      test('should not throw when a settings value is null', async () => {
        // typeof null === 'object' in JS — without a null guard this crashes
        const result = await resolveSettings(undefined, { verify: null as any });
        expect(result).toEqual(
          JSON.stringify({ builder: { generate_c2pa_archive: true }, verify: null })
        );
      });

      test('should not throw when a nested settings value is null', async () => {
        const result = await resolveSettings(undefined, { trust: { userAnchors: null as any } });
        expect(result).toEqual(
          JSON.stringify({
            builder: { generate_c2pa_archive: true },
            trust: { user_anchors: null }
          })
        );
      });
    });

    describe('trust', () => {
      test('should pass through a non-url value', async () => {
        const result = await resolveSettings(undefined, {
          trust: {
            userAnchors: 'foo',
            trustAnchors: 'bar',
            allowedList: 'baz',
            trustConfig: 'qux'
          },
          cawgTrust: {
            userAnchors: 'cawg foo',
            trustAnchors: 'cawg bar',
            allowedList: 'cawg baz',
            trustConfig: 'cawg qux'
          }
        });

        expect(result).toEqual(
          JSON.stringify({
            builder: { generate_c2pa_archive: true },
            trust: {
              user_anchors: 'foo',
              trust_anchors: 'bar',
              allowed_list: 'baz',
              trust_config: 'qux'
            },
            cawg_trust: {
              user_anchors: 'cawg foo',
              trust_anchors: 'cawg bar',
              allowed_list: 'cawg baz',
              trust_config: 'cawg qux'
            }
          })
        );
      });

      test('should fetch URL trust values', async ({ requestMock }) => {
        requestMock.use(
          ...[
            http.get('http://userAnchors', () =>
              HttpResponse.text(
                '-----BEGIN CERTIFICATE-----foo-----END CERTIFICATE-----'
              )
            ),
            http.get('http://trustAnchors', () =>
              HttpResponse.text(
                '-----BEGIN CERTIFICATE-----bar-----END CERTIFICATE-----'
              )
            ),
            http.get('http://allowedList', () => HttpResponse.text('allowed')),
            http.get('http://trustConfig', () => HttpResponse.text('config'))
          ]
        );

        const result = await resolveSettings(undefined, {
          trust: {
            userAnchors: 'http://userAnchors',
            trustAnchors: 'http://trustAnchors',
            allowedList: 'http://allowedList',
            trustConfig: 'http://trustConfig'
          },
          cawgTrust: {
            userAnchors: 'http://userAnchors',
            trustAnchors: 'http://trustAnchors',
            allowedList: 'http://allowedList',
            trustConfig: 'http://trustConfig'
          }
        });

        expect(result).toEqual(
          JSON.stringify({
            builder: { generate_c2pa_archive: true },
            trust: {
              user_anchors:
                '-----BEGIN CERTIFICATE-----foo-----END CERTIFICATE-----',
              trust_anchors:
                '-----BEGIN CERTIFICATE-----bar-----END CERTIFICATE-----',
              allowed_list: 'allowed',
              trust_config: 'config'
            },
            cawg_trust: {
              user_anchors:
                '-----BEGIN CERTIFICATE-----foo-----END CERTIFICATE-----',
              trust_anchors:
                '-----BEGIN CERTIFICATE-----bar-----END CERTIFICATE-----',
              allowed_list: 'allowed',
              trust_config: 'config'
            }
          })
        );
      });

      test('should fetch URL trust values from base settings', async ({ requestMock }) => {
        requestMock.use(
          http.get('http://baseTrustAnchors', () =>
            HttpResponse.text(
              '-----BEGIN CERTIFICATE-----base-----END CERTIFICATE-----'
            )
          )
        );

        // URL in base settings should be fetched even when override is also present.
        const result = await resolveSettings(
          { trust: { trustAnchors: 'http://baseTrustAnchors' } },
          { verify: { verifyTrust: true } }
        );

        expect(result).toContain('-----BEGIN CERTIFICATE-----base-----END CERTIFICATE-----');
      });

      test('should concatenate the fetched results of URLs when given as an array', async ({
        requestMock
      }) => {
        requestMock.use(
          http.get('http://userAnchorsConcat', () =>
            HttpResponse.text(
              '-----BEGIN CERTIFICATE-----qux-----END CERTIFICATE-----'
            )
          )
        );

        const result = await resolveSettings(undefined, {
          trust: {
            userAnchors: [
              'http://userAnchorsConcat',
              'http://userAnchorsConcat'
            ]
          }
        });

        expect(result).toEqual(
          JSON.stringify({
            builder: { generate_c2pa_archive: true },
            trust: {
              user_anchors:
                '-----BEGIN CERTIFICATE-----qux-----END CERTIFICATE----------BEGIN CERTIFICATE-----qux-----END CERTIFICATE-----'
            }
          })
        );
      });

      test('should report an error when fetching a URL without a certificate', async ({
        requestMock
      }) => {
        requestMock.use(
          http.get('http://userAnchorsShouldFail', () =>
            HttpResponse.text('invalid')
          )
        );

        const resultPromise = resolveSettings(undefined, {
          trust: {
            userAnchors: 'http://userAnchorsShouldFail'
          }
        });

        await expect(resultPromise).rejects.toThrow(
          'Failed to resolve trust settings.'
        );
      });

      test('should report a meaningful error when a trust URL returns a non-OK HTTP response', async ({
        requestMock
      }) => {
        requestMock.use(
          http.get('http://userAnchors429', () =>
            new HttpResponse(null, { status: 429, statusText: 'Too Many Requests' })
          )
        );

        const resultPromise = resolveSettings(undefined, {
          trust: {
            userAnchors: 'http://userAnchors429'
          }
        });

        await expect(resultPromise).rejects.toThrow(
          'Failed to fetch http://userAnchors429: 429'
        );
      });

      test('should not fetch URLs for unknown keys not defined in TrustSettings', async ({
        requestMock
      }) => {
        let unknownKeyFetched = false;
        requestMock.use(
          http.get('http://unknownKey', () => {
            unknownKeyFetched = true;
            return HttpResponse.text('should not be fetched');
          }),
          http.get('http://trustAnchors', () =>
            HttpResponse.text(
              '-----BEGIN CERTIFICATE-----bar-----END CERTIFICATE-----'
            )
          )
        );

        const result = await resolveSettings(undefined, {
          trust: {
            trustAnchors: 'http://trustAnchors',
            ...(({ unknownKey: 'http://unknownKey' }) as any)
          }
        });

        expect(unknownKeyFetched).toBe(false);
        expect(result).toContain('trust_anchors');
      });

      test('should not crash when a CawgTrustSettings boolean field is present', async () => {
        const resultPromise = resolveSettings(undefined, {
          cawgTrust: {
            verifyTrustList: true
          }
        });

        await expect(resultPromise).resolves.not.toThrow();
      });

      test('should throw when a fetched response exceeds the size limit', async ({
        requestMock
      }) => {
        const oversizedBody = 'x'.repeat(MAX_RESPONSE_SIZE + 1);
        requestMock.use(
          http.get('http://oversized', () => HttpResponse.text(oversizedBody))
        );

        const resultPromise = resolveSettings(undefined, {
          trust: {
            trustConfig: 'http://oversized'
          }
        });

        await expect(resultPromise).rejects.toThrow(
          'Failed to resolve trust settings.'
        );
      });
    });
  });
});
