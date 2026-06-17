// Copyright 2025 Adobe. All rights reserved.
// This file is licensed to you under the Apache License,
// Version 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
// or the MIT license (http://opensource.org/licenses/MIT),
// at your option.

import {
  createTrustSettings,
  createCawgTrustSettings,
  createVerifySettings,
  mergeSettings,
  settingsToJson,
  loadSettingsFromFile,
  loadSettingsFromUrl,
} from "./Settings.js";
import type { TrustConfig, VerifyConfig, SettingsContext } from "./types.d.ts";
import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";
import { vi } from "vitest";

// Mock node-fetch
vi.mock("node-fetch", () => ({
  default: vi.fn(),
}));

describe("Settings", () => {
  it("creates trust settings", () => {
    const trustConfig: TrustConfig = {
      verifyTrustList: true,
      userAnchors: "test",
      allowedList: "allowed",
    };

    const settings = createTrustSettings(trustConfig);
    expect(settings.trust).toBeDefined();
    expect(settings.trust?.verifyTrustList).toBe(true);
    expect(settings.trust?.userAnchors).toBe("test");
    expect(settings.trust?.allowedList).toBe("allowed");
  });

  it("creates CAWG trust settings", () => {
    const trustConfig: TrustConfig = {
      verifyTrustList: false,
      trustAnchors: "anchors",
    };

    const settings = createCawgTrustSettings(trustConfig);
    expect(settings.cawgTrust).toBeDefined();
    expect(settings.cawgTrust?.verifyTrustList).toBe(false);
    expect(settings.cawgTrust?.trustAnchors).toBe("anchors");
  });

  it("creates verify settings", () => {
    const verifyConfig: VerifyConfig = {
      verifyAfterReading: true,
      verifyAfterSign: false,
      verifyTrust: true,
      verifyTimestampTrust: false,
      ocspFetch: true,
      remoteManifestFetch: false,
      skipIngredientConflictResolution: true,
      strictV1Validation: false,
    };

    const settings = createVerifySettings(verifyConfig);
    expect(settings.verify).toBeDefined();
    expect(settings.verify?.verifyAfterReading).toBe(true);
    expect(settings.verify?.verifyAfterSign).toBe(false);
    expect(settings.verify?.verifyTrust).toBe(true);
    expect(settings.verify?.ocspFetch).toBe(true);
  });

  it("creates verify settings with partial config", () => {
    const settings = createVerifySettings({
      verifyAfterReading: false,
    });

    expect(settings.verify).toBeDefined();
    expect(settings.verify?.verifyAfterReading).toBe(false);
    expect(settings.verify?.verifyAfterSign).toBeUndefined();
    expect(settings.verify?.verifyTrust).toBeUndefined();
  });

  it("merges multiple settings", () => {
    const trustSettings = createTrustSettings({
      verifyTrustList: true,
      userAnchors: "test",
    });

    const verifySettings = createVerifySettings({
      verifyAfterReading: false,
      verifyAfterSign: true,
      verifyTrust: true,
      verifyTimestampTrust: true,
      ocspFetch: false,
      remoteManifestFetch: true,
      skipIngredientConflictResolution: false,
      strictV1Validation: false,
    });

    const merged = mergeSettings(trustSettings, verifySettings);
    expect(merged.trust).toBeDefined();
    expect(merged.verify).toBeDefined();
    expect(merged.trust?.verifyTrustList).toBe(true);
    expect(merged.verify?.verifyAfterReading).toBe(false);
  });

  it("converts settings to JSON with snake_case keys", () => {
    const settings = createVerifySettings({
      verifyAfterReading: true,
      verifyAfterSign: true,
      verifyTrust: false,
      verifyTimestampTrust: true,
      ocspFetch: false,
      remoteManifestFetch: true,
      skipIngredientConflictResolution: false,
      strictV1Validation: false,
    });

    const json = settingsToJson(settings);
    expect(json).toContain("verify");
    expect(json).toContain("verify_after_reading");

    // Should be parseable with snake_case keys
    const parsed = JSON.parse(json);
    expect(parsed.verify.verify_after_reading).toBe(true);
  });

  it("does not include undefined values in trust settings JSON", () => {
    const trustConfig: TrustConfig = {
      verifyTrustList: true,
    };

    const settings = createTrustSettings(trustConfig);
    const json = settingsToJson(settings);
    const parsed = JSON.parse(json);

    expect(parsed.trust.verify_trust_list).toBe(true);
    expect("user_anchors" in parsed.trust).toBe(false);
    expect("trust_anchors" in parsed.trust).toBe(false);
    expect("trust_config" in parsed.trust).toBe(false);
    expect("allowed_list" in parsed.trust).toBe(false);
  });

  it("does not include undefined values in CAWG trust settings JSON", () => {
    const trustConfig: TrustConfig = {
      verifyTrustList: false,
    };

    const settings = createCawgTrustSettings(trustConfig);
    const json = settingsToJson(settings);
    const parsed = JSON.parse(json);

    expect(parsed.cawg_trust.verify_trust_list).toBe(false);
    expect("user_anchors" in parsed.cawg_trust).toBe(false);
    expect("trust_anchors" in parsed.cawg_trust).toBe(false);
  });

  it("does not include undefined values in verify settings JSON", () => {
    const verifyConfig: VerifyConfig = {
      verifyAfterReading: true,
      verifyAfterSign: false,
    };

    const settings = createVerifySettings(verifyConfig);
    const json = settingsToJson(settings);
    const parsed = JSON.parse(json);

    expect(parsed.verify.verify_after_reading).toBe(true);
    expect(parsed.verify.verify_after_sign).toBe(false);
    expect("verify_trust" in parsed.verify).toBe(false);
    expect("verify_timestamp_trust" in parsed.verify).toBe(false);
    expect("ocsp_fetch" in parsed.verify).toBe(false);
    expect("remote_manifest_fetch" in parsed.verify).toBe(false);
  });

  it("does not include undefined values when merging settings", () => {
    const settings1: SettingsContext = {
      trust: {
        verifyTrustList: true,
        userAnchors: "test",
      },
    };

    const settings2: SettingsContext = {
      trust: {
        verifyTrustList: true,
        allowedList: undefined,
      },
      verify: {
        verifyAfterReading: false,
      },
    };

    const merged = mergeSettings(settings1, settings2);
    const json = settingsToJson(merged);
    const parsed = JSON.parse(json);

    expect(parsed.trust.verify_trust_list).toBe(true);
    expect(parsed.trust.user_anchors).toBe("test");
    expect("allowed_list" in parsed.trust).toBe(false);
    expect(parsed.verify.verify_after_reading).toBe(false);
  });

  it("merges settings with later values overriding earlier ones", () => {
    const settings1 = createVerifySettings({
      verifyAfterReading: true,
      verifyAfterSign: true,
      verifyTrust: false,
      verifyTimestampTrust: true,
      ocspFetch: false,
      remoteManifestFetch: true,
      skipIngredientConflictResolution: false,
      strictV1Validation: false,
    });

    const settings2: SettingsContext = {
      verify: {
        verifyTrust: true,
        ocspFetch: true,
      },
    };

    const merged = mergeSettings(settings1, settings2);
    expect(merged.verify?.verifyAfterReading).toBe(true); // from settings1
    expect(merged.verify?.verifyTrust).toBe(true); // overridden by settings2
    expect(merged.verify?.ocspFetch).toBe(true); // overridden by settings2
  });

  describe("loadSettingsFromFile", () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "c2pa-settings-test-"));
    });

    afterEach(async () => {
      await fs.remove(tempDir);
    });

    it("loads settings from a JSON file", async () => {
      const settingsContent = JSON.stringify({
        verify: {
          verify_after_reading: false,
          verify_after_sign: false,
        },
      });
      const filePath = path.join(tempDir, "settings.json");
      await fs.writeFile(filePath, settingsContent);

      const loaded = await loadSettingsFromFile(filePath);
      expect(loaded).toBe(settingsContent);

      // Verify it can be parsed
      const parsed = JSON.parse(loaded);
      expect(parsed.verify.verify_after_reading).toBe(false);
    });

    it("loads settings from a TOML file", async () => {
      const tomlContent = `[verify]
verify_after_reading = false
verify_after_sign = false`;
      const filePath = path.join(tempDir, "settings.toml");
      await fs.writeFile(filePath, tomlContent);

      const loaded = await loadSettingsFromFile(filePath);
      expect(loaded).toBe(tomlContent);
      expect(loaded).toContain("verify_after_reading");
    });

    it("throws error for non-existent file", async () => {
      const filePath = path.join(tempDir, "nonexistent.json");
      await expect(loadSettingsFromFile(filePath)).rejects.toThrow();
    });
  });

  describe("loadSettingsFromUrl", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("loads settings from a URL", async () => {
      const mockSettings = JSON.stringify({
        verify: {
          verify_after_reading: true,
        },
      });

      const fetch = (await import("node-fetch")).default;
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: async () => mockSettings,
      } as any);

      const loaded = await loadSettingsFromUrl(
        "https://example.com/settings.json",
      );
      expect(loaded).toBe(mockSettings);
      expect(fetch).toHaveBeenCalledWith("https://example.com/settings.json");
    });

    it("throws error for failed fetch", async () => {
      const fetch = (await import("node-fetch")).default;
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      } as any);

      await expect(
        loadSettingsFromUrl("https://example.com/missing.json"),
      ).rejects.toThrow("Failed to fetch settings from URL: 404 Not Found");
    });

    it("throws error for network failure", async () => {
      const fetch = (await import("node-fetch")).default;
      vi.mocked(fetch).mockRejectedValue(new Error("Network error"));

      await expect(
        loadSettingsFromUrl("https://example.com/settings.json"),
      ).rejects.toThrow("Network error");
    });
  });
});
