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

import { getLib } from "./lib.js";
import { checkInt, checkPtr } from "./error.js";
import type { C2paSettings } from "../types.d.ts";

/**
 * A native C2paContext*, required to construct a Reader or Builder.
 * This package's public API takes settings per-call (as a JSON/TOML string
 * or object) rather than exposing the context concept directly, so this
 * class is internal.
 */
export class Context {
  /** @internal */ readonly ptr: unknown;
  private _disposed = false;

  private constructor(ptr: unknown) {
    this.ptr = ptr;
  }

  static create(settings?: C2paSettings): Context {
    if (settings === undefined) {
      return new Context(checkPtr(getLib().c2pa_context_new(), "Failed to create C2paContext"));
    }

    const settingsStr =
      typeof settings === "string" ? settings : JSON.stringify(settings);
    const format = settingsStr.trim().startsWith("{") ? "json" : "toml";

    const settingsPtr = checkPtr(
      getLib().c2pa_settings_new(),
      "Failed to create C2paSettings",
    );
    checkInt(
      getLib().c2pa_settings_update_from_string(settingsPtr, settingsStr, format),
      "Failed to apply settings",
    );

    const builderPtr = checkPtr(
      getLib().c2pa_context_builder_new(),
      "Failed to create C2paContextBuilder",
    );
    checkInt(
      getLib().c2pa_context_builder_set_settings(builderPtr, settingsPtr),
      "Failed to attach settings to context",
    );
    const ctxPtr = checkPtr(
      getLib().c2pa_context_builder_build(builderPtr),
      "Failed to build C2paContext",
    );
    return new Context(ctxPtr);
  }

  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    getLib().c2pa_free(this.ptr);
  }
}
