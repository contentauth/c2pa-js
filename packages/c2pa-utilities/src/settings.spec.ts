/**
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
  vi
} from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import {
  resolveSettings,
  createTrustSettings,
  createCawgTrustSettings,
  createVerifySettings,
  mergeSettings,
  settingsToJson,
  loadSettingsFromUrl,
  type TrustSettings,
  type CawgTrustSettings,
  type VerifySettings,
  type Settings
} from './settings.js';
import { DEFAULT_MAX_RESPONSE_BYTES } from './fetchWithRetry.js';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  vi.unstubAllGlobals();
});
afterAll(() => server.close());

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
        const base: Settings = {
          verify: { verifyAfterReading: false },
          builder: { generateC2paArchive: true }
        };
        const override = {
          verify: { verifyTrust: true }
        };

        const result = await resolveSettings(base, override);

        expect(result).toEqual(
          JSON.stringify({
            builder: { generate_c2pa_archive: true },
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

      test('should fetch URL trust values', async () => {
        server.use(
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

      test('should fetch URL trust values from base settings', async () => {
        server.use(
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

      test('should concatenate the fetched results of URLs when given as an array', async () => {
        server.use(
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

      test('should report an error when fetching a URL without a certificate', async () => {
        server.use(
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

      test('should not fetch URLs for unknown keys not defined in TrustSettings', async () => {
        let unknownKeyFetched = false;
        server.use(
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

      test('should throw when a fetched response exceeds the default size limit', async () => {
        const oversizedBody = 'x'.repeat(DEFAULT_MAX_RESPONSE_BYTES + 1);
        server.use(
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

      test('should respect a per-call maxResponseBytes override', async () => {
        // Body is larger than a small custom cap, but well within the default 1MB —
        // this only fails if the injected option is actually being honored.
        const body = 'x'.repeat(2048);
        server.use(
          http.get('http://customCap', () => HttpResponse.text(body))
        );

        const resultPromise = resolveSettings(
          undefined,
          { trust: { trustConfig: 'http://customCap' } },
          { maxResponseBytes: 1024 }
        );

        await expect(resultPromise).rejects.toThrow(
          'Failed to resolve trust settings.'
        );
      });

      test('should reject when an array item is not a string', async () => {
        const resultPromise = resolveSettings(undefined, {
          trust: {
            userAnchors: [123 as unknown as string]
          }
        });

        await expect(resultPromise).rejects.toThrow(
          'Failed to resolve trust settings.'
        );
      });

      test('should reject when a fetched array item fails PEM validation', async () => {
        server.use(
          http.get('http://userAnchorsArrayInvalid', () =>
            HttpResponse.text('not a cert')
          )
        );

        const resultPromise = resolveSettings(undefined, {
          trust: {
            userAnchors: ['http://userAnchorsArrayInvalid']
          }
        });

        await expect(resultPromise).rejects.toThrow(
          'Failed to resolve trust settings.'
        );
      });

    });
  });
});

describe('createTrustSettings / createCawgTrustSettings / createVerifySettings', () => {
  it('creates trust settings', () => {
    // Note: verifyTrustList is intentionally not part of the base TrustSettings type —
    // c2pa-rs documents it as CAWG-only, even though it reuses one struct for both. See
    // "creates CAWG trust settings" below for verifyTrustList coverage.
    const trustConfig: TrustSettings = {
      userAnchors: 'test',
      allowedList: 'allowed'
    };

    const settings = createTrustSettings(trustConfig);
    expect(settings.trust).toBeDefined();
    expect(settings.trust?.userAnchors).toBe('test');
    expect(settings.trust?.allowedList).toBe('allowed');
  });

  it('creates CAWG trust settings', () => {
    const trustConfig: CawgTrustSettings = {
      verifyTrustList: false,
      trustAnchors: 'anchors'
    };

    const settings = createCawgTrustSettings(trustConfig);
    expect(settings.cawgTrust).toBeDefined();
    expect(settings.cawgTrust?.verifyTrustList).toBe(false);
    expect(settings.cawgTrust?.trustAnchors).toBe('anchors');
  });

  it('creates verify settings', () => {
    const verifyConfig: VerifySettings = {
      verifyAfterReading: true,
      verifyAfterSign: false,
      verifyTrust: true,
      verifyTimestampTrust: false,
      ocspFetch: true,
      remoteManifestFetch: false,
      skipIngredientConflictResolution: true,
      strictV1Validation: false
    };

    const settings = createVerifySettings(verifyConfig);
    expect(settings.verify).toBeDefined();
    expect(settings.verify?.verifyAfterReading).toBe(true);
    expect(settings.verify?.verifyAfterSign).toBe(false);
    expect(settings.verify?.verifyTrust).toBe(true);
    expect(settings.verify?.ocspFetch).toBe(true);
  });

  it('creates verify settings with partial config', () => {
    const settings = createVerifySettings({
      verifyAfterReading: false
    });

    expect(settings.verify).toBeDefined();
    expect(settings.verify?.verifyAfterReading).toBe(false);
    expect(settings.verify?.verifyAfterSign).toBeUndefined();
    expect(settings.verify?.verifyTrust).toBeUndefined();
  });
});

describe('mergeSettings', () => {
  it('merges multiple settings', () => {
    const trustSettings = createTrustSettings({
      userAnchors: 'test'
    });

    const verifySettings = createVerifySettings({
      verifyAfterReading: false,
      verifyAfterSign: true,
      verifyTrust: true,
      verifyTimestampTrust: true,
      ocspFetch: false,
      remoteManifestFetch: true,
      skipIngredientConflictResolution: false,
      strictV1Validation: false
    });

    const merged = mergeSettings(trustSettings, verifySettings);
    expect(merged.trust).toBeDefined();
    expect(merged.verify).toBeDefined();
    expect(merged.trust?.userAnchors).toBe('test');
    expect(merged.verify?.verifyAfterReading).toBe(false);
  });

  it('merges settings with later values overriding earlier ones', () => {
    const settings1 = createVerifySettings({
      verifyAfterReading: true,
      verifyAfterSign: true,
      verifyTrust: false,
      verifyTimestampTrust: true,
      ocspFetch: false,
      remoteManifestFetch: true,
      skipIngredientConflictResolution: false,
      strictV1Validation: false
    });

    const settings2: Settings = {
      verify: {
        verifyTrust: true,
        ocspFetch: true
      }
    };

    const merged = mergeSettings(settings1, settings2);
    expect(merged.verify?.verifyAfterReading).toBe(true); // from settings1
    expect(merged.verify?.verifyTrust).toBe(true); // overridden by settings2
    expect(merged.verify?.ocspFetch).toBe(true); // overridden by settings2
  });

  it('deep-merges nested fields instead of overwriting whole sections', () => {
    // Two settings fragments each set a different sub-field of builder —
    // a shallow per-section merge would let the second clobber the first entirely,
    // losing settings1's thumbnail field.
    const settings1: Settings = {
      builder: { generateC2paArchive: true, thumbnail: { enabled: true } }
    };
    const settings2: Settings = {
      builder: { generateC2paArchive: true }
    };

    const merged = mergeSettings(settings1, settings2);
    expect(merged.builder?.thumbnail?.enabled).toBe(true);
    expect(merged.builder?.generateC2paArchive).toBe(true);
  });
});

describe('settingsToJson', () => {
  it('converts settings to JSON with snake_case keys', () => {
    const settings = createVerifySettings({
      verifyAfterReading: true,
      verifyAfterSign: true,
      verifyTrust: false,
      verifyTimestampTrust: true,
      ocspFetch: false,
      remoteManifestFetch: true,
      skipIngredientConflictResolution: false,
      strictV1Validation: false
    });

    const json = settingsToJson(settings);
    expect(json).toContain('verify');
    expect(json).toContain('verify_after_reading');

    // Should be parseable with snake_case keys
    const parsed = JSON.parse(json);
    expect(parsed.verify.verify_after_reading).toBe(true);
  });

  it('does not include undefined values in CAWG trust settings JSON', () => {
    // verifyTrustList only exists on CawgTrustSettings (see note above), so this uses
    // createCawgTrustSettings rather than createTrustSettings.
    const trustConfig: CawgTrustSettings = {
      verifyTrustList: true
    };

    const settings = createCawgTrustSettings(trustConfig);
    const json = settingsToJson(settings);
    const parsed = JSON.parse(json);

    expect(parsed.cawg_trust.verify_trust_list).toBe(true);
    expect('user_anchors' in parsed.cawg_trust).toBe(false);
    expect('trust_anchors' in parsed.cawg_trust).toBe(false);
    expect('trust_config' in parsed.cawg_trust).toBe(false);
    expect('allowed_list' in parsed.cawg_trust).toBe(false);
  });

  it('does not include undefined values in verify settings JSON', () => {
    const verifyConfig: VerifySettings = {
      verifyAfterReading: true,
      verifyAfterSign: false
    };

    const settings = createVerifySettings(verifyConfig);
    const json = settingsToJson(settings);
    const parsed = JSON.parse(json);

    expect(parsed.verify.verify_after_reading).toBe(true);
    expect(parsed.verify.verify_after_sign).toBe(false);
    expect('verify_trust' in parsed.verify).toBe(false);
    expect('verify_timestamp_trust' in parsed.verify).toBe(false);
    expect('ocsp_fetch' in parsed.verify).toBe(false);
    expect('remote_manifest_fetch' in parsed.verify).toBe(false);
  });

  it('does not include undefined values when merging settings', () => {
    const settings1: Settings = {
      cawgTrust: {
        verifyTrustList: true,
        userAnchors: 'test'
      }
    };

    const settings2: Settings = {
      cawgTrust: {
        verifyTrustList: true,
        allowedList: undefined
      },
      verify: {
        verifyAfterReading: false
      }
    };

    const merged = mergeSettings(settings1, settings2);
    const json = settingsToJson(merged);
    const parsed = JSON.parse(json);

    expect(parsed.cawg_trust.verify_trust_list).toBe(true);
    expect(parsed.cawg_trust.user_anchors).toBe('test');
    expect('allowed_list' in parsed.cawg_trust).toBe(false);
    expect(parsed.verify.verify_after_reading).toBe(false);
  });
});

describe('loadSettingsFromUrl', () => {
  it('loads settings from a URL', async () => {
    const mockSettings = JSON.stringify({
      verify: { verify_after_reading: true }
    });
    server.use(
      http.get('http://settingsDoc', () => HttpResponse.text(mockSettings))
    );

    const loaded = await loadSettingsFromUrl('http://settingsDoc');
    expect(loaded).toBe(mockSettings);
  });

  it('throws error for failed fetch', async () => {
    server.use(
      http.get(
        'http://settingsDocMissing',
        () => new HttpResponse(null, { status: 404, statusText: 'Not Found' })
      )
    );

    await expect(
      loadSettingsFromUrl('http://settingsDocMissing')
    ).rejects.toThrow('Failed to fetch settings from URL: 404 Not Found');
  });

  it('throws error for network failure', async () => {
    server.use(
      http.get('http://settingsDocNetworkError', () => HttpResponse.error())
    );

    await expect(
      loadSettingsFromUrl('http://settingsDocNetworkError')
    ).rejects.toThrow();
  });
});
