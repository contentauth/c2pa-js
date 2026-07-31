/**
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { merge } from 'ts-deepmerge';
import { fetchWithRetry, type FetchWithRetryOptions } from './fetchWithRetry.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Settings configuration for C2PA operations.
 *
 * Encapsulates settings and configuration options for Reader and Builder operations.
 * It provides a flexible way to configure SDK behavior including the verification configuration,
 * trust configuration, and builder options.
 *
 * This shape mirrors `c2pa-rs`'s own `Settings` struct.
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
 * const settingsJson = await resolveSettings(settings, undefined);
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
  cawgTrust?: CawgTrustSettings;
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
}

export interface CawgTrustSettings extends TrustSettings {
  /**
   * Enable CAWG trust validation. The default value is "true."
   *
   * Note: `c2pa-rs` reuses a single `Trust` struct for both `trust` and `cawgTrust`, so this
   * field technically exists on plain `trust` too, but only ever has an effect for `cawgTrust` —
   * it's kept off {@link TrustSettings} here so the type doesn't imply it does something it
   * doesn't.
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
  generateC2paArchive?: boolean;
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

// =============================================================================
// Defaults
// =============================================================================

const DEFAULT_SETTINGS: Settings = {
  builder: {
    generateC2paArchive: true
  }
};

// =============================================================================
// Top-level pipeline
// =============================================================================

/**
 * Resolves settings by merging override settings on top of base settings, resolving any embedded
 * trust list URLs on top of those, and then finally serializing the result for consumption by c2pa-rs.
 *
 * @param baseSettings Settings established at SDK initialization time.
 * @param overrideSettings Optional override settings. Keys present in overrideSettings win over keys in baseSettings.
 * @param options Optional per-call overrides, such as the trust-anchor response size cap.
 * @returns A JSON-serialized string containing all resolved settings values, ready to be consumed by c2pa-rs.
 * Returns undefined when neither argument is provided.
 */
export async function resolveSettings(
  baseSettings: Settings | undefined,
  overrideSettings: Settings | undefined,
  options?: FetchWithRetryOptions
): Promise<string | undefined> {
  const effectiveSettings = overrideSettings
    ? merge(baseSettings ?? {}, overrideSettings)
    : baseSettings;

  if (!effectiveSettings) {
    return undefined;
  }

  const finalSettings: Settings = merge(DEFAULT_SETTINGS, effectiveSettings);

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

// =============================================================================
// Settings construction
// =============================================================================

/**
 * Create a Settings object with trust configuration.
 * @param trustConfig The trust configuration
 * @returns Settings object that can be passed to Reader/Builder
 */
export function createTrustSettings(trustConfig: TrustSettings): Settings {
  return { trust: { ...trustConfig } };
}

/**
 * Create a settings object with CAWG trust configuration.
 * @param trustConfig The CAWG trust configuration
 * @returns Settings object that can be passed to Reader/Builder
 */
export function createCawgTrustSettings(
  trustConfig: CawgTrustSettings
): Settings {
  return { cawgTrust: { ...trustConfig } };
}

/**
 * Create a settings object with verify configuration.
 * @param verifyConfig The verify configuration
 * @returns Settings object that can be passed to Reader/Builder
 */
export function createVerifySettings(verifyConfig: VerifySettings): Settings {
  return { verify: { ...verifyConfig } };
}

/**
 * Merge multiple settings objects into one, deep-merging nested fields (e.g.
 * `builder.thumbnail`) rather than overwriting whole sections. Later settings override
 * earlier ones.
 *
 * @param settings Settings objects to merge
 * @returns Merged settings object
 */
export function mergeSettings(...settings: Settings[]): Settings {
  return merge(...settings);
}

// =============================================================================
// Serialization
// =============================================================================

type SettingsValue =
  | string
  | boolean
  | undefined
  | SettingsObjectType
  | SettingsValue[];
type SettingsObjectType = {
  [k: string]: SettingsValue;
};

/**
 * Recursively converts an object's camelCase keys to snake_case, matching the format
 * `c2pa-rs` expects for settings JSON/TOML. Arrays are preserved as arrays — only their
 * object elements (if any) get their keys snake-cased — since `typeof [] === 'object'` in
 * JS and a naive `Object.entries`-based recursion would otherwise flatten an array into a
 * `{"0": ..., "1": ...}` object instead of a JSON array.
 */
export function snakeCaseify(object: SettingsObjectType): SettingsObjectType {
  const formattedObject = Object.entries(object).reduce(
    (formattedObject, [key, val]) => {
      formattedObject[snakeCase(key)] = snakeCaseifyValue(val);
      return formattedObject;
    },
    {} as SettingsObjectType
  );

  return formattedObject;
}

function snakeCaseifyValue(val: SettingsValue): SettingsValue {
  if (Array.isArray(val)) {
    return val.map(snakeCaseifyValue);
  }
  if (typeof val === 'object' && val !== null) {
    return snakeCaseify(val);
  }
  return val;
}

function snakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Convert a settings object to a JSON string.
 * Converts camelCase keys to snake_case to match the c2pa-rs settings format.
 * @param settings The settings object
 * @returns JSON string representation with snake_case keys
 */
export function settingsToJson(settings: Settings): string {
  return JSON.stringify(snakeCaseify(settings as SettingsObjectType));
}

// =============================================================================
// Loading
// =============================================================================

/**
 * Load settings from a URL.
 *
 * Unlike the trust-anchor fetch in {@link resolveTrustSettings}, this is a plain, unvalidated
 * fetch of a whole settings document — no retries, no response-size cap, no content validation.
 * It's meant for loading an app's own trusted configuration file, not untrusted trust-anchor
 * resources embedded in a manifest.
 *
 * @param url The URL to fetch the settings from
 * @returns Settings as a string
 */
export async function loadSettingsFromUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch settings from URL: ${res.status} ${res.statusText}`
    );
  }
  return await res.text();
}

// =============================================================================
// Trust-anchor resolution
// =============================================================================

const TRUST_SETTINGS_KEY_MAP: Record<keyof TrustSettings, true> = {
  userAnchors: true,
  trustAnchors: true,
  trustConfig: true,
  allowedList: true
};
const TRUST_SETTINGS_KEYS = Object.keys(
  TRUST_SETTINGS_KEY_MAP
) as (keyof TrustSettings)[];

/**
 * Walks a TrustSettings object and fetches trust resources if necessary, replacing URLs with
 * their fetched, validated values. Mutates `settings` in place — see {@link resolveTrustAnchors}
 * for a non-mutating convenience wrapper.
 *
 * @param settings TrustSettings object, mutated in place.
 * @param options Optional per-call overrides, such as the trust-anchor response size cap.
 */
export async function resolveTrustSettings(
  settings: TrustSettings,
  options?: FetchWithRetryOptions
): Promise<void> {
  try {
    const promises = Object.entries(settings)
      .filter(([key]) =>
        TRUST_SETTINGS_KEYS.includes(key as keyof TrustSettings)
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
          settings[key as keyof TrustSettings] = combined;
        } else if (val && typeof val === 'string' && isUrl(val)) {
          const text = await fetchWithRetry(val, options);

          if (shouldValidateKey(key) && !containsCerts(text)) {
            throw new Error(`Error parsing PEM file at: ${val}`);
          }

          settings[key as keyof TrustSettings] = text;
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

/**
 * Resolves any URL-valued trust-anchor fields (`userAnchors`/`trustAnchors`/`trustConfig`/
 * `allowedList`) in a trust configuration into their fetched, validated text content —
 * without mutating the input. A convenience wrapper around {@link resolveTrustSettings}.
 *
 * @param trustConfig The trust configuration to resolve. Not mutated — a resolved copy is returned.
 * @param options Optional per-call overrides, such as the trust-anchor response size cap.
 * @returns A copy of `trustConfig` with any URLs replaced by their fetched, validated content.
 */
export async function resolveTrustAnchors<T extends TrustSettings>(
  trustConfig: T,
  options?: FetchWithRetryOptions
): Promise<T> {
  const resolved: T = { ...trustConfig };
  await resolveTrustSettings(resolved, options);
  return resolved;
}

const shouldValidateKey = (key: string): boolean =>
  ['userAnchors', 'trustAnchors'].includes(key);

const containsCerts = (content: string): boolean =>
  content.includes('-----BEGIN CERTIFICATE-----');

const isUrl = (str: string): boolean => str.startsWith('http');

