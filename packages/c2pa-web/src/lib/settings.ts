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
 * Context configuration for C2PA operations.
 *
 * Context encapsulates settings and configuration options for Reader and Builder operations.
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
export interface SettingsContext {
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

/**
 * Settings used to configure the SDK's behavior.
 *
 * @deprecated Use {@link SettingsContext} instead. Settings will be removed in a future version.
 */
export interface Settings {
  /**
   * Trust configuration for C2PA claim validation.
   */
  trust?: TrustSettings;
  /**
   * Trust configuration for CAWG identity valdation.
   */
  cawgTrust?: CawgTrustSettings;
  verify?: VerifySettings;
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
   * This will eventually become the default behavior.
   */
  generateC2paArchive?: boolean;
  /*
   * Settings for controlling automatic thumbnail generation.
   */
  thumbnail?: BuilderThumbnailSettings;
}

export interface BuilderThumbnailSettings {
  /*
   * Whether or not to automatically generate thumbnails.
   * The default value is true.
   */
  enabled: boolean;
}

type SettingsObjectType = {
  [k: string]: string | boolean | SettingsObjectType;
};

const DEFAULT_SETTINGS: SettingsContext = {
  builder: {
    generateC2paArchive: true,
  },
};

/**
 * Resolves any trust list URLs and serializes the resulting object into a JSON string of the structure expected by c2pa-rs.
 *
 * @param context - Context configuration object
 */
export async function contextToWasmJson(context: SettingsContext) {
  const mergedContext: SettingsContext = merge(DEFAULT_SETTINGS, context);

  const resolvePromises: Promise<void>[] = [];

  if (mergedContext.trust) {
    resolvePromises.push(resolveTrustSettings(mergedContext.trust));
  }

  if (mergedContext.cawgTrust) {
    resolvePromises.push(resolveTrustSettings(mergedContext.cawgTrust));
  }

  await Promise.all(resolvePromises);

  return JSON.stringify(snakeCaseify(mergedContext as SettingsObjectType));
}

/**
 * Resolves any trust list URLs and serializes the resulting object into a JSON string of the structure expected by c2pa-rs.
 *
 * @param settings
 * @deprecated Use {@link contextToWasmJson} instead.
 */
export async function settingsToWasmJson(settings: Settings) {
  const mergedSettings: Settings = merge(DEFAULT_SETTINGS, settings);

  const resolvePromises: Promise<void>[] = [];

  if (mergedSettings.trust) {
    resolvePromises.push(resolveTrustSettings(mergedSettings.trust));
  }

  if (mergedSettings.cawgTrust) {
    resolvePromises.push(resolveTrustSettings(mergedSettings.cawgTrust));
  }

  await Promise.all(resolvePromises);

  return JSON.stringify(snakeCaseify(mergedSettings as SettingsObjectType));
}

function snakeCaseify(object: SettingsObjectType): SettingsObjectType {
  const formattedObject = Object.entries(object).reduce(
    (formattedObject, [key, val]) => {
      formattedObject[snakeCase(key)] =
        typeof val === 'object' ? snakeCaseify(val) : val;
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
    const promises = Object.entries(settings).map(async ([key, val]) => {
      if (Array.isArray(val)) {
        const promises = val.map(async (val) => {
          const res = await fetch(val);
          const text = await res.text();

          if (shouldValidateKey(key) && !containsCerts(text)) {
            throw new Error(`Error parsing PEM file at: ${val}`);
          }

          return text;
        });

        const result = await Promise.all(promises);
        const combined = result.join('');
        settings[key as keyof TrustSettings] = combined;
      } else if (val && isUrl(val)) {
        const res = await fetch(val);
        const text = await res.text();

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
    throw new Error('Failed to resolve trust settings.', { cause: e });
  }
}

const shouldValidateKey = (key: string): boolean =>
  ['userAnchors', 'trustAnchors'].includes(key);

const containsCerts = (content: string): boolean =>
  content.includes('-----BEGIN CERTIFICATE-----');

const isUrl = (str: string): boolean => str.startsWith('http');
