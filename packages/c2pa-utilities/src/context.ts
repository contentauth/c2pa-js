/**
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import type { TrustFetchOptions } from './fetchWithRetry.js';
import { resolveSettingsWithExpiry, type Settings } from './settings.js';

/**
 * SDK-side configuration for a {@link Context}.
 *
 * Unlike {@link Settings}, which configure the underlying library, this configures the
 * JavaScript SDK itself. Only the settings are serialized and sent across the
 * WASM/native boundary whereas the SDK config never leaves the SDK.
 */
export interface SdkConfig {
  /**
   * Maximum size, in bytes, of an asset that a `Reader` accepts. Must be a positive number.
   *
   * Each SDK applies its own limit when unset since what is acceptable depends on the
   * platform.
   */
  maxSizeInBytes?: number;
}

/**
 * SDK behavior options for a {@link Context}. These options stay in JavaScript and are not
 * serialized into settings passed to the native/WASM SDK.
 */
export interface ContextOptions {
  /**
   * Controls fetching, retrying, and caching of trust-resource URLs.
   */
  trustFetch?: TrustFetchOptions;
}

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
  private readonly _sdkConfig?: SdkConfig;
  private readonly _options?: ContextOptions;
  private _jsonPromise?: Promise<string>;
  private _jsonExpiresAt?: number;

  /**
   * @param settings Core SDK settings.
   * @param sdkConfig JavaScript SDK configuration.
   * @param options JavaScript SDK behavior options, including trust-resource fetching controls.
   */
  constructor(
    settings?: Settings,
    sdkConfig?: SdkConfig,
    options?: ContextOptions
  ) {
    this._settings = settings;
    this._sdkConfig = sdkConfig;
    this._options = options;
  }

  /**
   * The SDK config currently attached to this `Context`, if any.
   *
   * To derive a new `Context` with a different SDK config, construct one with
   * `new Context(settings, sdkConfig)`.
   */
  get sdkConfig(): SdkConfig | undefined {
    return this._sdkConfig;
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
   * the result for consumption by the WASM/native boundary. A successful result is memoized
   * until the earliest resolved trust resource expires when a positive cache TTL is configured.
   * Refresh failures reject without reusing expired settings. If different fetch-with-retry
   * options need to be provided after resolution succeeds, callers should create a separate
   * `Context` with the desired options.
   *
   * A failed resolution is not memoized: the next call to `toJson()` tries again from scratch,
   * so a transient failure (e.g. a network error while fetching a trust-anchor URL) doesn't
   * permanently break this `Context`.
   *
   * @param options Optional configurations for trust-resource fetching. These override the
   * corresponding options attached to this Context. Explicit `undefined` resets an option to
   * its SDK default; omitted properties retain the Context's option. This does not clear core
   * settings or a memoized successful result. Only consulted on the first call, or the first
   * call after a previous failure or trust-resource expiry.
   * @returns A JSON-serialized string of the resolved settings.
   */
  toJson(options?: TrustFetchOptions): Promise<string> {
    const trustFetchOptions = {
      ...this._options?.trustFetch,
      ...options
    };
    if (
      this._jsonPromise &&
      (this._jsonExpiresAt === undefined || Date.now() < this._jsonExpiresAt)
    ) {
      return this._jsonPromise;
    }

    this._jsonExpiresAt = undefined;
    this._jsonPromise = resolveSettingsWithExpiry(this.settings, trustFetchOptions)
      .then(({ json, expiresAt }) => {
        this._jsonExpiresAt = expiresAt;
        return json;
      })
      .catch((error: unknown) => {
        this._jsonPromise = undefined;
        this._jsonExpiresAt = undefined;
        throw error;
      });
    return this._jsonPromise;
  }
}
