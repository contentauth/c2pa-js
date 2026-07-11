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
 * These five methods cannot be implemented against koffi (or any other C-ABI
 * binding) today, and the fix is NOT something this package can do on its
 * own — it requires new functions in c2pa-rs's own public C FFI crate,
 * `c2pa_c_ffi` (github.com/contentauth/c2pa-rs/tree/main/c2pa_c_ffi), which
 * is what `c2pa.h` is generated from.
 *
 * Why: the previous Neon binding (packages/c2pa-node/src/neon_builder.rs,
 * now removed) called `c2pa::Builder::add_assertion`, direct field access on
 * `builder.definition` (for redactions/property updates/reading the
 * definition back), etc. *directly against the Rust crate* — Neon addons
 * aren't restricted to a C ABI, they can call any public Rust API. koffi
 * (like any FFI binding for a non-Rust language) can only reach whatever's
 * exposed as a `#[no_mangle] extern "C"` function, and `c2pa_c_ffi` doesn't
 * currently export these.
 *
 * The underlying Rust methods/fields do exist (confirmed against
 * c2pa-rs/sdk/src/builder.rs): `Builder::add_assertion(label, &impl
 * Serialize)`, `Builder::add_ingredient(impl Into<Ingredient>)` (no stream
 * required), and the public `Builder.definition: ManifestDefinition` field
 * (redactions, property updates, and reading the definition back are all
 * just reads/writes of that field or `serde_json::to_string(&builder)`,
 * since `Builder` derives `Serialize`). None of this is Adobe-specific, so
 * the right place to add C wrappers is upstream in the public,
 * MIT/Apache-2.0-licensed `c2pa_c_ffi` crate (e.g. following the existing
 * `c2pa_builder_add_action` as a template) — NOT in Adobe's private
 * `adobe_api` repo, which would tie this open source package's core
 * Builder functionality to a non-public dependency.
 *
 * Confirmed this isn't a c2pa-node-specific problem: c2pa-python
 * (~/Repos/c2pa-python, same authors, also a ctypes/C-ABI binding over this
 * exact `c2pa_c_ffi` layer) has the identical gap — its `Builder` class
 * (src/c2pa/c2pa.py) has no `add_assertion`/`add_redaction`/
 * `get_manifest_definition`/`update_manifest_property` either, for the same
 * reason. Every C-ABI language binding is blocked on the same upstream work.
 * Notably, `c2patool` (the reference CLI, pure Rust, no C ABI) never needed
 * these either — its whole interface is upfront JSON manifest files, same
 * pattern c2pa-python's own docs use exclusively.
 *
 * This is an open decision, not just a to-do: land the upstream PR (this
 * comment's plan) OR drop these five methods from this package's public API
 * to match every other non-Rust binding — see RFC.md's "Decision point"
 * section for the pros/cons of each option.
 */
function notImplemented(name: string): Error {
  return new Error(
    `${name}() is not implemented in this koffi PoC — it requires new ` +
      `functions in c2pa-rs's public c2pa_c_ffi crate (not present today, ` +
      `and not something this package can add on its own). See the comment ` +
      `above this function in Builder.ts, and RFC.md.`,
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

  async signAsync(
    signer: CallbackSignerInterface | IdentityAssertionSignerInterface,
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
   * it synchronously, matching the Neon binding's own async behavior for
   * these methods.
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
