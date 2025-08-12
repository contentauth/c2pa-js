// Copyright 2024 Adobe. All rights reserved.
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

import { Trustmark } from "./index";
import {
  TrustmarkConfig,
  TrustmarkVariant,
  TrustmarkVersion,
} from "index.node";
import path from "path";
import * as fs from "fs-extra";
import sharp from "sharp";

const tempDir = path.join(__dirname, "..", "tmp");

// Helper function to convert raw RGB pixel data to JPEG format
async function rawRgbToJpeg(
  rawRgbData: Buffer,
  width: number,
  height: number,
): Promise<Buffer> {
  // Create a sharp image from raw RGB data
  const image = sharp(rawRgbData, {
    raw: {
      width,
      height,
      channels: 3, // RGB
    },
  });

  // Convert to JPEG format
  return await image.jpeg().toBuffer();
}

describe("Trustmark", () => {
  let trustmark: Trustmark;
  let testImage: Buffer;
  let testImageWidth: number;
  let testImageHeight: number;

  const trustmarkConfig: TrustmarkConfig = {
    variant: "B" as TrustmarkVariant, // Original Trustmark model
    version: "BCH_3" as TrustmarkVersion, // Tolerates 3 bit flips
    modelPath: path.join(tempDir, "trustmark_models"), // Use temporary directory for model path
  };

  beforeAll(async () => {
    await fs.ensureDir(tempDir);
    // Use an actual test image from fixtures directory
    testImage = await fs.readFile("./tests/fixtures/A.jpg");

    // Get image dimensions for converting raw pixel data
    const imageInfo = await sharp(testImage).metadata();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    testImageWidth = imageInfo.width!;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    testImageHeight = imageInfo.height!;
  });

  beforeEach(async () => {
    // Note: In a real test environment, you would need a valid model file
    // For now, we'll mock the trustmark creation or handle the case where model doesn't exist
    trustmark = await Trustmark.newTrustmark(trustmarkConfig);
  });

  describe("newTrustmark", () => {
    it("should create a new trustmark instance with valid config", async () => {
      // This test will be skipped if the model file doesn't exist

      expect(trustmark).toBeDefined();
      expect(typeof trustmark.encode).toBe("function");
      expect(typeof trustmark.decode).toBe("function");
    });

    it("should throw error with invalid config", async () => {
      const invalidConfig: TrustmarkConfig = {
        variant: "X" as TrustmarkVariant, // Invalid variant
        version: "BCH_3" as TrustmarkVersion, // Valid version
      };

      await expect(Trustmark.newTrustmark(invalidConfig)).rejects.toThrow(
        "Watermark configuration error: invalid variant",
      );
    });
  });

  describe("encode", () => {
    it("should encode a watermark into an image with default watermark", async () => {
      const strength = 0.9;
      const encodedImage = await trustmark.encode(testImage, strength);

      expect(encodedImage).toBeDefined();
      expect(Buffer.isBuffer(encodedImage)).toBe(true);
      expect(encodedImage.length).toBeGreaterThan(0);
      // The encoded image should be different from the original
      expect(encodedImage).not.toEqual(testImage);
    });

    it("should encode a watermark into an image with custom watermark", async () => {
      const strength = 0.95;
      const customWatermark = "0101000011001";
      const encodedImage = await trustmark.encode(
        testImage,
        strength,
        customWatermark,
      );

      expect(encodedImage).toBeDefined();
      expect(Buffer.isBuffer(encodedImage)).toBe(true);
      expect(encodedImage.length).toBeGreaterThan(0);
    });

    it("should throw error with invalid strength values", async () => {
      await expect(trustmark.encode(testImage, -0.1)).rejects.toThrow(
        "Watermark configuration error: strength must be between 0.0 and 1.0",
      );
      await expect(trustmark.encode(testImage, 1.1)).rejects.toThrow(
        "Watermark configuration error: strength must be between 0.0 and 1.0",
      );
    });

    it("should throw error with empty image buffer", async () => {
      const emptyBuffer = Buffer.alloc(0);
      await expect(trustmark.encode(emptyBuffer, 0.5)).rejects.toThrow(
        "The image format could not be determined",
      );
    });
  });

  describe("decode", () => {
    it("should decode a watermark from an encoded image", async () => {
      const strength = 0.8;
      const customWatermark = "0101000011001";

      // First encode a watermark
      const rawPixelData = await trustmark.encode(
        testImage,
        strength,
        customWatermark,
      );

      // Convert raw pixel data to JPEG format for decoding
      const encodedImage = await rawRgbToJpeg(
        rawPixelData,
        testImageWidth,
        testImageHeight,
      );

      // Then decode it
      const decodedWatermark = await trustmark.decode(encodedImage);

      expect(decodedWatermark).toBeDefined();
      expect(typeof decodedWatermark).toBe("string");
      expect(decodedWatermark.length).toBeGreaterThan(0);
      // The decoded watermark should match the original
      expect(decodedWatermark.startsWith(customWatermark)).toBeTruthy();
    });

    it("should decode watermark from image with generated watermark", async () => {
      const strength = 0.75;

      // Encode with default watermark
      const rawPixelData = await trustmark.encode(testImage, strength);

      // Convert raw pixel data to JPEG format for decoding
      const encodedImage = await rawRgbToJpeg(
        rawPixelData,
        testImageWidth,
        testImageHeight,
      );

      // Decode the watermark
      const decodedWatermark = await trustmark.decode(encodedImage);

      expect(decodedWatermark).toBeDefined();
      expect(typeof decodedWatermark).toBe("string");
      expect(decodedWatermark.length).toBeGreaterThan(0);
    });

    it("should throw error decoding from original image (no watermark)", async () => {
      // Try to decode from an image that hasn't been watermarked
      await expect(trustmark.decode(testImage)).rejects.toThrow(
        "watermark is corrupt or missing",
      );
    });

    it("should throw error with empty image buffer", async () => {
      const emptyBuffer = Buffer.alloc(0);
      await expect(trustmark.decode(emptyBuffer)).rejects.toThrow(
        "The image format could not be determined",
      );
    });
  });
});
