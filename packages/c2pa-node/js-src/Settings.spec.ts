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

import { loadSettingsFromFile, resolveSettingsForNeon } from "./Settings.js";

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

  describe("resolveSettingsForNeon", () => {
    it("returns undefined when omitted", () => {
      expect(resolveSettingsForNeon(undefined)).toBeUndefined();
    });

    it("returns undefined when null is passed in", () => {
      // A plain-JS caller can pass `null` explicitly.
      // It must not fall through to JSON.stringify(null), which would send the
      // native library the literal string "null" instead of "no settings".
      expect(resolveSettingsForNeon(null)).toBeUndefined();
    });

    it("applies defaults for an empty Context", () => {
      const result = resolveSettingsForNeon(new Context());
      expect(JSON.parse(result!)).toEqual(
        JSON.parse(settingsToJson(DEFAULT_SETTINGS)),
      );
    });

    it("merges a Context's settings with defaults", () => {
      const settings = { verify: { verifyTrust: false } };
      const result = resolveSettingsForNeon(new Context(settings));
      expect(JSON.parse(result!)).toEqual(
        JSON.parse(settingsToJson(mergeSettings(DEFAULT_SETTINGS, settings))),
      );
    });

    it("passes a raw settings object through as-is, without applying defaults", () => {
      // The deprecated raw-settings path preserves this package's pre-Context behavior exactly:
      // no defaults are merged in, unlike the Context path above.
      const result = resolveSettingsForNeon({
        verify: { verify_trust: false },
      });
      expect(JSON.parse(result!)).toEqual({ verify: { verify_trust: false } });
    });

    it("passes a raw settings JSON string through unchanged", () => {
      const json = JSON.stringify({ verify: { verify_trust: false } });
      expect(resolveSettingsForNeon(json)).toBe(json);
    });
  });
});
