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
 * A `Context` configures the behavior of a single `Reader`/`Builder`. Bindings attach it at
 * creation time (e.g. `Reader.fromBlob(c2pa, format, blob, context)`), independent of whatever
 * runtime/worker handle that creation call also needs — so one running SDK instance can freely
 * create many `Reader`/`Builder`s, each with its own `Context`.
 */
export class Context {
  private readonly _settings?: Settings;
  private _jsonPromise?: Promise<string>;

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
   * Memoized: since a `Context`'s settings never change after construction, the result (and any
   * trust-anchor fetch it took to produce it) is only ever computed once, on the first call, and
   * reused for every call after — including calls with different `options` than the first one
   * used. Callers that need the same `Context` resolved under two different `options` should
   * construct two separate `Context`s instead.
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
