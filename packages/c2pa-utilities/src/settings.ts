/**
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { merge } from 'ts-deepmerge';
import {
  fetchWithRetry,
  fetchWithRetryRaw,
  type FetchWithRetryOptions
} from './fetchWithRetry.js';
import { snakeCaseify, type SettingsObjectType } from './caseConversion.js';

// =================================
// Types
// =================================

/**
 * Settings configuration for C2PA Reader and Builder operations.
 *
 * @example
 * ```typescript
 * const settings: Settings = {
 *   verify: {
 *     verifyTrust: true,
 *     verifyAfterReading: true
 *   },
 *   trust: {
 *     trustAnchors: 'https://example.com/anchors.pem'
 *   }
 * };
 *
 * const settingsJson = await resolveSettings(settings);
 * ```
 */
export interface Settings {
  /**
   * Trust configuration for C2PA claim validation.
   */
  trust?: TrustSettings;
  /**
   * Trust configuration for CAWG identity validation.
   */
  cawgTrust?: TrustSettings;
  /**
   * Verification settings.
   */
  verify?: VerifySettings;
  /**
   * Builder settings.
   */
  builder?: BuilderSettings;
}

export interface TrustSettings {
  /**
   * "User" trust anchors. Any asset validated off of this trust list will have a
   * "signingCredential.trusted" result with an explanation noting the trust source is a "User" anchor.
   *
   * Possible values are: the text content of a .pem file, a URL to fetch a .pem file from, or an array of URLs that will be fetched and concatenated.
   */
  userAnchors?: string | string[];
  /**
   * "System" trust anchors. Any asset validated off of this trust list will have a
   * "signingCredential.trusted" result with an explanation noting the trust source is a "System" anchor.
   *
   * Possible values are: the text content of a .pem file, a URL to fetch a .pem file from, or an array of URLs that will be fetched and concatenated.
   */
  trustAnchors?: string | string[];
  /**
   * Trust store
   *
   * Possible values are: the text content of a .cfg file, a URL to fetch a .cfg file from, or an array of URLs that will be fetched and concatenated.
   */
  trustConfig?: string | string[];
  /**
   * End-entity certificates.
   *
   * Possible values are: the text content of a end-entity cert file, a URL to fetch a end-entity cert file from, or an array of URLs that will be fetched and concatenated.
   */
  allowedList?: string | string[];
  /**
   * Enable CAWG trust validation. The default value is "true."
   *
   * Only has an effect when set on `cawgTrust` — mirrors `c2pa-rs`'s `Trust` struct, which is
   * shared by both the `trust` and `cawg_trust` settings sections and carries this field on both.
   */
  verifyTrustList?: boolean;
}

export interface VerifySettings {
  /**
   * Enable trust validation. The default value is "true."
   */
  verifyTrust?: boolean;
  /**
   * Whether to verify the manifest after reading in the Reader. The default value is "true."
   */
  verifyAfterReading?: boolean;
  /**
   * Whether to verify the manifest after signing in the Builder. The default value is "false."
   */
  verifyAfterSign?: boolean;
  /**
   * Whether to verify the timestamp certificates against the configured trust lists. The default value is "true."
   */
  verifyTimestampTrust?: boolean;
  /**
   * Whether to fetch the certificate's OCSP status during validation. The default value is "false."
   */
  ocspFetch?: boolean;
  /**
   * Whether to fetch remote manifests when constructing a Reader or adding an Ingredient. The default value is "true."
   */
  remoteManifestFetch?: boolean;
  /**
   * Whether to skip ingredient conflict resolution when multiple ingredients share a manifest identifier. Only applicable to C2PA v2 validation. The default value is "false."
   */
  skipIngredientConflictResolution?: boolean;
  /**
   * Whether to perform strict C2PA v1 validation instead of the latest validation. The default value is "false."
   */
  strictV1Validation?: boolean;
}

export interface BuilderSettings {
  /**
   * Whether to generate a C2PA archive (instead of zip) when writing the manifest builder.
   *
   * Note: `c2pa-rs` is deprecating the zip archive path — this setting is expected to be
   * removed in a future release and should always be left `true`.
   */
  generateC2paArchive: true;
  /**
   * Settings for automatic thumbnail generation.
   */
  thumbnail?: {
    /**
     * Whether to automatically generate a thumbnail for the asset being built, if possible.
     */
    enabled?: boolean;
  };
}

// =================================
// Defaults
// =================================

/**
 * This package's default settings, applied by {@link withDefaultSettings} and
 * {@link resolveSettings} so a `Reader`/`Builder` gets sane behavior even with no settings
 * provided at all.
 */
export const DEFAULT_SETTINGS: Settings = {
  builder: {
    generateC2paArchive: true
  }
};

/**
 * Merges `settings` on top of this package's default settings.
 * Useful for bindings that need this package's defaults applied without going through
 * {@link resolveSettings}'s async trust-anchor URL resolution.
 *
 * @param settings Settings to apply the defaults to.
 * @returns `settings` merged on top of this package's defaults.
 */
export function withDefaultSettings(settings: Settings | undefined): Settings {
  return merge(DEFAULT_SETTINGS, settings ?? {});
}

// =================================
// Top-level pipeline
// =================================

/**
 * Resolves settings by resolving any embedded trust-anchor URLs, then serializing the result for
 * consumption by the core native SDK. `settings` is merged on top of this package's default
 * settings (see {@link withDefaultSettings}). To combine more than one `Settings` source, merge them with
 * {@link mergeSettings} first and pass the single result in here.
 *
 * @param settings Settings to resolve.
 * @param options Optional configurations for fetch-with-retry.
 * @returns A JSON-serialized string containing all resolved settings values, ready to be consumed
 * by the core native SDK.
 */
export async function resolveSettings(
  settings: Settings | undefined,
  options?: FetchWithRetryOptions
): Promise<string> {
  const finalSettings: Settings = withDefaultSettings(settings);

  const resolvePromises: Promise<void>[] = [];

  if (finalSettings.trust) {
    resolvePromises.push(resolveTrustSettings(finalSettings.trust, options));
  }

  if (finalSettings.cawgTrust) {
    resolvePromises.push(
      resolveTrustSettings(finalSettings.cawgTrust, options)
    );
  }

  // Wait for all trust list resolutions to complete.
  await Promise.all(resolvePromises);

  return JSON.stringify(snakeCaseify(finalSettings as SettingsObjectType));
}

// =================================
// Settings construction
// =================================

/**
 * Create a Settings object with trust configuration.
 * @param trustConfig The trust configuration.
 * @returns Settings object that can be passed to Reader/Builder.
 */
export function createTrustSettings(trustConfig: TrustSettings): Settings {
  return { trust: { ...trustConfig } };
}

/**
 * Create a Settings object with CAWG trust configuration.
 * @param trustConfig The CAWG trust configuration.
 * @returns Settings object that can be passed to Reader/Builder.
 */
export function createCawgTrustSettings(
  trustConfig: TrustSettings
): Settings {
  return { cawgTrust: { ...trustConfig } };
}

/**
 * Create a Settings object with verify configuration.
 * @param verifyConfig The verify configuration.
 * @returns Settings object that can be passed to Reader/Builder.
 */
export function createVerifySettings(verifyConfig: VerifySettings): Settings {
  return { verify: { ...verifyConfig } };
}

/**
 * Merge multiple Settings objects into one, deep-merging nested fields (e.g.
 * `builder.thumbnail`) rather than overwriting whole sections. Later settings override
 * earlier ones.
 *
 * @param settings Settings objects to merge.
 * @returns Merged settings object.
 */
export function mergeSettings(...settings: Settings[]): Settings {
  return merge(...settings);
}

// =================================
// Serialization
// =================================

/**
 * Convert a settings object to a JSON string.
 * Converts camelCase keys to snake_case to match the c2pa-rs settings format.
 * @param settings The settings object
 * @returns JSON string representation with snake_case keys
 */
export function settingsToJson(settings: Settings): string {
  return JSON.stringify(snakeCaseify(settings as SettingsObjectType));
}

// =================================
// Loading
// =================================

/**
 * Load settings from a URL, retrying on network errors and retryable HTTP responses (see
 * {@link fetchWithRetryRaw}). Unlike {@link resolveTrustSettings}'s trust-anchor fetch, this
 * does not enforce a response-size cap or validate the content — it's meant for loading an
 * app's own trusted configuration file, not untrusted resources embedded in a manifest.
 *
 * @param url The URL to fetch the settings from
 * @param options Options for configuring the retry policy.
 * @returns Settings as a string
 */
export async function loadSettingsFromUrl(
  url: string,
  options?: FetchWithRetryOptions
): Promise<string> {
  const res = await fetchWithRetryRaw(url, undefined, options);
  return await res.text();
}

// =================================
// Trust-anchor resolution
// =================================

/**
 * The URL-resolvable trust-anchor fields on `TrustSettings`. Deliberately excludes
 * `verifyTrustList`, which is a plain boolean, not a fetchable resource.
 */
type TrustAnchorKey =
  | 'userAnchors'
  | 'trustAnchors'
  | 'trustConfig'
  | 'allowedList';

const TRUST_SETTINGS_KEYS: readonly TrustAnchorKey[] = [
  'userAnchors',
  'trustAnchors',
  'trustConfig',
  'allowedList'
];

/**
 * Walks a TrustSettings object and fetches trust resources if necessary, replacing URLs with
 * their fetched, validated values. Mutates `settings` in place.
 *
 * @param settings TrustSettings object, mutated in place.
 * @param options Optional configurations for fetch-with-retry.
 */
export async function resolveTrustSettings(
  settings: TrustSettings,
  options?: FetchWithRetryOptions
): Promise<void> {
  const shouldValidateKey = (key: string): boolean =>
    ['userAnchors', 'trustAnchors'].includes(key);

  const containsCerts = (content: string): boolean =>
    content.includes('-----BEGIN CERTIFICATE-----');

  const isUrl = (str: string): boolean => str.startsWith('http');

  try {
    const promises = Object.entries(settings)
      .filter(([key]) =>
        TRUST_SETTINGS_KEYS.includes(key as TrustAnchorKey)
      )
      .map(async ([key, val]) => {
        if (val && typeof val === 'object' && Array.isArray(val)) {
          const promises = val.map(async (val) => {
            if (typeof val !== 'string') {
              throw new Error('Expected a string value for array item');
            }

            const text = await fetchWithRetry(val, options);

            if (shouldValidateKey(key) && !containsCerts(text)) {
              throw new Error(`Error parsing PEM file at: ${val}`);
            }

            return text;
          });

          const result = await Promise.all(promises);
          const combined = result.join('');
          settings[key as TrustAnchorKey] = combined;
        } else if (val && typeof val === 'string' && isUrl(val)) {
          const text = await fetchWithRetry(val, options);

          if (shouldValidateKey(key) && !containsCerts(text)) {
            throw new Error(`Error parsing PEM file at: ${val}`);
          }

          settings[key as TrustAnchorKey] = text;
        } else {
          return val;
        }
      });

    await Promise.all(promises);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to resolve trust settings. ${message}`, {
      cause: e
    });
  }
}
