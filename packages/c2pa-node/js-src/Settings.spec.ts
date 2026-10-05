// Copyright 2025 Adobe. All rights reserved.
// This file is licensed to you under the Apache License,
// Version 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
// or the MIT license (http://opensource.org/licenses/MIT),
// at your option.

import fs from "fs-extra";
import * as path from "path";
import * as os from "os";

import {
  Context,
  DEFAULT_SETTINGS,
  mergeSettings,
  settingsToJson,
} from "@contentauth/c2pa-utilities";
import { vi } from "vitest";

import {
  loadSettingsFromFile,
  resolveRawSettingsForNeon,
  resolveSettingsForNeon,
} from "./Settings.js";

describe("Settings", () => {
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

  describe("resolveRawSettingsForNeon", () => {
    it("returns undefined when omitted", () => {
      expect(resolveRawSettingsForNeon(undefined)).toBeUndefined();
    });

    it("returns undefined when null is passed in", () => {
      // A plain-JS caller can pass `null` explicitly.
      // It must not fall through to JSON.stringify(null), which would send the
      // native library the literal string "null" instead of "no settings".
      expect(resolveRawSettingsForNeon(null)).toBeUndefined();
    });

    it("passes raw settings through unchanged", () => {
      const rawSettings = { verify: { verify_trust: false } };
      const result = resolveRawSettingsForNeon(rawSettings);
      expect(JSON.parse(result!)).toEqual(rawSettings);
    });

    it("passes raw settings JSON through unchanged", () => {
      const json = JSON.stringify({ verify: { verify_trust: false } });
      expect(resolveRawSettingsForNeon(json)).toBe(json);
    });
  });

  describe("resolveSettingsForNeon", () => {
    it("returns undefined when omitted", async () => {
      expect(await resolveSettingsForNeon(undefined)).toBeUndefined();
    });

    it("returns undefined when null is passed in", async () => {
      expect(await resolveSettingsForNeon(null)).toBeUndefined();
    });

    it("applies defaults for an empty Context", async () => {
      const result = await resolveSettingsForNeon(new Context());
      expect(JSON.parse(result!)).toEqual(
        JSON.parse(settingsToJson(DEFAULT_SETTINGS)),
      );
    });

    it("merges a Context's settings with defaults", async () => {
      const settings = { verify: { verifyTrust: false } };
      const result = await resolveSettingsForNeon(new Context(settings));
      expect(JSON.parse(result!)).toEqual(
        JSON.parse(settingsToJson(mergeSettings(DEFAULT_SETTINGS, settings))),
      );
    });

    it("fetches trust-anchor URLs before returning Context settings", async () => {
      const pem = "-----BEGIN CERTIFICATE-----\nanchor\n-----END CERTIFICATE-----";
      const fetch = vi.fn(async () => new Response(pem));
      vi.stubGlobal("fetch", fetch);

      try {
        const result = await resolveSettingsForNeon(
          new Context({
            trust: { trustAnchors: "https://example.com/anchors.pem" },
          }),
        );

        expect(fetch).toHaveBeenCalledOnce();
        expect(JSON.parse(result!).trust.anchors[0].trust_anchors).toBe(pem);
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it("keeps deprecated raw settings unchanged", async () => {
      const rawSettings = { verify: { verify_trust: false } };
      const result = await resolveSettingsForNeon(rawSettings);
      expect(JSON.parse(result!)).toEqual(rawSettings);
    });
  });
});
