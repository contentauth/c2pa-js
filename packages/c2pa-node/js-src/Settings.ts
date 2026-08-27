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

import * as fs from "fs-extra";
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
 * Resolves a `Reader`/`Builder` settings argument (either the deprecated raw `C2paSettings`
 * or a `Context`) into the JSON string the native library expects.
 *
 * Unlike `c2pa-web`'s `Context.toJson()`, this does not resolve trust-anchor URLs: `c2pa-node`
 * doesn't perform trust-anchor URL fetching yet, so a `Context`'s settings are only merged with
 * this package's defaults and serialized here.
 *
 * ## Proposal: JS-side trust-anchor resolution for `c2pa-node`
 *
 * `c2pa-web` already fetches `trust`/`cawgTrust` URL fields via `resolveTrustSettings`
 * (`@contentauth/c2pa-utilities`), validating PEM content and capping the response size before
 * handing the resolved settings to the wasm boundary. `c2pa-node` has no equivalent: a
 * `trustAnchors: 'https://...'` value passed today — through either the deprecated raw-settings
 * path or a `Context` — is forwarded to the native layer completely unvalidated, with whatever
 * behavior (or lack of it) exists on the Rust side for that field.
 *
 * Closing that gap for the `Context` path needs no new mechanism: `resolveTrustSettings` and its
 * validation/size-cap logic already live in `c2pa-utilities`, shared and tested by `c2pa-web`.
 * The change here would be mechanical — swap the synchronous
 * `settingsToJson(withDefaultSettings(...))` below for `await context.toJson(options)` (the same
 * call `c2pa-web` already makes) — and this function's caller ({@link Builder.newAsync} /
 * {@link Builder.withJsonAsync}) is already `async` and ready to `await` it without a further
 * signature change (see the rationale on {@link Builder.newAsync}).
 *
 * It isn't wired up yet because it's a real, user-visible behavior change, not a refactor: it
 * introduces new `PEM`-validation and response-size-cap failures for `Context` inputs that don't
 * raise them today. Per the drift-prevention proposal's own "Behavior changes requiring sign-off"
 * process (see `docs/proposals/shared-utilities-and-drift-prevention.md`), a change with that
 * shape needs explicit sign-off before landing, rather than being folded silently into unrelated
 * `Context`-plumbing work. This function is the intended landing spot once that happens.
 */
export function resolveSettingsForNeon(
  settingsOrContext: C2paSettings | Context | undefined,
): string | undefined {
  if (settingsOrContext === undefined) {
    return undefined;
  }

  if (settingsOrContext instanceof Context) {
    return settingsToJson(withDefaultSettings(settingsOrContext.settings));
  }

  return typeof settingsOrContext === "string"
    ? settingsOrContext
    : JSON.stringify(settingsOrContext);
}
