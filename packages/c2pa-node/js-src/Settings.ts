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
import type { ContextOptions, ProgressPhase } from "@contentauth/c2pa-utilities";
import type { C2paSettings, NeonOperationHandle } from "./types.d.ts";
import { getNeonBinary } from "./binary.js";

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

/**
 * Merges a call's progress/cancellation options with its `Context`'s, per field, matching
 * `c2pa-web`'s `mergeOperationOptions`. Returns `undefined` when neither supplies either
 * field, so the no-options path is unchanged from before progress existed. A `signal` with
 * no `onProgress` still returns options, since cancellation needs no callback.
 */
export function operationOptionsForNeon(
  settingsOrContext: C2paSettings | Context | null | undefined,
  callOptions?: ContextOptions,
): { progress?: (phase: string, step: number, total: number | null) => void } | undefined {
  const context =
    settingsOrContext instanceof Context ? settingsOrContext : undefined;
  const onProgress = callOptions?.onProgress ?? context?.onProgress;
  const signal = callOptions?.signal ?? context?.signal;

  if (!onProgress && !signal) {
    return undefined;
  }
  if (!onProgress) {
    return {};
  }

  return {
    progress: (phase, step, total) => {
      try {
        onProgress({ phase: phase as ProgressPhase, step, total });
      } catch (error) {
        // `ContextOptions.onProgress` documents that a handler exception is only logged.
        // eslint-disable-next-line no-console
        console.error("c2pa: onProgress handler threw", error);
      }
    },
  };
}

/** Cancels `handle` when `signal` aborts; returns the detaching function. No-op without a signal. */
export function cancelOnAbort(
  handle: NeonOperationHandle,
  signal: AbortSignal | undefined,
): () => void {
  if (!signal) {
    return () => undefined;
  }
  const onAbort = () => getNeonBinary().operationCancel.call(handle);
  signal.addEventListener("abort", onAbort, { once: true });
  return () => signal.removeEventListener("abort", onAbort);
}

/** The signal a call/`Context` pair ends up using, a call's value winning. */
export function resolveSignal(
  settingsOrContext: C2paSettings | Context | null | undefined,
  callOptions?: ContextOptions,
): AbortSignal | undefined {
  const context =
    settingsOrContext instanceof Context ? settingsOrContext : undefined;
  return callOptions?.signal ?? context?.signal;
}
