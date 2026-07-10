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

import type { BuilderIntent, C2paReason, Ingredient, Manifest } from "@contentauth/c2pa-types";

import { getLib, decodeBytesAndFree, callAsync } from "./native/lib.js";
import { checkPtr, checkInt, checkIntAsync } from "./native/error.js";
import { Context } from "./native/context.js";
import { C2paStream, mimeTypeOf } from "./native/stream.js";
import type { HasNativeSigner } from "./Signer.js";
import type {
  BuilderInterface,
  C2paSettings,
  CallbackSignerInterface,
  ClaimVersion,
  DestinationAsset,
  IdentityAssertionSignerInterface,
  JsCallbackSignerConfig,
  LocalSignerInterface,
  ManifestAssertionKind,
  ReaderInterface,
  SourceAsset,
} from "./types.d.ts";

/**
 * The plain c2pa-rs C API has no equivalent for a handful of methods that
 * were previously implemented directly against c2pa-rs's Rust API in
 * packages/c2pa-node/src/neon_builder.rs (now removed): there's no C
 * function to read back or mutate a builder's in-progress manifest
 * definition, add an arbitrary assertion, add a redaction, or add an
 * ingredient with no accompanying asset. See RFC.md.
 */
function notImplemented(name: string): Error {
  return new Error(
    `${name}() is not implemented in this koffi PoC — the plain c2pa-rs C ` +
      `API has no equivalent function for it (previously bespoke Rust glue ` +
      `in neon_builder.rs). See RFC.md.`,
  );
}

const DIGITAL_SOURCE_TYPE_TO_INT: Record<string, number> = {
  "http://c2pa.org/digitalsourcetype/empty": 0,
  "http://c2pa.org/digitalsourcetype/trainedAlgorithmicData": 1,
  "http://cv.iptc.org/newscodes/digitalsourcetype/digitalCapture": 2,
  "http://cv.iptc.org/newscodes/digitalsourcetype/computationalCapture": 3,
  "http://cv.iptc.org/newscodes/digitalsourcetype/negativeFilm": 4,
  "http://cv.iptc.org/newscodes/digitalsourcetype/positiveFilm": 5,
  "http://cv.iptc.org/newscodes/digitalsourcetype/print": 6,
  "http://cv.iptc.org/newscodes/digitalsourcetype/humanEdits": 7,
  "http://cv.iptc.org/newscodes/digitalsourcetype/compositeWithTrainedAlgorithmicMedia": 8,
  "http://cv.iptc.org/newscodes/digitalsourcetype/algorithmicallyEnhanced": 9,
  "http://cv.iptc.org/newscodes/digitalsourcetype/digitalCreation": 10,
  "http://cv.iptc.org/newscodes/digitalsourcetype/dataDrivenMedia": 11,
  "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia": 12,
  "http://cv.iptc.org/newscodes/digitalsourcetype/algorithmicMedia": 13,
  "http://cv.iptc.org/newscodes/digitalsourcetype/screenCapture": 14,
  "http://cv.iptc.org/newscodes/digitalsourcetype/virtualRecording": 15,
  "http://cv.iptc.org/newscodes/digitalsourcetype/composite": 16,
  "http://cv.iptc.org/newscodes/digitalsourcetype/compositeCapture": 17,
  "http://cv.iptc.org/newscodes/digitalsourcetype/compositeSynthetic": 18,
};

export class Builder implements BuilderInterface {
  private constructor(
    private _ctx: Context,
    private _ptr: unknown,
  ) {}

  static new(settings?: C2paSettings): Builder {
    const ctx = Context.create(settings);
    const ptr = checkPtr(
      getLib().c2pa_builder_from_context(ctx.ptr),
      "Failed to create C2paBuilder",
    );
    return new Builder(ctx, ptr);
  }

  static withJson(json: Manifest, settings?: C2paSettings): Builder {
    let jsonString: string;
    try {
      jsonString = JSON.stringify(json);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to stringify JSON Manifest Definition: ${error.message}`,
        );
      }
      throw new Error(
        "Failed to stringify JSON Manifest Definition: Unknown error",
      );
    }
    const builder = Builder.new(settings);
    builder._ptr = checkPtr(
      getLib().c2pa_builder_with_definition(builder._ptr, jsonString),
      "Failed to set manifest definition",
    );
    return builder;
  }

  setIntent(intent: BuilderIntent): void {
    let intentInt = 0;
    let digitalSourceTypeInt = 0;
    if (typeof intent === "string") {
      intentInt = intent === "edit" ? 1 : intent === "update" ? 2 : 0;
    } else if (intent && typeof intent === "object" && "create" in intent) {
      intentInt = 0;
      digitalSourceTypeInt = DIGITAL_SOURCE_TYPE_TO_INT[intent.create] ?? 0;
    }
    checkInt(
      getLib().c2pa_builder_set_intent(this._ptr, intentInt, digitalSourceTypeInt),
      "Failed to set intent",
    );
  }

  setNoEmbed(noEmbed = true): void {
    if (noEmbed) getLib().c2pa_builder_set_no_embed(this._ptr);
  }

  setRemoteUrl(remoteUrl: string): void {
    checkInt(
      getLib().c2pa_builder_set_remote_url(this._ptr, remoteUrl),
      "Failed to set remote URL",
    );
  }

  addAction(actionJson: string): void {
    checkInt(
      getLib().c2pa_builder_add_action(this._ptr, actionJson),
      "Failed to add action",
    );
  }

  addAssertion(
    _label: string,
    _assertion: unknown,
    _assertionKind?: ManifestAssertionKind,
  ): void {
    throw notImplemented("addAssertion");
  }

  async addResource(uri: string, resource: SourceAsset): Promise<void> {
    const stream = C2paStream.fromSource(resource);
    try {
      checkInt(
        getLib().c2pa_builder_add_resource(this._ptr, uri, stream.ptr),
        `Failed to add resource: ${uri}`,
      );
    } finally {
      stream.dispose();
    }
  }

  async addIngredient(
    ingredientJson: string,
    ingredient?: SourceAsset,
  ): Promise<void> {
    if (!ingredient) {
      throw notImplemented("addIngredient (without a source asset)");
    }
    const stream = C2paStream.fromSource(ingredient);
    try {
      checkInt(
        getLib().c2pa_builder_add_ingredient_from_stream(
          this._ptr,
          ingredientJson,
          mimeTypeOf(ingredient) ?? "",
          stream.ptr,
        ),
        "Failed to add ingredient",
      );
    } finally {
      stream.dispose();
    }
  }

  addIngredientFromReader(_reader: ReaderInterface): Ingredient {
    throw notImplemented("addIngredientFromReader");
  }

  async toArchive(asset: DestinationAsset): Promise<void> {
    const stream = C2paStream.forDestination(asset);
    try {
      checkInt(
        getLib().c2pa_builder_to_archive(this._ptr, stream.ptr),
        "Failed to write archive",
      );
      C2paStream.finalizeDestination(asset, stream, 0);
    } finally {
      stream.dispose();
    }
  }

  static async fromArchive(
    asset: SourceAsset,
    settings?: C2paSettings,
  ): Promise<Builder> {
    const ctx = Context.create(settings);
    const builderPtr = checkPtr(
      getLib().c2pa_builder_from_context(ctx.ptr),
      "Failed to create C2paBuilder",
    );
    const stream = C2paStream.fromSource(asset);
    try {
      const newPtr = checkPtr(
        getLib().c2pa_builder_with_archive(builderPtr, stream.ptr),
        "Failed to load archive",
      );
      return new Builder(ctx, newPtr);
    } finally {
      stream.dispose();
    }
  }

  sign(
    signer: LocalSignerInterface,
    input: SourceAsset,
    output: DestinationAsset,
  ): Buffer {
    return this._signWith(signer as unknown as HasNativeSigner, input, output);
  }

  signFile(
    signer: LocalSignerInterface,
    filePath: string,
    output: DestinationAsset,
  ): Buffer {
    return this.sign(signer, { path: filePath }, output);
  }

  async signConfigAsync(
    callback: (data: Buffer) => Promise<Buffer>,
    signerConfig: JsCallbackSignerConfig,
    input: SourceAsset,
    output: DestinationAsset,
  ): Promise<Buffer> {
    const { CallbackSigner } = await import("./Signer.js");
    const signer = CallbackSigner.newSigner(signerConfig, callback);
    return this._signWithAsync(signer, input, output);
  }

  /**
   * New capability, not present in the Neon binding: accepts AdobeSigner in
   * addition to the existing signer types. Unlike a JS async callback
   * signer, AdobeSigner's network round-trip runs entirely inside Rust as
   * one blocking C call, dispatched off the main thread by koffi's
   * .async() below — the event loop stays responsive during the sign, as
   * verified against real stage IMS this session. See AdobeSigner.ts and
   * RFC.md.
   */
  async signAsync(
    signer:
      | CallbackSignerInterface
      | IdentityAssertionSignerInterface
      | HasNativeSigner,
    input: SourceAsset,
    output: DestinationAsset,
  ): Promise<Buffer> {
    return this._signWithAsync(signer as unknown as HasNativeSigner, input, output);
  }

  /** Sync sign path used by sign()/signFile() — matches their sync interface. */
  private _signWith(
    signer: HasNativeSigner,
    input: SourceAsset,
    output: DestinationAsset,
  ): Buffer {
    const src = C2paStream.fromSource(input);
    const dest = C2paStream.forDestination(output);
    try {
      const nativeSigner = signer.nativeSigner();
      const manifestBytesOut = [null];
      const size = checkInt(
        getLib().c2pa_builder_sign(
          this._ptr,
          mimeTypeOf(input) ?? "",
          src.ptr,
          dest.ptr,
          nativeSigner.ptr,
          manifestBytesOut,
        ),
        "Failed to sign",
      );
      C2paStream.finalizeDestination(output, dest, size);
      return decodeBytesAndFree(manifestBytesOut[0], size);
    } catch (e) {
      throw signer.lastSyncError?.() ?? e;
    } finally {
      src.dispose();
      dest.dispose();
    }
  }

  /**
   * Async sign path used by signAsync()/signConfigAsync() — dispatches the
   * native call via koffi's .async() (libuv threadpool) instead of calling
   * it synchronously, so a slow signer (e.g. AdobeSigner's network
   * round-trip) doesn't block the event loop.
   */
  private async _signWithAsync(
    signer: HasNativeSigner,
    input: SourceAsset,
    output: DestinationAsset,
  ): Promise<Buffer> {
    const src = C2paStream.fromSource(input);
    const dest = C2paStream.forDestination(output);
    try {
      const nativeSigner = signer.nativeSigner();
      const manifestBytesOut = [null];
      const size = checkIntAsync(
        await callAsync<number | bigint>(
          getLib().c2pa_builder_sign,
          this._ptr,
          mimeTypeOf(input) ?? "",
          src.ptr,
          dest.ptr,
          nativeSigner.ptr,
          manifestBytesOut,
        ),
        "Failed to sign",
      );
      C2paStream.finalizeDestination(output, dest, size);
      return decodeBytesAndFree(manifestBytesOut[0], size);
    } catch (e) {
      throw signer.lastSyncError?.() ?? e;
    } finally {
      src.dispose();
      dest.dispose();
    }
  }

  getManifestDefinition(): Manifest {
    throw notImplemented("getManifestDefinition");
  }

  updateManifestProperty(_property: string, _value: ClaimVersion): void {
    throw notImplemented("updateManifestProperty");
  }

  addRedaction(_uri: string, _reason: C2paReason): void {
    throw notImplemented("addRedaction");
  }

  getHandle(): unknown {
    return this._ptr;
  }
}
