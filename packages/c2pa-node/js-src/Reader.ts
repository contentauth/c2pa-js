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

const neon = require("./index.node");
import type {
  DestinationAsset,
  ReaderInterface,
  SourceAsset,
  NeonReaderHandle,
} from "./types.d.ts";

export class Reader implements ReaderInterface {
  constructor(private reader: NeonReaderHandle) {}

  json(): ManifestStore {
    return JSON.parse(neon.readerJson.call(this.reader));
  }

  remoteUrl(): string {
    return neon.readerRemoteUrl.call(this.reader);
  }

  isEmbedded(): boolean {
    return neon.readerIsEmbedded.call(this.reader);
  }

  async resourceToAsset(uri: string, asset: DestinationAsset): Promise<number> {
    return neon.readerResourceToAsset.call(this.reader, uri, asset);
  }

  static async fromAsset(asset: SourceAsset): Promise<Reader> {
    const reader: NeonReaderHandle = await neon.readerFromAsset(asset);
    return new Reader(reader);
  }

  static async fromManifestDataAndAsset(
    manifestData: Buffer,
    asset: SourceAsset,
  ): Promise<Reader> {
    const reader: NeonReaderHandle = await neon.readerFromManifestDataAndAsset(
      manifestData,
      asset,
    );
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

    return manifestStore.manifests[activeManifest];
  }

  async postValidateCawg(): Promise<void> {
    return neon.readerPostValidateCawg.call(this.reader);
  }
}
