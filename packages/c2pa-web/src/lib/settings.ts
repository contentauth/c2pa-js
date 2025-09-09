/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

export interface Settings {
  trust?: TrustSettings;
  cawgTrust?: TrustSettings;
  verify?: VerifySettings;
}

interface TrustSettings {
  userAnchors?: string;
  trustAnchors?: string;
  trustConfig?: string;
  allowedList?: string;
}

interface VerifySettings {
  verifyTrust?: boolean;
}

type SettingsObjectType = {
  [k: string]: string | boolean | SettingsObjectType;
};

/**
 * Converts a settings object to a JSON string of the structure expected by c2pa-rs.
 */
export function settingsToWasmJson(settings: Settings) {
  return JSON.stringify(snakeCaseify(settings as SettingsObjectType));
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
