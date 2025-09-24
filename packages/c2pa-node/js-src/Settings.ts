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

const neon = require("./index.node");
import * as fs from "fs-extra";
import path from "path";
import fetch from "node-fetch";
import type { TrustConfig, VerifyConfig } from "./types";

/**
 * Load settings from a JSON string and apply them globally.
 * @param json The JSON string containing the settings configuration
 */
export function loadC2paSettings(json: string): void {
  neon.loadSettings(json);
}

/**
 * Load settings from a TOML string and apply them globally.
 * @param toml The TOML string containing the settings configuration
 */
export function loadC2paSettingsToml(toml: string): void {
  neon.loadSettingsToml(toml);
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
    loadC2paSettings(content);
    return;
  }
  // Assume JSON (or JSON5 that is valid JSON) otherwise
  // If needed, callers can ensure the content is valid JSON.
  loadC2paSettings(content);
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
    loadC2paSettingsToml(text);
    return;
  }
  // Treat as JSON by default
  loadC2paSettings(text);
}

/**
 * Get the current settings as a JSON string.
 * @returns The JSON representation of the current settings
 */
export function getSettingsJson(): string {
  return neon.getSettingsJson();
}

/**
 * Load trust configuration into the main trust settings.
 * @param trustConfig The trust configuration object
 */
export function loadTrustConfig(trustConfig: TrustConfig): void {
  // Convert camelCase to snake_case for Rust compatibility
  // Explicitly set undefined fields to null to ensure they are cleared
  const rustConfig = {
    verify_trust_list: trustConfig.verifyTrustList,
    user_anchors: trustConfig.userAnchors ?? null,
    trust_anchors: trustConfig.trustAnchors ?? null,
    trust_config: trustConfig.trustConfig ?? null,
    allowed_list: trustConfig.allowedList ?? null,
  };
  neon.loadTrustConfig(JSON.stringify(rustConfig));
}

/**
 * Load trust configuration into the CAWG trust settings.
 * @param trustConfig The trust configuration object
 */
export function loadCawgTrustConfig(trustConfig: TrustConfig): void {
  // Convert camelCase to snake_case for Rust compatibility
  // Explicitly set undefined fields to null to ensure they are cleared
  const rustConfig = {
    verify_trust_list: trustConfig.verifyTrustList,
    user_anchors: trustConfig.userAnchors ?? null,
    trust_anchors: trustConfig.trustAnchors ?? null,
    trust_config: trustConfig.trustConfig ?? null,
    allowed_list: trustConfig.allowedList ?? null,
  };
  neon.loadCawgTrustConfig(JSON.stringify(rustConfig));
}

/**
 * Get the current trust configuration.
 * @returns The current trust configuration object
 */
export function getTrustConfig(): TrustConfig {
  const json = neon.getTrustConfig();
  const parsed = JSON.parse(json);

  // Convert snake_case to camelCase to match TrustConfig interface
  // Handle undefined values by converting them to null
  return {
    verifyTrustList: parsed.verify_trust_list,
    userAnchors: parsed.user_anchors ?? null,
    trustAnchors: parsed.trust_anchors ?? null,
    trustConfig: parsed.trust_config ?? null,
    allowedList: parsed.allowed_list ?? null,
  };
}

/**
 * Get the current CAWG trust configuration.
 * @returns The current CAWG trust configuration object
 */
export function getCawgTrustConfig(): TrustConfig {
  const json = neon.getCawgTrustConfig();
  const parsed = JSON.parse(json);

  // Convert snake_case to camelCase to match TrustConfig interface
  // Handle undefined values by converting them to null
  return {
    verifyTrustList: parsed.verify_trust_list,
    userAnchors: parsed.user_anchors ?? null,
    trustAnchors: parsed.trust_anchors ?? null,
    trustConfig: parsed.trust_config ?? null,
    allowedList: parsed.allowed_list ?? null,
  };
}

/**
 * Load verify configuration into the verify settings.
 * @param verifyConfig The verify configuration object
 */
export function loadVerifyConfig(verifyConfig: VerifyConfig): void {
  // Convert camelCase to snake_case for Rust compatibility
  const rustConfig = {
    verify_after_reading: verifyConfig.verifyAfterReading,
    verify_after_sign: verifyConfig.verifyAfterSign,
    verify_trust: verifyConfig.verifyTrust,
    verify_timestamp_trust: verifyConfig.verifyTimestampTrust,
    ocsp_fetch: verifyConfig.ocspFetch,
    remote_manifest_fetch: verifyConfig.remoteManifestFetch,
    check_ingredient_trust: verifyConfig.checkIngredientTrust,
    skip_ingredient_conflict_resolution:
      verifyConfig.skipIngredientConflictResolution,
    strict_v1_validation: verifyConfig.strictV1Validation,
  };
  neon.loadVerifyConfig(JSON.stringify(rustConfig));
}

/**
 * Patch the verify configuration with any subset of fields.
 * @param patch Partial verify config fields to update
 */
export function patchVerifyConfig(patch: Partial<VerifyConfig>): void {
  const current = getVerifyConfig();
  const updated = { ...current, ...patch };
  loadVerifyConfig(updated);
}

/**
 * Get the current verify configuration.
 * @returns The current verify configuration object
 */
export function getVerifyConfig(): VerifyConfig {
  const json = neon.getVerifyConfig();
  const parsed = JSON.parse(json);

  // Convert snake_case to camelCase to match VerifyConfig interface
  return {
    verifyAfterReading: parsed.verify_after_reading,
    verifyAfterSign: parsed.verify_after_sign,
    verifyTrust: parsed.verify_trust,
    verifyTimestampTrust: parsed.verify_timestamp_trust,
    ocspFetch: parsed.ocsp_fetch,
    remoteManifestFetch: parsed.remote_manifest_fetch,
    checkIngredientTrust: parsed.check_ingredient_trust,
    skipIngredientConflictResolution:
      parsed.skip_ingredient_conflict_resolution,
    strictV1Validation: parsed.strict_v1_validation,
  };
}
