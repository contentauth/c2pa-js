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
 * A `Context` configures the behavior of a single `Reader`/`Builder`. 
 * 
 * It is provided at creation time (e.g. `Reader.fromBlob(c2pa, format, blob, context)`),
 * configuring that instance's behavior independently of other instances.
 */
export class Context {
  private readonly _settings?: Settings;
  private _jsonPromise?: Promise<string>;

  constructor(settings?: Settings) {
    this._settings = settings;
  }

  /**
   * The settings currently attached to this `Context`, if any.
   * 
   * To derive a new `Context` with different settings, construct one with `new Context(settings)`.
   * To combine this `Context`'s settings with more settings, merge them with {@link mergeSettings}
   * first and pass the single, merged result to the constructor.
   */
  get settings(): Settings | undefined {
    return this._settings;
  }

  /**
   * Resolves this `Context`'s settings (fetching any embedded trust-anchor URLs) and serializes
   * the result for consumption by the WASM/native boundary. The result is memoized, so resolution
   * of this Context's settings should only ever happen once. If different fetch-with-retry options
   * need to be provided, callers should create a separate `Context` and then call `toJson()`
   * with the desired options.
   *
   * @param options Optional configurations for fetch-with-retry, used when resolving trust-anchor
   * URLs. Only consulted on the first call.
   * @returns A JSON-serialized string of the resolved settings.
   */
  toJson(options?: FetchWithRetryOptions): Promise<string> {
    this._jsonPromise ??= resolveSettings(this.settings, options);
    return this._jsonPromise;
  }
}
