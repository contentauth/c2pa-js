/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { merge } from 'ts-deepmerge';

/**
 * Settings configuration for C2PA operations.
 *
 * Encapsulates settings and configuration options for Reader and Builder operations.
 * It provides a flexible way to configure SDK behavior including the verification configuration,
 * trust configuration, and builder options.
 *
 * @example
 * ```typescript
 * const context: Context = {
 *   verify: {
 *     verifyTrust: true,
 *     verifyAfterReading: true
 *   },
 *   trust: {
 *     trustAnchors: 'https://example.com/anchors.pem'
 *   }
 * };
 *
 * const reader = await c2pa.reader.fromBlob(blob.type, blob, JSON.stringify(context));
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
   * "User" trust anchors. Any asset validated off of this trust list will will have a "signingCredential.trusted" result with an explanation noting the trust source is a "User" anchor.
   *
   * Possible values are: the text content of a .pem file, a URL to fetch a .pem file from, or an array of URLs that will be fetched and concatenated.
   */
  userAnchors?: string | string[];
  /**
   * "System" trust anchors. Any asset validated off of this trust list will will have a "signingCredential.trusted" result with an explanation noting the trust source is a "System" anchor.
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

const TRUST_SETTINGS_KEY_MAP: Record<keyof TrustSettings, true> = {
  userAnchors: true,
  trustAnchors: true,
  trustConfig: true,
  allowedList: true
};
const TRUST_SETTINGS_KEYS = Object.keys(TRUST_SETTINGS_KEY_MAP) as (keyof TrustSettings)[];

export interface CawgTrustSettings extends TrustSettings {
  /**
   * Enable CAWG trust validation. The default value is "true."
   */
  verifyTrustList?: boolean;
}

export interface VerifySettings {
  /**
   * Enable trust validation. The default value is "true."
   */
  verifyTrust?: boolean;
  /*
   * Whether to verify the manifest after reading in the Reader. The default value is "true."
   */
  verifyAfterReading?: boolean;
}

export interface BuilderSettings {
  /**
   * Whether to generate a C2PA archive (instead of zip) when writing the manifest builder.
   */
  generateC2paArchive?: boolean;
}

type SettingsObjectType = {
  [k: string]: string | boolean | SettingsObjectType;
};

const DEFAULT_SETTINGS: Settings = {
  builder: {
    generateC2paArchive: true
  }
};

export const MAX_RESPONSE_SIZE = 1 * 1024 * 1024; // 1MB

/**
 * Resolves settings by merging override settings on top of base settings, resolving any embedded
 * trust list URLs on top of those, and then finally serializing the result for consumption by c2pa-rs.
 *
 * @param baseSettings Settings established at SDK initialization time.
 * @param overrideSettings Optional override settings. Keys present in overrideSettings win over keys in baseSettings.
 * @returns A JSON-serialized string containing all resolved settings values, ready to be consumed by c2pa-rs.
 * Returns undefined when neither argument is provided.
 */
export async function resolveSettings(
  baseSettings: Settings | undefined,
  overrideSettings: Settings | undefined
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
    resolvePromises.push(resolveTrustSettings(finalSettings.trust));
  }

  if (finalSettings.cawgTrust) {
    resolvePromises.push(resolveTrustSettings(finalSettings.cawgTrust));
  }

  // Wait for all trust list resolutions to complete.
  await Promise.all(resolvePromises);

  return JSON.stringify(snakeCaseify(finalSettings as SettingsObjectType));
}

function snakeCaseify(object: SettingsObjectType): SettingsObjectType {
  const formattedObject = Object.entries(object).reduce(
    (formattedObject, [key, val]) => {
      formattedObject[snakeCase(key)] =
        typeof val === 'object' && val !== null ? snakeCaseify(val) : val;
      return formattedObject;
    },
    {} as SettingsObjectType
  );

  return formattedObject;
}

function snakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Walks a TrustSettings object and fetches trust resources if necessary, replacing URLs with their fetched values.
 *
 * @param settings TrustSettings object
 */
async function resolveTrustSettings(settings: TrustSettings): Promise<void> {
  try {
    const promises = Object.entries(settings)
    .filter(([key]) => TRUST_SETTINGS_KEYS.includes(key as keyof TrustSettings))
    .map(async ([key, val]) => {
      if (val && typeof val === 'object' && Array.isArray(val)) {
        const promises = val.map(async (val) => {
          if (typeof val !== 'string') {
            throw new Error('Expected a string value for array item');
          }

          const text = await fetchResource(val);

          if (shouldValidateKey(key) && !containsCerts(text)) {
            throw new Error(`Error parsing PEM file at: ${val}`);
          }

          return text;
        });

        const result = await Promise.all(promises);
        const combined = result.join('');
        settings[key as keyof TrustSettings] = combined;
      } else if (val && typeof val === 'string' && isUrl(val)) {
        const text = await fetchResource(val);

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
    throw new Error(`Failed to resolve trust settings. ${message}`, { cause: e });
  }
}

const shouldValidateKey = (key: string): boolean =>
  ['userAnchors', 'trustAnchors'].includes(key);

const containsCerts = (content: string): boolean =>
  content.includes('-----BEGIN CERTIFICATE-----');

const isUrl = (str: string): boolean => str.startsWith('http');

const TRUST_FETCH_RETRIES = 2;
const TRUST_INITIAL_RETRY_DELAY_MS = 200;
const TRUST_MAX_RETRY_DELAY_MS = 2_000;

function calculateBackoffMs(attempt: number): number {
  const backoff = Math.min(
    TRUST_INITIAL_RETRY_DELAY_MS * 2 ** attempt,
    TRUST_MAX_RETRY_DELAY_MS
  );
  const jitter = Math.floor(Math.random() * 200);
  return Math.min(backoff + jitter, TRUST_MAX_RETRY_DELAY_MS); // jitter, capped
}

async function fetchResource(url: string): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(url);
    } catch (e) {
      if (attempt < TRUST_FETCH_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, calculateBackoffMs(attempt)));
        continue;
      }
      const message = e instanceof Error ? e.message : String(e);
      throw new Error(`Network error fetching ${url}: ${message}`, { cause: e });
    }

    if (!res.ok) {
      const retryable = res.status === 429 || res.status >= 500;
      if (retryable && attempt < TRUST_FETCH_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, calculateBackoffMs(attempt)));
        continue;
      }
      throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
    }

    const text = await res.text();

    if (text.length > MAX_RESPONSE_SIZE) {
      throw new Error(`Response from ${url} is too large. Max size is ${MAX_RESPONSE_SIZE} bytes.`);
    }

    return text;
  }
}
