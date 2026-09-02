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

import type {
  Action,
  BuilderIntent,
  C2paReason,
  Ingredient,
  Manifest,
  ManifestStore,
} from "@contentauth/c2pa-types";
import type { Context } from "@contentauth/c2pa-utilities";

import { getNeonBinary } from "./binary.js";
import { resolveSettingsForNeon } from "./Settings.js";
import type {
  BuilderInterface,
  C2paSettings,
  CallbackSignerInterface,
  ClaimVersion,
  DestinationAsset,
  FileAsset,
  IdentityAssertionSignerInterface,
  JsCallbackSignerConfig,
  LocalSignerInterface,
  ManifestAssertionKind,
  ReaderInterface,
  SourceAsset,
  NeonBuilderHandle,
} from "./types.d.ts";
import { IdentityAssertionSigner } from "./IdentityAssertion.js";

function stringifyManifestDefinition(json: Manifest): string {
  try {
    return JSON.stringify(json);
  } catch (error) {
    // TODO: errors should be standardized across JS and Node
    if (error instanceof Error) {
      throw new Error(
        `Failed to stringify JSON Manifest Definition: ${error.message}`,
      );
    }
    throw new Error(
      "Failed to stringify JSON Manifest Definition: Unknown error",
    );
  }
}

export class Builder implements BuilderInterface {
  constructor(private builder: NeonBuilderHandle) {}

  /**
   * @deprecated Use {@link Builder.newAsync} instead, passing a `Context`. Will be removed in a
   * future major version.
   * @param settings A raw `C2paSettings` string/object.
   */
  static new(settings?: C2paSettings): Builder {
    const settingsStr = resolveSettingsForNeon(settings);
    const builder: NeonBuilderHandle = getNeonBinary().builderNew(settingsStr);
    return new Builder(builder);
  }

  /**
   * Create a Builder with a minimal manifest definition, configured by an optional `Context`.
   * Prefer this over the deprecated {@link Builder.new}.
   *
   * Declared async for forward compatibility. Upcoming work will allow c2pa-node
   * to resolve trust anchors at construction time.
   *
   * @param context A `Context` object containing configuration settings for this Builder.
   */
  static async newAsync(context?: Context): Promise<Builder> {
    const settingsStr = resolveSettingsForNeon(context);
    const builder: NeonBuilderHandle = getNeonBinary().builderNew(settingsStr);
    return new Builder(builder);
  }

  /**
   * @deprecated Use {@link Builder.withJsonAsync} instead, passing a `Context`. Will be removed
   * in a future version.
   * @param settings A raw `C2paSettings` string/object.
   */
  static withJson(json: Manifest, settings?: C2paSettings): Builder {
    const jsonString = stringifyManifestDefinition(json);
    const settingsStr = resolveSettingsForNeon(settings);
    const builder: NeonBuilderHandle = getNeonBinary().builderWithJson(
      jsonString,
      settingsStr,
    );
    return new Builder(builder);
  }

  /**
   * Create a Builder from a manifest definition, configured by an optional `Context`. Prefer
   * this over the deprecated {@link Builder.withJson}.
   *
   * Declared async for forward compatibility. Upcoming work will allow c2pa-node
   * to resolve trust anchors at construction time.
   */
  static async withJsonAsync(
    json: Manifest,
    context?: Context,
  ): Promise<Builder> {
    const jsonString = stringifyManifestDefinition(json);
    const settingsStr = resolveSettingsForNeon(context);
    const builder: NeonBuilderHandle = getNeonBinary().builderWithJson(
      jsonString,
      settingsStr,
    );
    return new Builder(builder);
  }

  setIntent(intent: BuilderIntent): void {
    const intentString = JSON.stringify(intent);
    getNeonBinary().builderSetIntent.call(this.builder, intentString);
  }

  setNoEmbed(noEmbed = true): void {
    getNeonBinary().builderSetNoEmbed.call(this.builder, noEmbed);
  }

  setRemoteUrl(remoteUrl: string): void {
    getNeonBinary().builderSetRemoteUrl.call(this.builder, remoteUrl);
  }

  addAction(actionJson: string): void {
    return getNeonBinary().builderAddAction.call(this.builder, actionJson);
  }

  addAssertion(
    label: string,
    assertion: unknown,
    assertionKind?: ManifestAssertionKind,
  ): void {
    return getNeonBinary().builderAddAssertion.call(
      this.builder,
      label,
      assertion,
      assertionKind,
    );
  }

  async addResource(uri: string, resource: SourceAsset): Promise<void> {
    return getNeonBinary().builderAddResource.call(this.builder, uri, resource);
  }

  async addIngredient(
    ingredientJson: string,
    ingredient?: SourceAsset,
  ): Promise<void> {
    if (ingredient) {
      return getNeonBinary().builderAddIngredientFromAsset.call(
        this.builder,
        ingredientJson,
        ingredient,
      );
    } else {
      return getNeonBinary().builderAddIngredient.call(
        this.builder,
        ingredientJson,
      );
    }
  }

  addIngredientFromReader(reader: ReaderInterface): Ingredient {
    const readerHandle = reader.getHandle();
    const result = getNeonBinary().builderAddIngredientFromReader.call(
      this.builder,
      readerHandle,
    );
    return JSON.parse(result);
  }

  async toArchive(asset: DestinationAsset): Promise<void> {
    return getNeonBinary().builderToArchive.call(this.builder, asset);
  }

  /**
   * @param settingsOrContext A `Context`, or (deprecated) a raw `C2paSettings` string/object. Passing a
   * raw `C2paSettings` value is deprecated and will be removed in a future version.
   */
  static async fromArchive(
    asset: SourceAsset,
    settingsOrContext?: C2paSettings | Context,
  ): Promise<Builder> {
    const settingsStr = resolveSettingsForNeon(settingsOrContext);
    return new Builder(
      await getNeonBinary().builderFromArchive(asset, settingsStr),
    );
  }

  sign(
    signer: LocalSignerInterface,
    input: SourceAsset,
    output: DestinationAsset,
  ): Buffer {
    return getNeonBinary().builderSign.call(
      this.builder,
      signer.getHandle(),
      input,
      output,
    );
  }

  signFile(
    signer: LocalSignerInterface,
    filePath: string,
    output: DestinationAsset,
  ): Buffer {
    const input: FileAsset = { path: filePath };
    return getNeonBinary().builderSign.call(
      this.builder,
      signer.getHandle(),
      input,
      output,
    );
  }

  async signConfigAsync(
    callback: (data: Buffer) => Promise<Buffer>,
    signerConfig: JsCallbackSignerConfig,
    input: SourceAsset,
    output: DestinationAsset,
  ): Promise<Buffer> {
    return getNeonBinary()
      .builderSignConfigAsync.call(
        this.builder,
        callback,
        signerConfig,
        input,
        output,
      )
      .then((result: Buffer | { manifest: Buffer; signedAsset: Buffer }) => {
        // output is a buffer and result is the manifest and the signed asset.
        if ("buffer" in output) {
          if ("signedAsset" in result && "manifest" in result) {
            output.buffer = result.signedAsset;
            return result.manifest;
          } else {
            throw new Error("Unexpected result for DestinationBuffer");
          }
        } else {
          // output is a file and result is the bytes of the manifest.
          return result as Buffer;
        }
      })
      .catch((error: Error) => {
        throw error;
      });
  }

  async signAsync(
    signer: CallbackSignerInterface | IdentityAssertionSignerInterface,
    input: SourceAsset,
    output: DestinationAsset,
  ): Promise<Buffer> {
    const neonHandle = signer.getHandle();
    const isIdentity = signer instanceof IdentityAssertionSigner;
    const neonFn = isIdentity
      ? getNeonBinary().builderIdentitySignAsync
      : getNeonBinary().builderSignAsync;
    return neonFn
      .call(this.builder, neonHandle, input, output)
      .then((result: Buffer | { manifest: Buffer; signedAsset: Buffer }) => {
        // output is a buffer and result is the manifest and the signed asset.
        if ("buffer" in output) {
          if ("signedAsset" in result && "manifest" in result) {
            output.buffer = result.signedAsset;
            return result.manifest;
          } else {
            throw new Error("Unexpected result for DestinationBuffer");
          }
        } else {
          // output is a file and result is the bytes of the manifest.
          return result as Buffer;
        }
      })
      .catch((error: Error) => {
        throw error;
      });
  }

  getManifestDefinition(): Manifest {
    return JSON.parse(
      getNeonBinary().builderManifestDefinition.call(this.builder),
    );
  }

  updateManifestProperty(property: string, value: ClaimVersion): void {
    getNeonBinary().builderUpdateManifestProperty.call(
      this.builder,
      property,
      value,
    );
  }

  addRedaction(uri: string, reason: C2paReason): void {
    getNeonBinary().builderAddRedaction.call(this.builder, uri, reason);
  }

  filterActions(keep: (action: Action) => boolean): void {
    getNeonBinary().builderFilterActions.call(this.builder, keep);
  }

  filterIngredients(
    rescue: (
      ingredient: Ingredient,
      provenance: ManifestStore | null,
    ) => boolean,
  ): void {
    getNeonBinary().builderFilterIngredients.call(this.builder, rescue);
  }

  filterActionsAndIngredients(
    keepAction: (action: Action) => boolean,
    rescueIngredient: (
      ingredient: Ingredient,
      provenance: ManifestStore | null,
    ) => boolean,
  ): void {
    getNeonBinary().builderFilterActionsAndIngredients.call(
      this.builder,
      keepAction,
      rescueIngredient,
    );
  }

  updateActions(transform: (actions: Action[]) => Action[]): void {
    getNeonBinary().builderUpdateActions.call(this.builder, transform);
  }

  getHandle(): NeonBuilderHandle {
    return this.builder;
  }
}
