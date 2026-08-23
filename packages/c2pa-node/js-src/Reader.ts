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

/** A synchronous-from-Rust byte source: fetches `length` bytes at `offset`. */
export type ReadRange = (
  offset: number,
  length: number,
) => Promise<Buffer | Uint8Array>;

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
}

interface RangeSource {
  url: string;
  size: number;
  readRange: ReadRange;
}

/** Default range transport: one ranged GET per read via global `fetch`. */
function defaultReadRange(url: string): ReadRange {
  return async (offset, length) => {
    const end = offset + length - 1;
    const res = await fetch(url, { headers: { Range: `bytes=${offset}-${end}` } });
    if (res.status !== 206) {
      throw new Error(
        `expected 206 Partial Content from ${url}, got ${res.status} (host must honor Range)`,
      );
    }
    return Buffer.from(await res.arrayBuffer());
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
  const contentRange = probe.headers.get("content-range");
  const total = contentRange?.split("/").pop();
  if (total && total !== "*") {
    return Number(total);
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

async function fromRangeSources(
  format: string,
  mode: "single" | "fragment",
  sources: RangeSource[],
  options?: FromUrlOptions,
): Promise<Reader | null> {
  const settings = options?.settings;
  const settingsStr = settings
    ? typeof settings === "string"
      ? settings
      : JSON.stringify(settings)
    : undefined;
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
   * requests instead of downloading the whole asset. The host must support Range.
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
