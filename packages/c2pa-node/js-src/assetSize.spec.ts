// Copyright 2026 Adobe. All rights reserved.
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

import fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import { AssetTooLargeError } from "@contentauth/c2pa-utilities";

import { MAX_SIZE_IN_BYTES, validateSourceAssetSize } from "./assetSize.js";

describe("validateSourceAssetSize", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "c2pa-asset-size-test-"));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  async function createFile(sizeInBytes: number): Promise<string> {
    const filePath = path.join(tempDir, "asset.bin");
    await fs.ensureFile(filePath);
    await fs.truncate(filePath, sizeInBytes);
    return filePath;
  }

  it("accepts a buffer within the default limit", async () => {
    await expect(
      validateSourceAssetSize({ buffer: Buffer.alloc(10), mimeType: "image/jpeg" }),
    ).resolves.toBeUndefined();
  });

  it("accepts a file within the default limit", async () => {
    const filePath = await createFile(10);

    await expect(
      validateSourceAssetSize({ path: filePath }),
    ).resolves.toBeUndefined();
  });

  it("rejects a file over the default limit", async () => {
    const filePath = await createFile(MAX_SIZE_IN_BYTES + 1);

    await expect(validateSourceAssetSize({ path: filePath })).rejects.toThrow(
      AssetTooLargeError,
    );
  });

  it("accepts a file over the default limit when a higher maxSizeInBytes is given", async () => {
    const filePath = await createFile(MAX_SIZE_IN_BYTES + 1);

    await expect(
      validateSourceAssetSize(
        { path: filePath },
        { maxSizeInBytes: MAX_SIZE_IN_BYTES + 2 },
      ),
    ).resolves.toBeUndefined();
  });

  it("rejects a buffer over a lower maxSizeInBytes", async () => {
    await expect(
      validateSourceAssetSize(
        { buffer: Buffer.alloc(10), mimeType: "image/jpeg" },
        { maxSizeInBytes: 9 },
      ),
    ).rejects.toThrow(AssetTooLargeError);
  });

  it("accepts a buffer exactly at maxSizeInBytes", async () => {
    await expect(
      validateSourceAssetSize(
        { buffer: Buffer.alloc(10), mimeType: "image/jpeg" },
        { maxSizeInBytes: 10 },
      ),
    ).resolves.toBeUndefined();
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "throws a RangeError for an invalid maxSizeInBytes of %s",
    async (maxSizeInBytes) => {
      await expect(
        validateSourceAssetSize(
          { buffer: Buffer.alloc(10), mimeType: "image/jpeg" },
          { maxSizeInBytes },
        ),
      ).rejects.toThrow(RangeError);
    },
  );
});
