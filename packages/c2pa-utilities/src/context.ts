/**
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import type { FetchWithRetryOptions } from './fetchWithRetry.js';
import { resolveSettings, type Settings } from './settings.js';

/**
 * A `Context` configures the behavior of a `Reader` or `Builder`.
 * 
 * It is attached once at SDK initialization or `Reader`/`Builder` construction time.
 */
export class Context {
  private readonly _settings?: Settings;

  constructor(settings?: Settings) {
    this._settings = settings;
  }

  /**
   * The settings currently attached to this `Context`, if any.
   * 
   * To derive a new `Context` with different settings, construct one with `new Context(settings)`.
   * To combine this `Context`'s settings with other settings, merge them with {@link mergeSettings}
   * first and then pass the single, merged result to the constructor to create a new `Context`.
   */
  get settings(): Settings | undefined {
    return this._settings;
  }

  /**
   * Resolves this `Context`'s settings (fetching any embedded trust-anchor URLs) and serializes
   * the result for consumption by the native/wasm boundary.
   *
   * @param options Optional configurations for fetch-with-retry, used when resolving trust-anchor
   * URLs.
   * @returns A JSON-serialized string of the resolved settings.
   */
  async toJson(options?: FetchWithRetryOptions): Promise<string> {
    return resolveSettings(this.settings, options);
  }
}
