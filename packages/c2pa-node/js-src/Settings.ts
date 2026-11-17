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

import fs from "fs-extra";
import type { Context } from "@contentauth/c2pa-utilities";
import type { NeonContextHandle } from "./types.d.ts";
import { getNeonBinary } from "./binary.js";

const nativeContexts = new WeakMap<
  Context,
  { settingsJson: string; handle: NeonContextHandle }
>();

/**
 * This file contains only Settings functions that are unique to the Node SDK.
 * 
 * Shared Settings-related functions and types can be found in `c2pa-utilities`,
 * and are re-exported by `c2pa-node` (see `index.ts`) for convenience.
 */

/**
 * Load settings from a TOML or JSON file.
 * @param filePath The path to the settings file
 * @returns Settings as a string (TOML or JSON depending on file extension)
 */
export async function loadSettingsFromFile(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath, "utf8");
  return content;
}

/**
 * Resolves a Context to its latest native handle. The settings JSON is transferred and parsed
 * only when a Context produces a new effective JSON value.
 */
export async function resolveNativeContextForNeon(
  context: Context,
  errorPrefix: string,
): Promise<NeonContextHandle> {
  const settingsJson = await context.toJson();
  const cachedContext = nativeContexts.get(context);
  if (cachedContext?.settingsJson === settingsJson) {
    return cachedContext.handle;
  }

  const nativeContext = getNeonBinary().contextFromSettings(
    settingsJson,
    errorPrefix,
  );
  nativeContexts.set(context, {
    settingsJson,
    handle: nativeContext,
  });
  return nativeContext;
}
