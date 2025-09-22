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

import * as neon from "./index.node";
import * as fs from "fs-extra";
import path from "path";
import fetch from "node-fetch";
import type { TrustConfig } from "./types";

/**
 * Load settings from a JSON string and apply them globally.
 * @param json The JSON string containing the settings configuration
 */
export function loadSettings(json: string): void {
  neon.loadSettings(json);
}

/**
 * Load settings from a TOML string and apply them globally.
 * @param toml The TOML string containing the settings configuration
 */
export function loadSettingsToml(toml: string): void {
  neon.loadSettingsToml(toml);
}

/**
 * Get the current settings as a JSON string.
 * @returns The JSON representation of the current settings
 */
export function getSettingsJson(): string {
  return neon.getSettingsJson();
}

/**
 * Load settings from a TOML or JSON file path and apply them globally.
 * The file format is determined by the file extension (.toml for TOML, otherwise JSON).
 * @param filePath The path to the settings file
 */
export async function loadSettingsFromFile(filePath: string): Promise<void> {
  const ext = path.extname(filePath).toLowerCase();
  const content = await fs.readFile(filePath, "utf8");
  if (ext === ".toml") {
    loadSettings(content);
    return;
  }
  // Assume JSON (or JSON5 that is valid JSON) otherwise
  // If needed, callers can ensure the content is valid JSON.
  loadSettings(content);
}

/**
 * Load settings from a URL and apply them globally.
 * The format is determined by the content-type header or file extension (.toml for TOML, otherwise JSON).
 * @param url The URL to fetch the settings from
 */
export async function loadSettingsFromUrl(url: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch settings from URL: ${res.status} ${res.statusText}`,
    );
  }
  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();

  const isToml =
    contentType.includes("toml") || url.toLowerCase().endsWith(".toml");
  if (isToml) {
    loadSettingsToml(text);
    return;
  }
  // Treat as JSON by default
  loadSettings(text);
}

/**
 * Load trust configuration into the main trust settings.
 * @param trustConfig The trust configuration object
 */
export function loadTrustConfig(trustConfig: TrustConfig): void {
  neon.loadTrustConfig(JSON.stringify(trustConfig));
}

/**
 * Load trust configuration into the CAWG trust settings.
 * @param trustConfig The trust configuration object
 */
export function loadCawgTrustConfig(trustConfig: TrustConfig): void {
  neon.loadCawgTrustConfig(JSON.stringify(trustConfig));
}

/**
 * Get the current trust configuration.
 * @returns The current trust configuration object
 */
export function getTrustConfig(): TrustConfig {
  const json = neon.getTrustConfig();
  return JSON.parse(json);
}

/**
 * Get the current CAWG trust configuration.
 * @returns The current CAWG trust configuration object
 */
export function getCawgTrustConfig(): TrustConfig {
  const json = neon.getCawgTrustConfig();
  return JSON.parse(json);
}
