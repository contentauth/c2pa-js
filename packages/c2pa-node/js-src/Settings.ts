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
import { Context, settingsToJson, withDefaultSettings } from "@contentauth/c2pa-utilities";
import type { C2paSettings } from "./types.d.ts";

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
 * Resolves a settings argument (either the deprecated raw `C2paSettings or a `Context`) into
 * a JSON string that can be passed into the native library.
 *
 * Unlike `c2pa-web`'s `Context.toJson()`, this does not resolve trust-anchor URLs: `c2pa-node`
 * doesn't perform trust-anchor URL fetching yet, so a `Context`'s settings are only merged with
 * this package's defaults and serialized here.
 */
export function resolveSettingsForNeon(
  settingsOrContext: C2paSettings | Context | null | undefined,
): string | undefined {
  if (settingsOrContext == null) {
    return undefined;
  }

  if (settingsOrContext instanceof Context) {
    return settingsToJson(withDefaultSettings(settingsOrContext.settings));
  }

  return typeof settingsOrContext === "string"
    ? settingsOrContext
    : JSON.stringify(settingsOrContext);
}
