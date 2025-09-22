// Copyright 2025 Adobe. All rights reserved.
// This file is licensed to you under the Apache License,
// Version 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
// or the MIT license (http://opensource.org/licenses/MIT),
// at your option.

import type { TrustConfig } from "./types";
import {
  loadSettings,
  loadTrustConfig,
  loadCawgTrustConfig,
  getSettingsJson,
  getTrustConfig,
  getCawgTrustConfig,
} from "./settings";

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

    loadSettings(JSON.stringify(settings));

    const obj = JSON.parse(getSettingsJson());
    expect(obj).toBeTruthy();
    expect(obj.trust?.allowed_list).toBe("Zm9v\n");
    expect(obj.verify?.verify_trust).toBe(true);
  });
  /*
  describe("loadTrustConfig", () => {
    it("preserves other settings when loading trust config", () => {
      // First, load comprehensive settings with various sections
      const initialSettings = {
        core: {
          hash_alg: "sha384",
          salt_jumbf_boxes: false,
          compress_manifests: false,
        },
        verify: {
          verify_after_reading: false,
          verify_after_sign: false,
          verify_trust: true,
          ocsp_fetch: true,
        },
        trust: {
          verify_trust_list: false,
          user_anchors: "initial_user_anchors",
          trust_anchors: "initial_trust_anchors",
        },
        builder: {
          thumbnail: {
            enabled: true,
            max_pixels: 1000000,
          },
        },
      };

      loadSettings(JSON.stringify(initialSettings));

      // Verify initial settings are loaded
      let currentSettings = JSON.parse(getSettingsJson());
      expect(currentSettings.core.hash_alg).toBe("sha384");
      expect(currentSettings.core.salt_jumbf_boxes).toBe(false);
      expect(currentSettings.verify.verify_after_reading).toBe(false);
      expect(currentSettings.verify.ocsp_fetch).toBe(true);
      expect(currentSettings.trust.user_anchors).toBe("initial_user_anchors");
      expect(currentSettings.builder.thumbnail.enabled).toBe(true);

      // Now load only trust config
      const trustConfig: TrustConfig = {
        verifyTrustList: true,
        userAnchors: "new_user_anchors",
        trustAnchors: "new_trust_anchors",
        allowedList: "Zm9v\n", // base64("foo") with newline
      };

      loadTrustConfig(trustConfig);

      // Verify trust config was updated
      const updatedSettings = JSON.parse(getSettingsJson());
      expect(updatedSettings.trust.verify_trust_list).toBe(true);
      expect(updatedSettings.trust.user_anchors).toBe("new_user_anchors");
      expect(updatedSettings.trust.trust_anchors).toBe("new_trust_anchors");
      expect(updatedSettings.trust.allowed_list).toBe("Zm9v\n");

      // Verify other settings are preserved
      expect(updatedSettings.core.hash_alg).toBe("sha384");
      expect(updatedSettings.core.salt_jumbf_boxes).toBe(false);
      expect(updatedSettings.core.compress_manifests).toBe(false);
      expect(updatedSettings.verify.verify_after_reading).toBe(false);
      expect(updatedSettings.verify.verify_after_sign).toBe(false);
      expect(updatedSettings.verify.verify_trust).toBe(true);
      expect(updatedSettings.verify.ocsp_fetch).toBe(true);
      expect(updatedSettings.builder.thumbnail.enabled).toBe(true);
      expect(updatedSettings.builder.thumbnail.max_pixels).toBe(1000000);
    });

    it("works with getTrustConfig to retrieve current trust settings", () => {
      // Load initial trust config
      const initialTrustConfig: TrustConfig = {
        verifyTrustList: false,
        userAnchors: "test_anchors.pem",
        trustAnchors: "trust_anchors.pem",
      };

      loadTrustConfig(initialTrustConfig);

      // Verify we can retrieve it
      const retrievedConfig = getTrustConfig();
      expect(retrievedConfig.verifyTrustList).toBe(false);
      expect(retrievedConfig.userAnchors).toBe("test_anchors.pem");
      expect(retrievedConfig.trustAnchors).toBe("trust_anchors.pem");

      // Update trust config
      const updatedTrustConfig: TrustConfig = {
        verifyTrustList: true,
        allowedList: "YmFy\n", // base64("bar") with newline
        trustConfig: "trust_store.cfg",
      };

      loadTrustConfig(updatedTrustConfig);

      // Verify updated config
      const updatedRetrievedConfig = getTrustConfig();
      expect(updatedRetrievedConfig.verifyTrustList).toBe(true);
      expect(updatedRetrievedConfig.allowedList).toBe("YmFy\n");
      expect(updatedRetrievedConfig.trustConfig).toBe("trust_store.cfg");
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
      loadSettings(JSON.stringify(initialSettings));

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
      // First, load comprehensive settings
      const initialSettings = {
        core: {
          hash_alg: "sha512",
          compress_manifests: true,
        },
        verify: {
          verify_after_reading: true,
          verify_trust: false,
        },
        trust: {
          verify_trust_list: true,
          user_anchors: "main_trust_anchors",
        },
        cawg_trust: {
          verify_trust_list: false,
          user_anchors: "old_cawg_anchors",
        },
      };

      loadSettings(JSON.stringify(initialSettings));

      // Load CAWG trust config
      const cawgTrustConfig: TrustConfig = {
        verifyTrustList: true,
        userAnchors: "new_cawg_anchors",
        allowedList: "Y2F3Zw==\n", // base64("cawg") with newline
      };

      loadCawgTrustConfig(cawgTrustConfig);

      // Verify CAWG trust config was updated
      const updatedSettings = JSON.parse(getSettingsJson());
      expect(updatedSettings.cawg_trust.verify_trust_list).toBe(true);
      expect(updatedSettings.cawg_trust.user_anchors).toBe("new_cawg_anchors");
      expect(updatedSettings.cawg_trust.allowed_list).toBe("Y2F3Zw==\n");

      // Verify other settings are preserved
      expect(updatedSettings.core.hash_alg).toBe("sha512");
      expect(updatedSettings.core.compress_manifests).toBe(true);
      expect(updatedSettings.verify.verify_after_reading).toBe(true);
      expect(updatedSettings.verify.verify_trust).toBe(false);
      expect(updatedSettings.trust.verify_trust_list).toBe(true);
      expect(updatedSettings.trust.user_anchors).toBe("main_trust_anchors");
    });

    it("works with getCawgTrustConfig to retrieve current CAWG trust settings", () => {
      // Load CAWG trust config
      const cawgTrustConfig: TrustConfig = {
        verifyTrustList: true,
        userAnchors: "cawg_test_anchors.pem",
        trustConfig: "cawg_store.cfg",
      };

      loadCawgTrustConfig(cawgTrustConfig);

      // Verify we can retrieve it
      const retrievedConfig = getCawgTrustConfig();
      expect(retrievedConfig.verifyTrustList).toBe(true);
      expect(retrievedConfig.userAnchors).toBe("cawg_test_anchors.pem");
      expect(retrievedConfig.trustConfig).toBe("cawg_store.cfg");
    });
  });

  describe("settings merge behavior", () => {
    it("maintains separate trust and CAWG trust configurations", () => {
      // Load initial settings with both trust configs
      const initialSettings = {
        trust: {
          verify_trust_list: false,
          user_anchors: "main_trust",
        },
        cawg_trust: {
          verify_trust_list: true,
          user_anchors: "cawg_trust",
        },
        core: {
          hash_alg: "sha256",
        },
      };

      loadSettings(JSON.stringify(initialSettings));

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

      // Verify both configs are maintained separately
      const finalSettings = JSON.parse(getSettingsJson());

      // Main trust config
      expect(finalSettings.trust.verify_trust_list).toBe(true);
      expect(finalSettings.trust.allowed_list).toBe("bWFpbg==\n");
      expect(finalSettings.trust.user_anchors).toBe("main_trust");

      // CAWG trust config
      expect(finalSettings.cawg_trust.verify_trust_list).toBe(false);
      expect(finalSettings.cawg_trust.allowed_list).toBe("Y2F3Zw==\n");
      expect(finalSettings.cawg_trust.user_anchors).toBe("cawg_trust");

      // Other settings preserved
      expect(finalSettings.core.hash_alg).toBe("sha256");
    });
  });
  */
});
