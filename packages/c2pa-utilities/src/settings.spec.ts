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
  withDefaultSettings,
  type TrustSettings,
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
      test('should still resolve to the package defaults when no settings are provided', async () => {
        const result = await resolveSettings(undefined);
        expect(result).toEqual(
          JSON.stringify({ builder: { generate_c2pa_archive: true } })
        );
      });

      test('should serialize the given settings', async () => {
        const result = await resolveSettings({ verify: { verifyTrust: false } });
        expect(result).toEqual(
          JSON.stringify({ builder: { generate_c2pa_archive: true }, verify: { verify_trust: false } })
        );
      });

      test('should accept an empty settings object', async () => {
        const result = await resolveSettings({});
        expect(result).toEqual(
          JSON.stringify({ builder: { generate_c2pa_archive: true } })
        );
      });

      test('should not throw when a settings value is null', async () => {
        // typeof null === 'object' in JS — without a null guard this crashes
        const result = await resolveSettings({ verify: null as any });
        expect(result).toEqual(
          JSON.stringify({ builder: { generate_c2pa_archive: true }, verify: null })
        );
      });

      test('should not throw when a nested settings value is null', async () => {
        // A null (falsy) anchors value produces no anchor entry, so `trust` is
        // omitted entirely rather than being sent as `{ user_anchors: null }`.
        const result = await resolveSettings({ trust: { userAnchors: null as any } });
        expect(result).toEqual(
          JSON.stringify({
            builder: { generate_c2pa_archive: true }
          })
        );
      });
    });

    describe('trust', () => {
      test('should pass through a non-url value', async () => {
        const result = await resolveSettings({
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

        // `trust`/`cawgTrust` are unified into a single `trust.anchors[]` list, each
        // entry tagged with the trust_kind it applies to. The `trust`-level `trustConfig`
        // stays a top-level field; the `cawgTrust`-level one becomes a per-anchor override.
        expect(result).toEqual(
          JSON.stringify({
            builder: { generate_c2pa_archive: true },
            trust: {
              anchors: [
                {
                  trust_anchors: 'foo',
                  trust_uri: 'manifest_user_anchors',
                  trust_kind: 'manifest',
                  trust_config: 'qux',
                  allowed_list: 'baz'
                },
                {
                  trust_anchors: 'bar',
                  trust_uri: 'manifest_system_anchors',
                  trust_kind: 'manifest',
                  trust_config: 'qux',
                  allowed_list: 'baz'
                },
                {
                  trust_anchors: 'cawg foo',
                  trust_uri: 'cawg_user_anchors',
                  trust_kind: 'cawg',
                  trust_config: 'cawg qux',
                  allowed_list: 'cawg baz'
                },
                {
                  trust_anchors: 'cawg bar',
                  trust_uri: 'cawg_system_anchors',
                  trust_kind: 'cawg',
                  trust_config: 'cawg qux',
                  allowed_list: 'cawg baz'
                }
              ],
              trust_config: 'qux'
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

        const result = await resolveSettings({
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
              anchors: [
                {
                  trust_anchors:
                    '-----BEGIN CERTIFICATE-----foo-----END CERTIFICATE-----',
                  trust_uri: 'manifest_user_anchors',
                  trust_kind: 'manifest',
                  trust_config: 'config',
                  allowed_list: 'allowed'
                },
                {
                  trust_anchors:
                    '-----BEGIN CERTIFICATE-----bar-----END CERTIFICATE-----',
                  trust_uri: 'manifest_system_anchors',
                  trust_kind: 'manifest',
                  trust_config: 'config',
                  allowed_list: 'allowed'
                },
                {
                  trust_anchors:
                    '-----BEGIN CERTIFICATE-----foo-----END CERTIFICATE-----',
                  trust_uri: 'cawg_user_anchors',
                  trust_kind: 'cawg',
                  trust_config: 'config',
                  allowed_list: 'allowed'
                },
                {
                  trust_anchors:
                    '-----BEGIN CERTIFICATE-----bar-----END CERTIFICATE-----',
                  trust_uri: 'cawg_system_anchors',
                  trust_kind: 'cawg',
                  trust_config: 'config',
                  allowed_list: 'allowed'
                }
              ],
              trust_config: 'config'
            }
          })
        );
      });

      test('should concatenate the fetched results of URLs when given as an array', async () => {
        server.use(
          http.get('http://userAnchorsConcat', () =>
            HttpResponse.text(
              '-----BEGIN CERTIFICATE-----qux-----END CERTIFICATE-----'
            )
          )
        );

        const result = await resolveSettings({
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
              anchors: [
                {
                  trust_anchors:
                    '-----BEGIN CERTIFICATE-----qux-----END CERTIFICATE----------BEGIN CERTIFICATE-----qux-----END CERTIFICATE-----',
                  trust_uri: 'manifest_user_anchors',
                  trust_kind: 'manifest'
                }
              ]
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

        const resultPromise = resolveSettings({
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

        const result = await resolveSettings({
          trust: {
            trustAnchors: 'http://trustAnchors',
            ...(({ unknownKey: 'http://unknownKey' }) as any)
          }
        });

        expect(unknownKeyFetched).toBe(false);
        expect(result).toContain('trust_anchors');
      });

      test('should not crash when a cawgTrust boolean field is present', async () => {
        const resultPromise = resolveSettings({
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

        const resultPromise = resolveSettings({
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
          { trust: { trustConfig: 'http://customCap' } },
          { maxResponseBytes: 1024 }
        );

        await expect(resultPromise).rejects.toThrow(
          'Failed to resolve trust settings.'
        );
      });

      test('should reject when an array item is not a string', async () => {
        const resultPromise = resolveSettings({
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

        const resultPromise = resolveSettings({
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

describe('withDefaultSettings', () => {
  it('applies the package defaults when no settings are given', () => {
    expect(withDefaultSettings(undefined)).toEqual({
      builder: { generateC2paArchive: true }
    });
  });

  it('merges the given settings on top of the defaults', () => {
    expect(withDefaultSettings({ verify: { verifyTrust: false } })).toEqual({
      builder: { generateC2paArchive: true },
      verify: { verifyTrust: false }
    });
  });
});

describe('trust settings in-flight requests', () => {
  const url = 'https://example.com/trust-anchors.pem';
  const pem = '-----BEGIN CERTIFICATE-----\nanchor\n-----END CERTIFICATE-----';

  it('shares concurrent fetches across settings resolutions without caching completed responses', async () => {
    const fetch = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return new Response(pem);
    });
    vi.stubGlobal('fetch', fetch);
    const resolve = () =>
      resolveSettings({ trust: { trustAnchors: url } });

    const [first, second] = await Promise.all([resolve(), resolve()]);

    expect(fetch).toHaveBeenCalledOnce();
    for (const settingsJson of [first, second]) {
      expect(JSON.parse(settingsJson).trust.anchors[0].trust_anchors).toBe(pem);
    }

    await resolve();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('clears failed in-flight fetches so later resolution can retry', async () => {
    let requestCount = 0;
    vi.stubGlobal('fetch', async () => {
      requestCount++;
      if (requestCount === 1) {
        throw new Error('network down');
      }
      return new Response(pem);
    });
    const resolve = () =>
      resolveSettings({ trust: { trustAnchors: url } }, { maxRetries: 0 });

    await expect(resolve()).rejects.toThrow('Failed to resolve trust settings');
    const settingsJson = await resolve();

    expect(requestCount).toBe(2);
    expect(JSON.parse(settingsJson).trust.anchors[0].trust_anchors).toBe(pem);
  });

  it.each(['request', 'body'])(
    'times out a hung %s and allows a later fetch',
    async (phase) => {
      let signal: AbortSignal | null | undefined;
      const fetch = vi.fn(async (_input: string, init?: RequestInit) => {
        signal = init?.signal;
        if (fetch.mock.calls.length > 1) {
          return new Response(pem);
        }
        if (phase === 'request') {
          return new Promise<Response>(() => undefined);
        }
        return new Response(new ReadableStream());
      });
      vi.stubGlobal('fetch', fetch);
      vi.useFakeTimers();
      try {
        const resolve = () =>
          resolveSettings({ trust: { trustAnchors: url } }, { maxRetries: 0 });
        const first = resolve();
        const second = resolve();
        const failures = Promise.all([
          expect(first).rejects.toThrow('timed out'),
          expect(second).rejects.toThrow('timed out')
        ]);

        expect(fetch).toHaveBeenCalledOnce();
        await vi.advanceTimersByTimeAsync(29_999);
        expect(signal?.aborted).toBe(false);
        await vi.advanceTimersByTimeAsync(1);
        await failures;
        expect(signal?.aborted).toBe(true);

        const recovered = await resolve();
        expect(JSON.parse(recovered).trust.anchors[0].trust_anchors).toBe(pem);
        expect(fetch).toHaveBeenCalledTimes(2);
        expect(vi.getTimerCount()).toBe(0);
      } finally {
        vi.useRealTimers();
      }
    }
  );

  it('cancels a retry delay at the deadline and reports a TimeoutError', async () => {
    let requestCount = 0;
    const fetch = vi.fn(async () => {
      requestCount++;
      if (requestCount === 1 || requestCount === 2) {
        return new Response(null, {
          status: 503,
          headers: { 'Retry-After': requestCount === 1 ? '25' : '30' }
        });
      }
      return new Response(pem);
    });
    vi.stubGlobal('fetch', fetch);
    vi.useFakeTimers();
    try {
      const resolve = () =>
        resolveSettings({ trust: { trustAnchors: url } });
      const failure = resolve().catch((error: unknown) => error);

      await vi.advanceTimersByTimeAsync(30_000);

      expect(await failure).toMatchObject({
        name: 'TimeoutError',
        cause: expect.objectContaining({ name: 'TimeoutError' })
      });
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(vi.getTimerCount()).toBe(0);

      const recovered = await resolve();
      expect(JSON.parse(recovered).trust.anchors[0].trust_anchors).toBe(pem);
      expect(fetch).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not share custom fetch wrappers with mutable request context', async () => {
    let tenant = 'first';
    const fetch = vi.fn(async () => {
      const currentTenant = tenant;
      await Promise.resolve();
      return new Response(
        `-----BEGIN CERTIFICATE-----\n${currentTenant}\n-----END CERTIFICATE-----`
      );
    });
    const resolve = () =>
      resolveSettings({ trust: { trustAnchors: url } }, { fetch });

    const first = resolve();
    tenant = 'second';
    const second = resolve();
    const results = await Promise.all([first, second]);

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse(results[0]).trust.anchors[0].trust_anchors).toContain(
      '\nfirst\n'
    );
    expect(JSON.parse(results[1]).trust.anchors[0].trust_anchors).toContain(
      '\nsecond\n'
    );
  });

  it('rejects invalid policies rather than sharing a default-policy request', async () => {
    const fetch = vi.fn(async () => {
      await Promise.resolve();
      return new Response(pem);
    });
    vi.stubGlobal('fetch', fetch);
    const pending = resolveSettings({ trust: { trustAnchors: url } });
    await expect(
      resolveSettings({ trust: { trustAnchors: url } }, { maxRetries: NaN })
    ).rejects.toThrow('maxRetries');
    await pending;
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('keeps different retry policies isolated', async () => {
    const fetch = vi.fn(async () => {
      await Promise.resolve();
      return new Response(pem);
    });
    vi.stubGlobal('fetch', fetch);
    await Promise.all([
      resolveSettings({ trust: { trustAnchors: url } }, { maxRetries: 0 }),
      resolveSettings({ trust: { trustAnchors: url } }, { maxRetries: 1 })
    ]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('does not share requests after the global fetch implementation changes', async () => {
    const firstFetch = vi.fn(async () => new Response(pem));
    const secondFetch = vi.fn(async () => new Response(pem));
    vi.stubGlobal('fetch', firstFetch);
    const first = resolveSettings({ trust: { trustAnchors: url } });
    vi.stubGlobal('fetch', secondFetch);
    await Promise.all([
      first,
      resolveSettings({ trust: { trustAnchors: url } })
    ]);
    expect(firstFetch).toHaveBeenCalledOnce();
    expect(secondFetch).toHaveBeenCalledOnce();
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
    const trustConfig: TrustSettings = {
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

  it('does not emit a dead cawg_trust key, and omits trust entirely when there are no anchors', () => {
    const trustConfig: TrustSettings = {
      verifyTrustList: true
    };

    const settings = createCawgTrustSettings(trustConfig);
    const json = settingsToJson(settings);
    const parsed = JSON.parse(json);

    // `cawg_trust` no longer exists in c2pa-rs 0.91 — CAWG trust settings are folded into
    // `trust.anchors[]`. With no anchors configured, there's nothing to send.
    expect('cawg_trust' in parsed).toBe(false);
    expect('trust' in parsed).toBe(false);
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

    expect('cawg_trust' in parsed).toBe(false);
    const [cawgAnchor] = parsed.trust.anchors;
    expect(cawgAnchor.trust_kind).toBe('cawg');
    expect(cawgAnchor.trust_anchors).toBe('test');
    expect('allowed_list' in cawgAnchor).toBe(false);
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
    ).rejects.toThrow('Failed to fetch http://settingsDocMissing: 404 Not Found');
  });

  it('throws error for network failure', async () => {
    server.use(
      http.get('http://settingsDocNetworkError', () => HttpResponse.error())
    );

    await expect(
      loadSettingsFromUrl('http://settingsDocNetworkError')
    ).rejects.toThrow();
  });

  it('retries a transient 500 and returns the settings once it recovers', async () => {
    const mockSettings = JSON.stringify({
      verify: { verify_after_reading: true }
    });
    server.use(
      http.get(
        'http://settingsDocTransient500',
        () => new HttpResponse(null, { status: 500 }),
        { once: true }
      ),
      http.get('http://settingsDocTransient500', () =>
        HttpResponse.text(mockSettings)
      )
    );

    const loaded = await loadSettingsFromUrl('http://settingsDocTransient500');
    expect(loaded).toBe(mockSettings);
  });

  it('honors a custom retry policy via options', async () => {
    let requestCount = 0;
    server.use(
      http.get('http://settingsDocCustomRetries', () => {
        requestCount++;
        return new HttpResponse(null, { status: 500 });
      })
    );

    await expect(
      loadSettingsFromUrl('http://settingsDocCustomRetries', {
        maxRetries: 0
      })
    ).rejects.toThrow('Failed to fetch http://settingsDocCustomRetries: 500');
    expect(requestCount).toBe(1);
  });
});
