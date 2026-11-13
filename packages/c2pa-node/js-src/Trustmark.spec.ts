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

import path from "path";
import os from "os";
import fs from "fs-extra";
import sharp from "sharp";

import { Trustmark } from "./Trustmark.js";
import type { TrustmarkConfig, TrustmarkVariant } from "./types.d.ts";

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

  // Use a high-quality JPEG round-trip for the perceptual P model.
  return await image.jpeg({ quality: 95 }).toBuffer();
}

describe("Trustmark", () => {
  let trustmark: Trustmark;
  let testImage: Buffer;
  let testImageWidth: number;
  let testImageHeight: number;

  const trustmarkConfig: TrustmarkConfig = {
    variant: "P", // Perceptual model, cached in CI
    version: "BCH_5", // Tolerates 5 bit flips
    modelPath: path.join(tempDir, "trustmark_models"), // Use temporary directory for model path
  };

  beforeAll(async () => {
    await fs.ensureDir(tempDir);
    // Use an actual test image from fixtures directory
    testImage = await sharp("./tests/fixtures/A.jpg")
      .resize(512, 512)
      .png()
      .toBuffer();

    // Get image dimensions for converting raw pixel data
    const imageInfo = await sharp(testImage).metadata();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    testImageWidth = imageInfo.width!;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    testImageHeight = imageInfo.height!;

    trustmark = await Trustmark.newTrustmark(trustmarkConfig);
  }, 30000);

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
        version: "BCH_3", // Valid version
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
    }, 30000);

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
    }, 30000);

    it("should throw error with invalid strength values", async () => {
      await expect(trustmark.encode(testImage, -0.1)).rejects.toThrow(
        "Watermark configuration error: strength must be between 0.0 and 1.0",
      );
      await expect(trustmark.encode(testImage, 1.1)).rejects.toThrow(
        "Watermark configuration error: strength must be between 0.0 and 1.0",
      );
    }, 30000);

    it("should throw error with empty image buffer", async () => {
      const emptyBuffer = Buffer.alloc(0);
      await expect(trustmark.encode(emptyBuffer, 0.5)).rejects.toThrow(
        "The image format could not be determined",
      );
    }, 30000);
  });

  describe("decode", () => {
    it("should decode a watermark from an encoded image", async () => {
      const strength = 0.95;
      const customWatermark =
        "1011011110011000111111000000011111011111011100000110110110111";

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
      expect(decodedWatermark).toBe(customWatermark);
    }, 30000);

    it("should decode watermark from image with generated watermark", async () => {
      const strength = 0.95;

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
    }, 30000);

    it("should throw error decoding from original image (no watermark)", async () => {
      // Try to decode from an image that hasn't been watermarked
      await expect(trustmark.decode(testImage)).rejects.toThrow(
        "watermark is corrupt or missing",
      );
    }, 30000);

    it("should throw error with empty image buffer", async () => {
      const emptyBuffer = Buffer.alloc(0);
      await expect(trustmark.decode(emptyBuffer)).rejects.toThrow(
        "The image format could not be determined",
      );
    }, 30000);
  });

  it("rejects removal when not opted in", async () => {
    await expect(trustmark.remove(testImage)).rejects.toThrow(
      "Watermark remover not loaded",
    );
  });
});

describe("Trustmark removal configuration", () => {
  it.each(["B", "C"] as const)(
    "rejects unsupported variant %s before creating the model directory",
    async (variant) => {
      const root = await fs.mkdtemp(
        path.join(os.tmpdir(), "trustmark-config-"),
      );
      const modelPath = path.join(root, "models");
      try {
        await expect(
          Trustmark.newTrustmark({
            variant,
            version: "BCH_5",
            loadRemover: true,
            modelPath,
          }),
        ).rejects.toThrow("removal supports only P/Q variants");
        expect(await fs.pathExists(modelPath)).toBe(false);
      } finally {
        await fs.remove(root);
      }
    },
  );
});

describe("Trustmark P removal", () => {
  const variant = "P";
  let runner: Trustmark;
  let source: Buffer;
  const modelPath = path.join(tempDir, "trustmark_models");
  const original =
    "1011011110011000111111000000011111011111011100000110110110111";
  const replacement =
    "0011011110011000111111000000011111011111011100000110110110111";

  beforeAll(async () => {
    runner = await Trustmark.newTrustmark({
      variant,
      version: "BCH_5",
      loadRemover: true,
      modelPath,
    });
    source = await sharp("./tests/fixtures/A.jpg")
      .resize(512, 512)
      .png()
      .toBuffer();
  }, 180000);

  it.each(["jpeg", "png"] as const)(
    "removes the old watermark and allows re-watermarking a %s",
    async (format) => {
      const raw = await runner.encode(source, 0.95, original);
      const encoded = await sharp(raw, {
        raw: { width: 512, height: 512, channels: 3 },
      })
        .toFormat(format, { quality: 95 })
        .toBuffer();
      expect(await runner.decode(encoded)).toBe(original);

      const recovered = await runner.remove(encoded);
      expect(await sharp(recovered).metadata()).toMatchObject({
        format: "png",
        width: 512,
        height: 512,
        channels: 3,
        hasAlpha: false,
      });
      const decoded = await runner.decode(recovered).catch((error: unknown) => {
        expect(error).toBeInstanceOf(Error);
        if (!(error instanceof Error)) throw error;
        expect(error.message).toContain("watermark is corrupt or missing");
      });
      expect(decoded).not.toBe(original);

      const reencoded = await runner.encode(recovered, 0.95, replacement);
      const png = await sharp(reencoded, {
        raw: { width: 512, height: 512, channels: 3 },
      })
        .png()
        .toBuffer();
      expect(await runner.decode(png)).toBe(replacement);
    },
    60000,
  );

  it("preserves dimensions and exact alpha on unwatermarked images concurrently", async () => {
    await Promise.all(
      [
        [17, 11],
        [11, 17],
      ].map(async ([width, height]) => {
        const rgba = Buffer.alloc(width * height * 4);
        for (let i = 0; i < rgba.length; i += 4) {
          rgba.set([120, 80, 160, (i / 4) % 256], i);
        }
        const input = await sharp(rgba, {
          raw: { width, height, channels: 4 },
        })
          .png()
          .toBuffer();
        const output = await runner.remove(input);
        const { data, info } = await sharp(output)
          .raw()
          .toBuffer({ resolveWithObject: true });
        expect(info).toMatchObject({ width, height, channels: 4 });
        for (let i = 3; i < rgba.length; i += 4) {
          expect(data[i]).toBe(rgba[i]);
        }
      }),
    );
  }, 30000);

  it("rejects invalid and unsupported input then remains usable", async () => {
    const gif = await sharp(source).gif().toBuffer();
    for (const invalid of [
      Buffer.alloc(0),
      Buffer.from("not an image"),
      source.subarray(0, 40),
      gif,
    ]) {
      await expect(runner.remove(invalid)).rejects.toThrow();
    }
    expect(await sharp(await runner.remove(source)).metadata()).toMatchObject({
      width: 512,
      height: 512,
    });
  }, 30000);

  it("rejects 16-bit PNG input", async () => {
    const input = await sharp(source).toColourspace("rgb16").png().toBuffer();
    expect(await sharp(input).metadata()).toMatchObject({ bitsPerSample: 16 });
    await expect(runner.remove(input)).rejects.toThrow(
      "removal supports only 8-bit JPEG/PNG images",
    );
  });

  it("does not download or load a remover by default or with loadRemover false", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "trustmark-opt-in-"));
    try {
      for (const name of ["encoder", "decoder"]) {
        const filename = `${name}_${variant}.onnx`;
        await fs.copyFile(
          path.join(modelPath, filename),
          path.join(root, filename),
        );
      }
      for (const loadRemover of [undefined, false]) {
        const disabled = await Trustmark.newTrustmark({
          variant,
          version: "BCH_5",
          modelPath: root,
          loadRemover,
        });
        await expect(disabled.remove(source)).rejects.toThrow(
          "Watermark remover not loaded",
        );
      }
      expect(
        await fs.pathExists(path.join(root, `remover_${variant}.onnx`)),
      ).toBe(false);
    } finally {
      await fs.remove(root);
    }
  }, 30000);

  it("rejects initialization with an invalid remover instead of falling back", async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "trustmark-invalid-model-"),
    );
    try {
      for (const name of ["encoder", "decoder"]) {
        const filename = `${name}_${variant}.onnx`;
        await fs.copyFile(
          path.join(modelPath, filename),
          path.join(root, filename),
        );
      }
      await fs.writeFile(
        path.join(root, `remover_${variant}.onnx`),
        "invalid ONNX",
      );
      await expect(
        Trustmark.newTrustmark({
          variant,
          version: "BCH_5",
          modelPath: root,
          loadRemover: true,
        }),
      ).rejects.toThrow(
        `unable to load remover model ${path.join(
          root,
          `remover_${variant}.onnx`,
        )}`,
      );
    } finally {
      await fs.remove(root);
    }
  }, 30000);

  it("rejects non-finite inference output instead of returning an image", async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "trustmark-inference-"),
    );
    try {
      for (const name of ["encoder", "decoder"]) {
        const filename = `${name}_${variant}.onnx`;
        await fs.copyFile(
          path.join(modelPath, filename),
          path.join(root, filename),
        );
      }
      // ONNX opset 13 ConstantOfShape graph: declares float32 [1, 3, 256, 256]
      // input/output, but returns NaN pixels. Loading succeeds; inference fails
      // TrustMark's output validation, exercising the native promise error path.
      const model = Buffer.from(
        "CAg6wwEKOAoFc2hhcGUSBm91dHB1dCIPQ29uc3RhbnRPZlNoYXBlKhYKBXZhbHVlKgoIARABSgQAAMB/oAEEEhFub25maW5pdGVfcmVtb3ZlciotCAQQB0IFc2hhcGVKIAEAAAAAAAAAAwAAAAAAAAAAAQAAAAAAAAABAAAAAAAAWiEKBWlucHV0EhgKFggBEhIKAggBCgIIAwoDCIACCgMIgAJiIgoGb3V0cHV0EhgKFggBEhIKAggBCgIIAwoDCIACCgMIgAJCAhAN",
        "base64",
      );
      await fs.writeFile(path.join(root, `remover_${variant}.onnx`), model);
      const invalid = await Trustmark.newTrustmark({
        variant,
        version: "BCH_5",
        modelPath: root,
        loadRemover: true,
      });
      // Repeated failures must reject without poisoning the shared remover.
      for (let attempt = 0; attempt < 2; attempt++) {
        await expect(invalid.remove(source)).rejects.toThrow(
          "invalid remover model",
        );
      }
    } finally {
      await fs.remove(root);
    }
  }, 30000);
});
