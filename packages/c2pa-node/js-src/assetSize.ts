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
import { validateAssetSize } from "@contentauth/c2pa-utilities";
import type { SourceAsset } from "./types.d.ts";

// c2pa-node runs server-side, so it can reasonably support larger assets than c2pa-web,
// and may be less resource-constrained in comparison.
export const MAX_SIZE_IN_BYTES = 10 * 10 ** 9; // 10 GB

/**
 * Validates a {@link SourceAsset}'s size before it's handed to the native reader.
 *
 * For a `FileAsset`, this rejects an oversized file before it's read into memory.
 * For a `SourceBufferAsset`, the buffer is already fully allocated by the time this runs,
 * so the memory cost isn't prevented, only reader construction is. Prefer `path`
 * for large or untrusted assets.
 * 
 * @throws Error if reading the `FileAsset` fails.
 * @throws {AssetTooLargeError} If `sizeInBytes` exceeds the resolved limit.
 */
export async function validateSourceAssetSize(
  asset: SourceAsset,
): Promise<void> {
  if ("buffer" in asset) {
    validateAssetSize(asset.buffer.length, MAX_SIZE_IN_BYTES);
    return;
  }

  const { size } = await fs.stat(asset.path);
  validateAssetSize(size, MAX_SIZE_IN_BYTES);
}
