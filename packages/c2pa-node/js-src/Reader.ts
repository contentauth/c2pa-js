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

import { getLib, decodeAndFree, callAsync } from "./native/lib.js";
import { checkPtr, checkIntAsync, ManifestNotFoundError } from "./native/error.js";
import { Context } from "./native/context.js";
import { C2paStream, mimeTypeOf } from "./native/stream.js";
import type {
  C2paSettings,
  DestinationAsset,
  ReaderInterface,
  ResourceAsset,
  SourceAsset,
} from "./types.d.ts";

export class Reader implements ReaderInterface {
  // Keeps the owning Context alive for the lifetime of this Reader.
  private _ctx?: Context;

  constructor(private reader: unknown) {}

  json(): ManifestStore {
    const ptr = checkPtr(getLib().c2pa_reader_json(this.reader), "Failed to get manifest JSON");
    return JSON.parse(decodeAndFree(ptr));
  }

  remoteUrl(): string {
    return (getLib().c2pa_reader_remote_url(this.reader) as string | null) ?? "";
  }

  isEmbedded(): boolean {
    return getLib().c2pa_reader_is_embedded(this.reader) as boolean;
  }

  async resourceToAsset(
    uri: string,
    asset: DestinationAsset,
  ): Promise<ResourceAsset> {
    const stream = C2paStream.forDestination(asset);
    try {
      const bytesWritten = checkIntAsync(
        await callAsync<number | bigint>(
          getLib().c2pa_reader_resource_to_stream,
          this.reader,
          uri,
          stream.ptr,
        ),
        `Failed to get resource: ${uri}`,
      );
      return C2paStream.finalizeDestination(asset, stream, bytesWritten);
    } finally {
      stream.dispose();
    }
  }

  /**
   * Note: reads synchronously under the hood (unlike the Neon binding,
   * which read off-thread). Returns a Promise for API compatibility, and to
   * preserve ManifestNotFoundError detection — c2pa's last-error state is
   * thread-local and can't be read reliably across koffi's async boundary.
   */
  static async fromAsset(
    asset: SourceAsset,
    settings?: C2paSettings,
  ): Promise<Reader | null> {
    const ctx = Context.create(settings);
    try {
      const readerPtr = checkPtr(
        getLib().c2pa_reader_from_context(ctx.ptr),
        "Failed to create C2paReader",
      );
      const stream = C2paStream.fromSource(asset);
      try {
        const newPtr = checkPtr(
          getLib().c2pa_reader_with_stream(readerPtr, mimeTypeOf(asset) ?? "", stream.ptr),
          "Failed to read asset",
        );
        const reader = new Reader(newPtr);
        reader._ctx = ctx;
        return reader;
      } finally {
        stream.dispose();
      }
    } catch (e) {
      ctx.dispose();
      if (e instanceof ManifestNotFoundError) return null;
      throw e;
    }
  }

  static async fromManifestDataAndAsset(
    manifestData: Buffer,
    asset: SourceAsset,
    settings?: C2paSettings,
  ): Promise<Reader> {
    const ctx = Context.create(settings);
    const readerPtr = checkPtr(
      getLib().c2pa_reader_from_context(ctx.ptr),
      "Failed to create C2paReader",
    );
    const stream = C2paStream.fromSource(asset);
    try {
      const newPtr = checkPtr(
        getLib().c2pa_reader_with_manifest_data_and_stream(
          readerPtr,
          mimeTypeOf(asset) ?? "",
          stream.ptr,
          manifestData,
          manifestData.length,
        ),
        "Failed to read asset with manifest data",
      );
      const reader = new Reader(newPtr);
      reader._ctx = ctx;
      return reader;
    } catch (e) {
      ctx.dispose();
      throw e;
    } finally {
      stream.dispose();
    }
  }

  // Non-native methods, copied from c2pa-js

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

  getHandle(): unknown {
    return this.reader;
  }
}
