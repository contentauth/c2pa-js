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
import type { Context, ContextOptions } from "@contentauth/c2pa-utilities";

import { getNeonBinary } from "./binary.js";
import { validateSourceAssetSize } from "./assetSize.js";
import {
  cancelOnAbort,
  operationOptionsForNeon,
  resolveSettingsForNeon,
  resolveSignal,
} from "./Settings.js";
import type {
  C2paSettings,
  DestinationAsset,
  ReaderInterface,
  ResourceAsset,
  SourceAsset,
  NeonReaderHandle,
  NeonOperationHandle,
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
   * @param settingsOrContext A `Context`, or (@deprecated) a raw `C2paSettings` string/object. Passing a
   * raw `C2paSettings` value is deprecated and will be removed in a future version. `null` is treated
   * the same as `undefined`.
   */
  static async fromAsset(
    asset: SourceAsset,
    settingsOrContext?: C2paSettings | Context | null,
    contextOptions?: ContextOptions,
  ): Promise<Reader | null> {
    await validateSourceAssetSize(asset);
    const reader = await runRead(
      settingsOrContext,
      contextOptions,
      (settingsStr, options) =>
        getNeonBinary().readerFromAsset(asset, settingsStr, options),
    );
    return reader ? new Reader(reader) : null;
  }

  /**
   * @param settingsOrContext A `Context`, or (@deprecated) a raw `C2paSettings` string/object. Passing a
   * raw `C2paSettings` value is deprecated and will be removed in a future version. `null` is treated
   * the same as `undefined`.
   */
  static async fromManifestDataAndAsset(
    manifestData: Buffer,
    asset: SourceAsset,
    settingsOrContext?: C2paSettings | Context | null,
    contextOptions?: ContextOptions,
  ): Promise<Reader> {
    await validateSourceAssetSize(asset);
    const reader = await runRead(
      settingsOrContext,
      contextOptions,
      (settingsStr, options) =>
        getNeonBinary().readerFromManifestDataAndAsset(
          manifestData,
          asset,
          settingsStr,
          options,
        ),
    );
    return new Reader(reader as NeonReaderHandle);
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

/**
 * Runs a neon read, attaching the operation handle to `AbortSignal` before the read is
 * awaited. A read that finishes before the engine's next progress checkpoint is not
 * cancelled, per `ContextOptions.signal`.
 *
 * @throws the signal's reason when it has already been aborted.
 */
async function runRead(
  settingsOrContext: C2paSettings | Context | null | undefined,
  contextOptions: ContextOptions | undefined,
  start: (
    settingsStr: string | undefined,
    options: ReturnType<typeof operationOptionsForNeon>,
  ) => { operation: NeonOperationHandle; reader: Promise<NeonReaderHandle | null> },
): Promise<NeonReaderHandle | null> {
  const signal = resolveSignal(settingsOrContext, contextOptions);
  signal?.throwIfAborted();

  const settingsStr = resolveSettingsForNeon(settingsOrContext);
  const options = operationOptionsForNeon(settingsOrContext, contextOptions);
  const { operation, reader } = start(settingsStr, options);

  const detach = cancelOnAbort(operation, signal);
  try {
    return await reader;
  } finally {
    detach();
  }
}
