/**
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import type { FetchWithRetryOptions } from './fetchWithRetry.js';
import type { ContextOptions, ProgressEvent } from './progress.js';
import { resolveSettings, type Settings } from './settings.js';

/**
 * A `Context` configures the behavior of a `Reader`/`Builder`. 
 * 
 * It is provided at creation time (e.g. `Reader.fromBlob(c2pa, format, blob, context)`),
 * configuring that instance's behavior independently of other instances.
 * 
 * A `Context` is snapshotted when used to create a `Reader`/`Builder`. Changes to
 * the context do not propagate afterwards, and therefore can be used to create
 * multiple `Reader`/`Builder` instances.
 */
export class Context {
  private readonly _settings?: Settings;
  private readonly _onProgress?: (event: ProgressEvent) => void;
  private readonly _signal?: AbortSignal;
  private _jsonPromise?: Promise<string>;

  constructor(settings?: Settings, options?: ContextOptions) {
    this._settings = settings;
    this._onProgress = options?.onProgress;
    this._signal = options?.signal;
  }

  /**
   * The `AbortSignal` that cancels operations created from this `Context`, if any.
   *
   * See {@link ContextOptions.signal} for what cancellation does and does not
   * guarantee. Like {@link Context.settings}, it is read when a `Reader`/`Builder` is
   * created; one signal can cancel every operation the `Context` configures.
   */
  get signal(): AbortSignal | undefined {
    return this._signal;
  }

  /**
   * The progress callback attached to this `Context`, if any.
   *
   * Only consulted by entry points that support progress reporting; elsewhere it is
   * ignored. Like {@link Context.settings}, it is snapshotted when a `Reader`/`Builder`
   * is created, so one `Context` can drive several operations and each reports
   * independently.
   */
  get onProgress(): ((event: ProgressEvent) => void) | undefined {
    return this._onProgress;
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
   * the result for consumption by the WASM/native boundary. A successful result is memoized, so
   * resolution of this Context's settings only happens once. If different fetch-with-retry
   * options need to be provided, callers should create a separate `Context` and then call
   * `toJson()` with the desired options.
   *
   * A failed resolution is not memoized: the next call to `toJson()` tries again from scratch,
   * so a transient failure (e.g. a network error while fetching a trust-anchor URL) doesn't
   * permanently break this `Context`.
   *
   * @param options Optional configurations for fetch-with-retry, used when resolving trust-anchor
   * URLs. Only consulted on the first call, or the first call after a previous failure.
   * @returns A JSON-serialized string of the resolved settings.
   */
  toJson(options?: FetchWithRetryOptions): Promise<string> {
    this._jsonPromise ??= resolveSettings(this.settings, options).catch(
      (error: unknown) => {
        this._jsonPromise = undefined;
        throw error;
      }
    );
    return this._jsonPromise;
  }
}
