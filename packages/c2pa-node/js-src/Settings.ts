// Copyright 2025 Adobe. All rights reserved.
// This file is licensed to you under the Apache License,
// Version 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
// or the MIT license (http://opensource.org/licenses/MIT),
// at your option.

// Unless required by applicable law or agreed to in writing,
// this software is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR REPRESENTATIONS OF ANY KIND, either express or
// implied. See the LICENSE-MIT and LICENSE-APACHE files for the
// specific language governing permissions and limitations under
// each license.

import * as fs from "fs-extra";
import fetch from "node-fetch";

import type { TrustConfig, VerifyConfig, SettingsContext } from "./types.d.ts";

type SettingsObjectType = {
  [k: string]: string | boolean | undefined | SettingsObjectType;
};

function snakeCaseify(object: SettingsObjectType): SettingsObjectType {
  return Object.entries(object).reduce(
    (result, [key, val]) => {
      result[snakeCase(key)] =
        typeof val === "object" && val !== null ? snakeCaseify(val) : val;
      return result;
    },
    {} as SettingsObjectType,
  );
}

function snakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Create a Settings object with trust configuration.
 * @param trustConfig The trust configuration
 * @returns Settings object that can be passed to Reader/Builder
 */
export function createTrustSettings(trustConfig: TrustConfig): SettingsContext {
  return { trust: { ...trustConfig } };
}

/**
 * Create a settings object with CAWG trust configuration.
 * @param trustConfig The CAWG trust configuration
 * @returns Settings object that can be passed to Reader/Builder
 */
export function createCawgTrustSettings(
  trustConfig: TrustConfig,
): SettingsContext {
  return { cawgTrust: { ...trustConfig } };
}

/**
 * Create a settings object with verify configuration.
 * @param verifyConfig The verify configuration
 * @returns Settings object that can be passed to Reader/Builder
 */
export function createVerifySettings(
  verifyConfig: VerifyConfig,
): SettingsContext {
  return { verify: { ...verifyConfig } };
}

/**
 * Merge multiple settings objects into one.
 * Later settings override earlier ones.
 * @param settings Settings objects to merge
 * @returns Merged settings object
 */
export function mergeSettings(...settings: SettingsContext[]): SettingsContext {
  const merged: SettingsContext = {};

  for (const setting of settings) {
    if (setting.trust) {
      merged.trust = { ...merged.trust, ...setting.trust };
    }
    if (setting.cawgTrust) {
      merged.cawgTrust = { ...merged.cawgTrust, ...setting.cawgTrust };
    }
    if (setting.verify) {
      merged.verify = { ...merged.verify, ...setting.verify };
    }
    if (setting.builder) {
      merged.builder = { ...merged.builder, ...setting.builder };
    }
  }

  return merged;
}

/**
 * Convert a settings object to a JSON string.
 * Converts camelCase keys to snake_case to match the c2pa-rs settings format.
 * @param settings The settings object
 * @returns JSON string representation with snake_case keys
 */
export function settingsToJson(settings: SettingsContext): string {
  return JSON.stringify(snakeCaseify(settings as SettingsObjectType));
}

/**
 * Load settings from a TOML or JSON file.
 * @param filePath The path to the settings file
 * @returns Settings as a string (TOML or JSON depending on file extension)
 */
export async function loadSettingsFromFile(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath, "utf8");
  return content;
}

/**
 * Load settings from a URL.
 * @param url The URL to fetch the settings from
 * @returns Settings as a string
 */
export async function loadSettingsFromUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch settings from URL: ${res.status} ${res.statusText}`,
    );
  }
  return await res.text();
}
