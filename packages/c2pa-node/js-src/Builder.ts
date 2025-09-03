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

import * as neon from "index.node";
import { IdentityAssertionSigner } from "./IdentityAssertion";
import type {
  BuilderInterface,
  CallbackSignerInterface,
  ClaimVersion,
  DestinationAsset,
  FileAsset,
  JsCallbackSignerConfig,
  LocalSignerInterface,
  ManifestAssertionKind,
  ManifestDefinition,
  SourceAsset,
} from "./types";

export class Builder implements BuilderInterface {
  private constructor(private builder: BuilderInterface) {}

  static new(): Builder {
    const builder = neon.builderNew();
    return new Builder(builder);
  }

  static withJson(json: ManifestDefinition): Builder {
    let jsonString: string;
    try {
      jsonString = JSON.stringify(json);
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
    const builder: BuilderInterface = neon.builderWithJson(jsonString);
    return new Builder(builder);
  }

  setNoEmbed(noEmbed = true): void {
    neon.builderSetNoEmbed.call(this.builder, noEmbed);
  }

  setRemoteUrl(remoteUrl: string): void {
    neon.builderSetRemoteUrl.call(this.builder, remoteUrl);
  }

  addAssertion(
    label: string,
    assertion: string,
    assertionKind?: ManifestAssertionKind,
  ): void {
    return neon.builderAddAssertion.call(
      this.builder,
      label,
      assertion,
      assertionKind,
    );
  }

  async addResource(uri: string, resource: SourceAsset): Promise<void> {
    return neon.builderAddResource.call(this.builder, uri, resource);
  }

  async addIngredient(
    ingredientJson: string,
    ingredient: SourceAsset,
  ): Promise<void> {
    return neon.builderAddIngredient.call(
      this.builder,
      ingredientJson,
      ingredient,
    );
  }

  async toArchive(asset: DestinationAsset): Promise<void> {
    return neon.builderToArchive.call(this.builder, asset);
  }

  static async fromArchive(asset: SourceAsset): Promise<Builder> {
    return new Builder(await neon.builderFromArchive(asset));
  }

  sign(
    signer: LocalSignerInterface,
    input: SourceAsset,
    output: DestinationAsset,
  ): Buffer {
    return neon.builderSign.call(this.builder, signer.signer(), input, output);
  }

  signFile(
    signer: LocalSignerInterface,
    filePath: string,
    output: DestinationAsset,
  ): Buffer {
    const input: FileAsset = { path: filePath };
    return neon.builderSign.call(this.builder, signer.signer(), input, output);
  }

  async signConfigAsync(
    callback: (data: Buffer) => Promise<Buffer>,
    signerConfig: JsCallbackSignerConfig,
    input: SourceAsset,
    output: DestinationAsset,
  ): Promise<Buffer> {
    return neon.builderSignConfigAsync
      .call(this.builder, callback, signerConfig, input, output)
      .then((result) => {
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
      .catch((error) => {
        throw error;
      });
  }

  async signAsync(
    signer: CallbackSignerInterface,
    input: SourceAsset,
    output: DestinationAsset,
  ): Promise<Buffer> {
    return neon.builderSignAsync
      .call(this.builder, signer.signer(), input, output)
      .then((result) => {
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
      .catch((error) => {
        throw error;
      });
  }

  async identitySignAsync(
    signer: IdentityAssertionSigner,
    input: SourceAsset,
    output: DestinationAsset,
  ): Promise<Buffer> {
    return neon.builderIdentitySignAsync
      .call(this.builder, signer.signer(), input, output)
      .then((result) => {
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
      .catch((error) => {
        throw error;
      });
  }

  getManifestDefinition(): ManifestDefinition {
    return JSON.parse(neon.builderManifestDefinition.call(this.builder));
  }

  updateManifestProperty(property: string, value: ClaimVersion): void {
    neon.builderUpdateManifestProperty.call(this.builder, property, value);
  }
}
