// Copyright 2024 Adobe. All rights reserved.
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

import type { Manifest, ManifestStore } from "@contentauth/c2pa-types";

import { getNeonBinary } from "./binary.js";
import { validateSourceAssetSize } from "./assetSize.js";
import type {
  C2paSettings,
  DestinationAsset,
  ReaderInterface,
  ResourceAsset,
  SourceAsset,
  NeonReaderHandle,
} from "./types.d.ts";

/**
 * What one range read yields when the transport can describe the response.
 *
 * `offset` is the position the response reported, read from `Content-Range`. Omit
 * it when unknown.
 * `version` is a strong validator, normally the `ETag`, and pins every read of one
 * asset to a single version of it.
 */
export interface RangeResult {
  bytes: Buffer | Uint8Array;
  offset?: number;
  version?: string;
}

/**
 * One range response as it arrived, for the SDK to apply the range contract to.
 *
 * Preferred over {@link RangeResult}: the RFC 9110 rules that decide whether a
 * response is usable at the requested offset live in one shared implementation,
 * reused by every c2pa range transport. Header names are lowercase.
 * `content-encoding` matters because a range over encoded bytes does not address
 * the object, and across origins it needs `Access-Control-Expose-Headers`.
 */
export interface RawRangeResponse {
  bytes: Buffer | Uint8Array;
  status: number;
  headers?: {
    "content-range"?: string;
    etag?: string;
    "last-modified"?: string;
    "content-encoding"?: string;
  };
}

/**
 * A synchronous-from-Rust byte source: fetches `length` bytes at `offset`.
 *
 * Resolving bare bytes is still supported, and leaves the SDK without a served
 * offset or version to check against. Resolving a {@link RawRangeResponse} is the
 * shape to prefer; an object carrying `status` as well as `offset` or `version` is
 * rejected, since those place the bytes twice.
 */
export type ReadRange = (
  offset: number,
  length: number,
) => Promise<Buffer | Uint8Array | RangeResult | RawRangeResponse>;

/** Options for URL-based readers that fetch bytes over HTTP Range requests. */
export interface FromUrlOptions {
  /** Context settings for the reader. */
  settings?: C2paSettings;
  /** Total asset size in bytes. Discovered via HEAD/Content-Range when omitted. */
  size?: number;
  /** Custom range transport. Defaults to global `fetch` with a `Range` header. */
  readRange?: (url: string) => ReadRange;
  /** Invoked for each Range fetch: (offset, length, total). */
  onFetch?: (offset: number, length: number, total: number) => void;
  /**
   * Kilobytes the hasher holds at once. Bounds peak memory when verifying a large
   * asset. The native path hashes on a second thread and holds two buffers, so its
   * peak is twice this value. Defaults to the SDK's own value.
   */
  hashBufferSizeInKb?: number;
}

interface RangeSource {
  url: string;
  size: number;
  readRange: ReadRange;
}

/**
 * The object's total length from a `Content-Range`, for the size probe.
 *
 * Only `discoverSize` needs this: every other rule the range contract defines is
 * applied by the SDK, on the raw response {@link defaultReadRange} hands back.
 */
function contentRangeTotal(contentRange: string | null): number | undefined {
  if (!contentRange) return undefined;
  const match = /^\s*bytes\s+(\d+)-(\d+)\/(\d+)\s*$/i.exec(contentRange);
  if (!match) return undefined;
  const last = Number(match[2]);
  const total = Number(match[3]);
  return last < Number(match[1]) || total <= last ? undefined : total;
}

/**
 * Default range transport: one ranged GET per read via global `fetch`.
 *
 * Returns the response as it arrived. The SDK decides whether the status, encoding and
 * `Content-Range` make it usable, so the rules are not restated here.
 */
function defaultReadRange(url: string): ReadRange {
  return async (offset, length) => {
    const end = offset + length - 1;
    const res = await fetch(url, { headers: { Range: `bytes=${offset}-${end}` } });
    return {
      bytes: Buffer.from(await res.arrayBuffer()),
      status: res.status,
      headers: {
        "content-range": res.headers.get("content-range") ?? undefined,
        etag: res.headers.get("etag") ?? undefined,
        "last-modified": res.headers.get("last-modified") ?? undefined,
        "content-encoding": res.headers.get("content-encoding") ?? undefined,
      },
    };
  };
}

/** Determine an asset's total length via HEAD, falling back to a Content-Range probe. */
async function discoverSize(url: string): Promise<number> {
  const head = await fetch(url, { method: "HEAD" });
  const contentLength = head.headers.get("content-length");
  if (head.ok && contentLength) {
    return Number(contentLength);
  }
  const probe = await fetch(url, { headers: { Range: "bytes=0-0" } });
  const total = contentRangeTotal(probe.headers.get("content-range"));
  if (total !== undefined) {
    return total;
  }
  throw new Error(`cannot determine size of ${url} (no Content-Length or Content-Range)`);
}

async function resolveRangeSource(
  url: string,
  options?: FromUrlOptions,
): Promise<RangeSource> {
  const size = options?.size ?? (await discoverSize(url));
  const readRange = (options?.readRange ?? defaultReadRange)(url);
  return { url, size, readRange };
}

/**
 * Merges `hashBufferSizeInKb` into the caller's settings.
 *
 * The hasher reads the buffer size from `Settings`, so it has to travel this way to
 * reach every verifying path.
 */
function buildSettings(options?: FromUrlOptions): string | undefined {
  const settings = options?.settings;
  const base =
    settings === undefined
      ? undefined
      : typeof settings === "string"
        ? (JSON.parse(settings) as Record<string, unknown>)
        : (settings as Record<string, unknown>);

  if (options?.hashBufferSizeInKb === undefined) {
    return base === undefined ? undefined : JSON.stringify(base);
  }

  const merged = { ...(base ?? {}) } as Record<string, unknown>;
  merged.core = {
    ...((merged.core as Record<string, unknown>) ?? {}),
    hash_buffer_size_in_kb: options.hashBufferSizeInKb,
  };
  return JSON.stringify(merged);
}

async function fromRangeSources(
  format: string,
  mode: "single" | "fragment",
  sources: RangeSource[],
  options?: FromUrlOptions,
): Promise<Reader | null> {
  const settingsStr = buildSettings(options);
  const handle: NeonReaderHandle | null = await getNeonBinary().readerFromRangeSources(
    format,
    mode,
    sources.map((s) => s.url),
    sources.map((s) => s.size),
    sources.map((s) => s.readRange),
    options?.onFetch ?? null,
    settingsStr,
  );
  return handle ? new Reader(handle) : null;
}

export class Reader implements ReaderInterface {
  constructor(private reader: NeonReaderHandle) { }

  json(): ManifestStore {
    return JSON.parse(getNeonBinary().readerJson.call(this.reader));
  }

  remoteUrl(): string {
    return getNeonBinary().readerRemoteUrl.call(this.reader);
  }

  isEmbedded(): boolean {
    return getNeonBinary().readerIsEmbedded.call(this.reader);
  }

  async resourceToAsset(uri: string, asset: DestinationAsset): Promise<ResourceAsset> {
    return getNeonBinary().readerResourceToAsset.call(this.reader, uri, asset);
  }

  static async fromAsset(asset: SourceAsset, settings?: C2paSettings): Promise<Reader | null> {
    await validateSourceAssetSize(asset);
    const settingsStr = settings ? (typeof settings === 'string' ? settings : JSON.stringify(settings)) : undefined;
    const reader: NeonReaderHandle | null =
      await getNeonBinary().readerFromAsset(asset, settingsStr);
    return reader ? new Reader(reader) : null;
  }

  static async fromManifestDataAndAsset(
    manifestData: Buffer,
    asset: SourceAsset,
    settings?: C2paSettings,
  ): Promise<Reader> {
    await validateSourceAssetSize(asset);
    const settingsStr = settings ? (typeof settings === 'string' ? settings : JSON.stringify(settings)) : undefined;
    const reader: NeonReaderHandle =
      await getNeonBinary().readerFromManifestDataAndAsset(manifestData, asset, settingsStr);
    return new Reader(reader);
  }

  /**
   * Create a Reader from a URL, reading only the bytes c2pa-rs needs via HTTP Range
   * requests. The host must support Range.
   *
   * @param format Asset MIME type.
   * @param url Asset URL.
   * @param options Optional settings, a custom `readRange`/`size`, and an `onFetch` hook.
   */
  static async fromUrl(
    format: string,
    url: string,
    options?: FromUrlOptions,
  ): Promise<Reader | null> {
    const source = await resolveRangeSource(url, options);
    return fromRangeSources(format, 'single', [source], options);
  }

  /**
   * Create a Reader from a fragmented asset addressed by an initialization-segment URL
   * and an ordered list of fragment URLs, reading only the bytes needed via Range requests.
   */
  static async fromUrlFragment(
    format: string,
    initUrl: string,
    fragmentUrls: string[],
    options?: FromUrlOptions,
  ): Promise<Reader | null> {
    const sources = await Promise.all(
      [initUrl, ...fragmentUrls].map((u) => resolveRangeSource(u, options)),
    );
    return fromRangeSources(format, 'fragment', sources, options);
  }

  // Non-neon methods, copied from c2pa-js

  activeLabel(): string | undefined {
    const manifestStore = this.json();
    return manifestStore.active_manifest ?? undefined;
  }

  getActive(): Manifest | undefined {
    const manifestStore = this.json();
    const activeManifest = manifestStore.active_manifest;

    if (!activeManifest) {
      return undefined;
    }

    return manifestStore.manifests?.[activeManifest];
  }

  getHandle(): NeonReaderHandle {
    return this.reader;
  }
}
