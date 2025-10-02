// Copyright 2025 Adobe. All rights reserved.
// This file is licensed to you under the Apache License,
// Version 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
// or the MIT license (http://opensource.org/licenses/MIT),
// at your option.

import type { TrustConfig, VerifyConfig } from "./types";
import {
  loadC2paSettings,
  loadTrustConfig,
  loadCawgTrustConfig,
  getSettingsJson,
  getTrustConfig,
  getCawgTrustConfig,
  loadVerifyConfig,
  getVerifyConfig,
  patchVerifyConfig,
} from "./Settings";

describe("Settings", () => {
  it("loads a trustlist-shaped JSON and returns JSON via getSettingsJson", () => {
    // Matches c2pa-rs settings structure: trust + verify
    // trust.allowed_list accepts base64 lines or PEMs; provide a simple base64 line
    const settings = {
      trust: {
        allowed_list: "Zm9v\n", // base64("foo") with newline
      },
      verify: {
        verify_trust: true,
      },
    };

    loadC2paSettings(JSON.stringify(settings));

    const obj = JSON.parse(getSettingsJson());
    expect(obj).toBeTruthy();
    expect(obj.trust?.allowed_list).toBe("Zm9v\n");
    expect(obj.verify?.verify_trust).toBe(true);
  });
  describe("loadTrustConfig", () => {
    it("preserves other settings when loading trust config", () => {
      // First, load basic settings that work with c2pa-rs
      const initialSettings = {
        trust: {
          allowed_list: "Zm9v\n", // base64("foo") with newline - valid base64
        },
        verify: {
          verify_trust: true,
        },
      };

      loadC2paSettings(JSON.stringify(initialSettings));

      // Verify initial settings are loaded
      const currentSettings = JSON.parse(getSettingsJson());
      expect(currentSettings.verify.verify_trust).toBe(true);
      expect(currentSettings.trust.allowed_list).toBe("Zm9v\n");

      // Now load only trust config
      const trustConfig: TrustConfig = {
        verifyTrustList: true,
        userAnchors: "dGVzdA==\n", // base64("test") with newline - valid base64
        trustAnchors: "YW5jaG9y\n", // base64("anchor") with newline - valid base64
        allowedList: "Zm9v\n", // base64("foo") with newline
      };

      loadTrustConfig(trustConfig);

      // Verify trust config was updated
      const updatedSettings = JSON.parse(getSettingsJson());
      expect(updatedSettings.trust.allowed_list).toBe("Zm9v\n");
      expect(updatedSettings.trust.user_anchors).toBe("dGVzdA==\n");
      expect(updatedSettings.trust.trust_anchors).toBe("YW5jaG9y\n");

      // Verify other settings are preserved
      expect(updatedSettings.verify.verify_trust).toBe(true);
    });

    it("works with getTrustConfig to retrieve current trust settings", () => {
      // Load initial trust config
      const initialTrustConfig: TrustConfig = {
        verifyTrustList: false,
        userAnchors: "dGVzdA==\n", // base64("test") with newline - valid base64
        trustAnchors: "YW5jaG9y\n", // base64("anchor") with newline - valid base64
      };

      loadTrustConfig(initialTrustConfig);

      // Verify we can retrieve it
      const retrievedConfig = getTrustConfig();
      expect(retrievedConfig.verifyTrustList).toBe(false);
      expect(retrievedConfig.userAnchors).toBe("dGVzdA==\n");
      expect(retrievedConfig.trustAnchors).toBe("YW5jaG9y\n");

      // Update trust config
      const updatedTrustConfig: TrustConfig = {
        verifyTrustList: true,
        allowedList: "YmFy\n", // base64("bar") with newline
        trustConfig: "dHJ1c3Q=\n", // base64("trust") with newline - valid base64
      };

      loadTrustConfig(updatedTrustConfig);

      // Verify updated config
      const updatedRetrievedConfig = getTrustConfig();
      expect(updatedRetrievedConfig.verifyTrustList).toBe(true);
      expect(updatedRetrievedConfig.allowedList).toBe("YmFy\n");
      expect(updatedRetrievedConfig.trustConfig).toBe("dHJ1c3Q=\n");
      // Previous values should be cleared when not specified
      expect(updatedRetrievedConfig.userAnchors).toBeNull();
      expect(updatedRetrievedConfig.trustAnchors).toBeNull();
    });

    it("handles empty trust config without errors", () => {
      // Load some initial settings
      const initialSettings = {
        core: { hash_alg: "sha256" },
        verify: { verify_trust: true },
      };
      loadC2paSettings(JSON.stringify(initialSettings));

      // Load empty trust config
      const emptyTrustConfig: TrustConfig = {
        verifyTrustList: true,
      };

      expect(() => loadTrustConfig(emptyTrustConfig)).not.toThrow();

      // Verify settings are still intact
      const currentSettings = JSON.parse(getSettingsJson());
      expect(currentSettings.core.hash_alg).toBe("sha256");
      expect(currentSettings.verify.verify_trust).toBe(true);
      expect(currentSettings.trust.verify_trust_list).toBe(true);
    });
  });

  describe("loadCawgTrustConfig", () => {
    it("preserves other settings when loading CAWG trust config", () => {
      // First, load basic settings that work with c2pa-rs
      const initialSettings = {
        verify: {
          verify_trust: false,
        },
        trust: {
          allowed_list: "YmFy\n", // base64("bar") with newline - valid base64
        },
      };

      loadC2paSettings(JSON.stringify(initialSettings));

      // Load CAWG trust config
      const cawgTrustConfig: TrustConfig = {
        verifyTrustList: true,
        userAnchors: "Y2F3Zw==\n", // base64("cawg") with newline - valid base64
        allowedList: "Y2F3Zw==\n", // base64("cawg") with newline
      };

      loadCawgTrustConfig(cawgTrustConfig);

      // Verify CAWG trust config was updated
      const updatedSettings = JSON.parse(getSettingsJson());
      expect(updatedSettings.cawg_trust.allowed_list).toBe("Y2F3Zw==\n");
      expect(updatedSettings.cawg_trust.user_anchors).toBe("Y2F3Zw==\n");

      // Verify other settings are preserved
      expect(updatedSettings.verify.verify_trust).toBe(false);
      expect(updatedSettings.trust.allowed_list).toBe("YmFy\n");
    });

    it("works with getCawgTrustConfig to retrieve current CAWG trust settings", () => {
      // Load CAWG trust config
      const cawgTrustConfig: TrustConfig = {
        verifyTrustList: true,
        userAnchors: "Y2F3Zw==\n", // base64("cawg") with newline - valid base64
        trustConfig: "c3RvcmU=\n", // base64("store") with newline - valid base64
      };

      loadCawgTrustConfig(cawgTrustConfig);

      // Verify we can retrieve it
      const retrievedConfig = getCawgTrustConfig();
      expect(retrievedConfig.verifyTrustList).toBe(true);
      expect(retrievedConfig.userAnchors).toBe("Y2F3Zw==\n");
      expect(retrievedConfig.trustConfig).toBe("c3RvcmU=\n");
    });
  });

  describe("settings merge behavior", () => {
    it("maintains separate trust and CAWG trust configurations", () => {
      // Load initial settings with basic trust config and verify settings
      const initialSettings = {
        trust: {
          allowed_list: "bWFpbg==\n", // base64("main") with newline - valid base64
        },
        verify: {
          verify_trust: true,
          remote_manifest_fetch: false,
        },
      };

      loadC2paSettings(JSON.stringify(initialSettings));

      // Update main trust config
      const mainTrustConfig: TrustConfig = {
        verifyTrustList: true,
        allowedList: "bWFpbg==\n", // base64("main") with newline
      };
      loadTrustConfig(mainTrustConfig);

      // Update CAWG trust config
      const cawgTrustConfig: TrustConfig = {
        verifyTrustList: false,
        allowedList: "Y2F3Zw==\n", // base64("cawg") with newline
      };
      loadCawgTrustConfig(cawgTrustConfig);

      // Update verify config to ensure it doesn't conflict with trust settings
      const verifyConfig: VerifyConfig = {
        verifyAfterReading: false,
        verifyAfterSign: true,
        verifyTrust: false, // This should not affect trust.allowed_list
        verifyTimestampTrust: true,
        ocspFetch: false,
        remoteManifestFetch: true, // This should not affect trust settings
        checkIngredientTrust: false,
        skipIngredientConflictResolution: true,
        strictV1Validation: false,
      };
      loadVerifyConfig(verifyConfig);

      // Verify all configs are maintained separately
      const finalSettings = JSON.parse(getSettingsJson());

      // Main trust config should be preserved
      expect(finalSettings.trust.allowed_list).toBe("bWFpbg==\n");
      expect(finalSettings.trust.verify_trust_list).toBe(true);

      // CAWG trust config should be preserved
      expect(finalSettings.cawg_trust.allowed_list).toBe("Y2F3Zw==\n");
      expect(finalSettings.cawg_trust.verify_trust_list).toBe(false);

      // Verify config should be updated independently
      expect(finalSettings.verify.verify_after_reading).toBe(false);
      expect(finalSettings.verify.verify_after_sign).toBe(true);
      expect(finalSettings.verify.verify_trust).toBe(false);
      expect(finalSettings.verify.verify_timestamp_trust).toBe(true);
      expect(finalSettings.verify.ocsp_fetch).toBe(false);
      expect(finalSettings.verify.remote_manifest_fetch).toBe(true);
      expect(finalSettings.verify.check_ingredient_trust).toBe(false);
      expect(finalSettings.verify.skip_ingredient_conflict_resolution).toBe(true);
      expect(finalSettings.verify.strict_v1_validation).toBe(false);

      // Verify that trust settings are not affected by verify settings
      expect(finalSettings.trust.allowed_list).toBe("bWFpbg==\n");
      expect(finalSettings.cawg_trust.allowed_list).toBe("Y2F3Zw==\n");

      // Settings structure is maintained
      expect(finalSettings).toBeTruthy();
    });
  });

  describe("Verify Settings", () => {
    it("loads and retrieves verify configuration", () => {
      const verifyConfig: VerifyConfig = {
        verifyAfterReading: true,
        verifyAfterSign: false,
        verifyTrust: true,
        verifyTimestampTrust: false,
        ocspFetch: true,
        remoteManifestFetch: false,
        checkIngredientTrust: true,
        skipIngredientConflictResolution: false,
        strictV1Validation: true,
      };

      loadVerifyConfig(verifyConfig);

      const retrievedConfig = getVerifyConfig();
      expect(retrievedConfig).toEqual(verifyConfig);
    });

    it("preserves other settings when loading verify config", () => {
      // First, load basic settings
      const initialSettings = {
        trust: {
          allowed_list: "Zm9v\n", // base64("foo") with newline - valid base64
        },
        verify: {
          verify_trust: true,
        },
      };

      loadC2paSettings(JSON.stringify(initialSettings));

      // Load verify config
      const verifyConfig: VerifyConfig = {
        verifyAfterReading: false,
        verifyAfterSign: true,
        verifyTrust: false,
        verifyTimestampTrust: true,
        ocspFetch: false,
        remoteManifestFetch: true,
        checkIngredientTrust: false,
        skipIngredientConflictResolution: true,
        strictV1Validation: false,
      };
      loadVerifyConfig(verifyConfig);

      // Verify the settings are maintained
      const finalSettings = JSON.parse(getSettingsJson());
      expect(finalSettings.trust.allowed_list).toBe("Zm9v\n");
      expect(finalSettings.verify.verify_after_reading).toBe(false);
      expect(finalSettings.verify.verify_after_sign).toBe(true);
      expect(finalSettings.verify.verify_trust).toBe(false);
      expect(finalSettings.verify.verify_timestamp_trust).toBe(true);
      expect(finalSettings.verify.ocsp_fetch).toBe(false);
      expect(finalSettings.verify.remote_manifest_fetch).toBe(true);
      expect(finalSettings.verify.check_ingredient_trust).toBe(false);
      expect(finalSettings.verify.skip_ingredient_conflict_resolution).toBe(true);
      expect(finalSettings.verify.strict_v1_validation).toBe(false);
    });

    it("patches verify configuration with partial updates", () => {
      // First, load initial verify configuration
      const initialVerifyConfig: VerifyConfig = {
        verifyAfterReading: true,
        verifyAfterSign: true,
        verifyTrust: false,
        verifyTimestampTrust: true,
        ocspFetch: false,
        remoteManifestFetch: true,
        checkIngredientTrust: true,
        skipIngredientConflictResolution: false,
        strictV1Validation: false,
      };

      loadVerifyConfig(initialVerifyConfig);

      // Verify initial configuration is loaded
      const initialRetrievedConfig = getVerifyConfig();
      expect(initialRetrievedConfig).toEqual(initialVerifyConfig);

      // Patch only specific fields
      const patch: Partial<VerifyConfig> = {
        verifyTrust: true,
        ocspFetch: true,
        strictV1Validation: true,
      };

      patchVerifyConfig(patch);

      // Verify the patched configuration
      const patchedRetrievedConfig = getVerifyConfig();
      expect(patchedRetrievedConfig.verifyAfterReading).toBe(true); // unchanged
      expect(patchedRetrievedConfig.verifyAfterSign).toBe(true); // unchanged
      expect(patchedRetrievedConfig.verifyTrust).toBe(true); // patched
      expect(patchedRetrievedConfig.verifyTimestampTrust).toBe(true); // unchanged
      expect(patchedRetrievedConfig.ocspFetch).toBe(true); // patched
      expect(patchedRetrievedConfig.remoteManifestFetch).toBe(true); // unchanged
      expect(patchedRetrievedConfig.checkIngredientTrust).toBe(true); // unchanged
      expect(patchedRetrievedConfig.skipIngredientConflictResolution).toBe(false); // unchanged
      expect(patchedRetrievedConfig.strictV1Validation).toBe(true); // patched

      // Verify the changes are reflected in getSettingsJson()
      const settingsJson = getSettingsJson();
      const settings = JSON.parse(settingsJson);
      expect(settings.verify.verify_trust).toBe(true);
      expect(settings.verify.ocsp_fetch).toBe(true);
      expect(settings.verify.strict_v1_validation).toBe(true);
      expect(settings.verify.verify_after_reading).toBe(true);
      expect(settings.verify.verify_after_sign).toBe(true);
      expect(settings.verify.verify_timestamp_trust).toBe(true);
      expect(settings.verify.remote_manifest_fetch).toBe(true);
      expect(settings.verify.check_ingredient_trust).toBe(true);
      expect(settings.verify.skip_ingredient_conflict_resolution).toBe(false);
    });
  });
});
