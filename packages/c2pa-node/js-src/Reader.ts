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

import * as neon from 'index.node';

export class Reader implements neon.Reader {
  private constructor(private reader: neon.Reader) {}

  json(): neon.ManifestStore {
    return JSON.parse(neon.readerJson.call(this.reader));
  }

  async resourceToAsset(
    uri: string,
    asset: neon.DestinationAsset,
  ): Promise<number> {
    return neon.readerResourceToAsset.call(this.reader, uri, asset);
  }

  static async fromAsset(asset: neon.SourceAsset): Promise<Reader> {
    const reader = await neon.readerFromAsset(asset);
    return new Reader(reader);
  }

  static async fromManifestDataAndAsset(
    manifestData: Buffer,
    asset: neon.SourceAsset,
  ): Promise<Reader> {
    const reader = await neon.readerFromManifestDataAndAsset(
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

  getActive(): neon.Manifest | undefined {
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
