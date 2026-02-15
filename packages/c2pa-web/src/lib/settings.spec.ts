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
import { settingsToWasmJson } from './settings.js';

/**
 * NOTE: settingsToWasmJson relies on a module-level HTTP cache that I could not
 * seem to reset in between test runs. Test-level imports with vi.resetModules()
 * had no effect. It is, of course, totally possible I did something wrong :)
 *
 * As such, there is some shared state between these tests - keep in mind that once
 * a URL is cached, the cached result will be used in all subsequent tests that
 * request that same URL.
 */

describe('settings', () => {
  describe('settingsToWasmJson', () => {
    describe('general behavior', () => {
      test('should accept an empty object', async () => {
        const settingsString = await settingsToWasmJson({});

        expect(settingsString).toEqual(
          JSON.stringify({ builder: { generate_c2pa_archive: true } })
        );
      });
    });

    describe('trust', () => {
      test('should pass through a non-url value', async () => {
        const settingsString = await settingsToWasmJson({
          trust: {
            userAnchors: 'foo',
            trustAnchors: 'bar',
            allowedList: 'baz',
            trustConfig: 'qux',
          },
          cawgTrust: {
            userAnchors: 'cawg foo',
            trustAnchors: 'cawg bar',
            allowedList: 'cawg baz',
            trustConfig: 'cawg qux',
          },
        });

        expect(settingsString).toEqual(
          JSON.stringify({
            builder: { generate_c2pa_archive: true },
            trust: {
              user_anchors: 'foo',
              trust_anchors: 'bar',
              allowed_list: 'baz',
              trust_config: 'qux',
            },
            cawg_trust: {
              user_anchors: 'cawg foo',
              trust_anchors: 'cawg bar',
              allowed_list: 'cawg baz',
              trust_config: 'cawg qux',
            },
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
            http.get('http://trustConfig', () => HttpResponse.text('config')),
          ]
        );

        const settingsString = await settingsToWasmJson({
          trust: {
            userAnchors: 'http://userAnchors',
            trustAnchors: 'http://trustAnchors',
            allowedList: 'http://allowedList',
            trustConfig: 'http://trustConfig',
          },
          cawgTrust: {
            userAnchors: 'http://userAnchors',
            trustAnchors: 'http://trustAnchors',
            allowedList: 'http://allowedList',
            trustConfig: 'http://trustConfig',
          },
        });

        expect(settingsString).toEqual(
          JSON.stringify({
            builder: { generate_c2pa_archive: true },
            trust: {
              user_anchors:
                '-----BEGIN CERTIFICATE-----foo-----END CERTIFICATE-----',
              trust_anchors:
                '-----BEGIN CERTIFICATE-----bar-----END CERTIFICATE-----',
              allowed_list: 'allowed',
              trust_config: 'config',
            },
            cawg_trust: {
              user_anchors:
                '-----BEGIN CERTIFICATE-----foo-----END CERTIFICATE-----',
              trust_anchors:
                '-----BEGIN CERTIFICATE-----bar-----END CERTIFICATE-----',
              allowed_list: 'allowed',
              trust_config: 'config',
            },
          })
        );
      });

      test('should concatenate the fetched results of URLs when given as an array', async ({
        requestMock,
      }) => {
        requestMock.use(
          http.get('http://userAnchorsConcat', () =>
            HttpResponse.text(
              '-----BEGIN CERTIFICATE-----qux-----END CERTIFICATE-----'
            )
          )
        );

        const settingsString = await settingsToWasmJson({
          trust: {
            userAnchors: [
              'http://userAnchorsConcat',
              'http://userAnchorsConcat',
            ],
          },
        });

        expect(settingsString).toEqual(
          JSON.stringify({
            builder: { generate_c2pa_archive: true },
            trust: {
              user_anchors:
                '-----BEGIN CERTIFICATE-----qux-----END CERTIFICATE----------BEGIN CERTIFICATE-----qux-----END CERTIFICATE-----',
            },
          })
        );
      });

      test('should report an error when fetching a URL without a certificate', async ({
        requestMock,
      }) => {
        requestMock.use(
          http.get('http://userAnchorsShouldFail', () =>
            HttpResponse.text('invalid')
          )
        );

        const settingsStringPromise = settingsToWasmJson({
          trust: {
            userAnchors: 'http://userAnchorsShouldFail',
          },
        });

        await expect(settingsStringPromise).rejects.toThrow(
          'Failed to resolve trust settings.'
        );
      });

      test('should cache fetched values', async ({ requestMock }) => {
        let requestCount = 0;

        requestMock.use(
          http.get('http://userAnchorsCacheTest', () => {
            requestCount++;
            return HttpResponse.text(
              '-----BEGIN CERTIFICATE-----foo-----END CERTIFICATE-----'
            );
          })
        );

        await settingsToWasmJson({
          trust: {
            userAnchors: 'http://userAnchorsCacheTest',
          },
        });

        await settingsToWasmJson({
          trust: {
            userAnchors: 'http://userAnchorsCacheTest',
          },
        });

        expect(requestCount).toEqual(1);
      });
    });
  });
});
