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
 * Settings used to configure the SDK's behavior.
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
   */
  userAnchors?: string;
  /**
   * "System" trust anchors. Any asset validated off of this trust list will will have a "signingCredential.trusted" result with an explanation noting the trust source is a "System" anchor.
   */
  trustAnchors?: string;
  /**
   * Trust store
   */
  trustConfig?: string;
  /**
   * End-entity certificates.
   */
  allowedList?: string;
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
}

export interface BuilderSettings {
  generateC2paArchive: boolean;
}

type SettingsObjectType = {
  [k: string]: string | boolean | SettingsObjectType;
};

const DEFAULT_SETTINGS: Settings = {
  builder: {
    generateC2paArchive: true,
  },
};

/**
 * Converts a settings object to a JSON string of the structure expected by c2pa-rs.
 */
export function settingsToWasmJson(settings: Settings) {
  const finalSettings: Settings = merge(DEFAULT_SETTINGS, settings);

  return JSON.stringify(snakeCaseify(finalSettings as SettingsObjectType));
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
