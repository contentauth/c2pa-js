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
import { Context } from "@contentauth/c2pa-utilities";

import { getNeonBinary } from "./binary.js";
import { validateSourceAssetSize } from "./assetSize.js";
import type {
  DestinationAsset,
  ReaderInterface,
  ResourceAsset,
  SourceAsset,
  NeonReaderHandle,
} from "./types.d.ts";

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

  /**
   * @param context A `Context` configuring this Reader. Defaults to an empty `Context`.
   */
  static async fromAsset(
    asset: SourceAsset,
    context: Context = new Context(),
  ): Promise<Reader | null> {
    await validateSourceAssetSize(asset, context.sdkConfig);
    const settingsStr = await context.toJson();
    const reader: NeonReaderHandle | null =
      await getNeonBinary().readerFromAsset(asset, settingsStr);
    return reader ? new Reader(reader) : null;
  }

  /**
   * @param context A `Context` configuring this Reader. Defaults to an empty `Context`.
   */
  static async fromManifestDataAndAsset(
    manifestData: Buffer,
    asset: SourceAsset,
    context: Context = new Context(),
  ): Promise<Reader> {
    await validateSourceAssetSize(asset, context.sdkConfig);
    const settingsStr = await context.toJson();
    const reader: NeonReaderHandle =
      await getNeonBinary().readerFromManifestDataAndAsset(manifestData, asset, settingsStr);
    return new Reader(reader);
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
