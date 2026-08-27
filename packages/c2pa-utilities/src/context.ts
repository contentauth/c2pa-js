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
 * A `Context` configures the behavior of every `Reader`/`Builder` created with
 * any given instance of the SDK (see {@link C2paSdk}).
 * 
 * It is attached once at SDK/factory-initialization time.
 */
export class Context {
  private readonly _settings?: Settings;

  constructor(settings?: Settings) {
    this._settings = settings;
  }

  /**
   * The settings currently attached to this `Context`, if any. To derive a new `Context` with
   * different settings, construct one with `new Context(settings)` — to combine this `Context`'s
   * settings with more, merge them with {@link mergeSettings} first and pass the single result to
   * the constructor.
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
