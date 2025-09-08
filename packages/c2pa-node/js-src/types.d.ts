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

import { Buffer } from "buffer";
import type { Manifest, ManifestStore } from "@contentauth/toolkit";
/**
 * Describes the digital signature algorithms allowed by the C2PA spec
 *
 * Per <https://c2pa.org/specifications/specifications/1.0/specs/C2PA_Specification.html#_digital_signatures>:
 *
 * > All digital signatures that are stored in a C2PA Manifest shall > be generated using one of the digital signature algorithms and > key types listed as described in this section
 */
export type SigningAlg =
  | "es256"
  | "es384"
  | "es512"
  | "ps256"
  | "ps384"
  | "ps512"
  | "ed25519";

export type ClaimVersion = 1 | 2;

// Trustmark Versions
export type TrustmarkVersion =
  // Tolerates 8 bit flips
  | "BchSuper"
  // Tolerates 5 bit flips
  | "Bch5"
  // Tolerates 4 bit flips
  | "Bch4"
  // Tolerates 3 bit flips
  | "Bch3";

// Trustmark Variants. See https://github.com/adobe/trustmark/blob/main/FAQ.md for more
export type TrustmarkVariant =
  // Original Trustmark model
  | "B"
  // Compact Trustmark model
  | "C"
  // Perceptual model
  | "P"
  // Quality Trustmark model
  | "Q";

type ManifestAssertionKind = "Cbor" | "Json" | "Binary" | "Uri";

/**
 * A buffer for the source asset
 */
export interface SourceBufferAsset {
  // A buffer containing the asset data
  buffer: Buffer;
  // The MIME type of the asset, for instance `image/jpeg`
  mimeType: string;
}

/**
 * A buffer for the destination asset
 */
export interface DestinationBufferAsset {
  // An initially empty buffer that will be filled with the signed asset
  buffer: Buffer | null;
}

/**
 * A file that can be used either the source or destination
 */
export interface FileAsset {
  // The path to the asset
  path: string;
  // The optional MIME type of the asset, for instance `image/jpeg`.
  // If not supplied, the MIME type will be inferred from the file extension, if available.
  mimeType?: string;
}

/**
 * A source asset that can either be in memory or on disk
 * This is a workaround since Neon does not support streams
 */
export type SourceAsset = SourceBufferAsset | FileAsset;

/**
 * An destination asset that can either be in memory or on disk
 * This is a workaround since Neon does not support streams
 */
export type DestinationAsset = DestinationBufferAsset | FileAsset;

/**
 * A signer that uses a local certificate and private key to sign data
 */
export interface LocalSignerInterface {
  sign(data: Buffer): Buffer;
  alg(): SigningAlg;
  certs(): Array<Buffer>;
  reserveSize(): number;
  timeAuthorityUrl(): string | undefined;
  signer(): LocalSignerInterface;
}

/**
 * A signer that uses a callback to sign data.
 */
export interface CallbackSignerInterface {
  sign(data: Buffer): Promise<Buffer>;
  alg(): SigningAlg;
  certs(): Array<Buffer>;
  reserveSize(): number;
  timeAuthorityUrl(): string | undefined;
  signer(): CallbackSignerInterface;
}

/**
 * @internal
 * Internal type used for Rust/Node.js interop
 */
export type CallbackSignerConfig = unknown;

/*
 * Configuration for an asynchronous signer.
 * This allows signing without passing a private key.
 */
export interface JsCallbackSignerConfig {
  alg: SigningAlg;
  certs: Buffer[];
  reserveSize: number;
  tsaUrl?: string;
  tsaHeaders?: Array<[string, string]>;
  tsaBody?: Buffer;
}

export interface BuilderInterface {
  /**
   * Set the no embed flag of the manifest
   * @param noEmbed The no embed flag of the manifest
   */
  setNoEmbed(noEmbed: boolean): void;
  /**
   * Set the remote URL of the manifest
   * @param url The remote URL of the manifest
   */
  setRemoteUrl(url: string): void;
  /**
   * Add CBOR assertion to the builder
   * @param label The label of the assertion
   * @param assertion The CBOR encoded assertion
   */
  addAssertion(
    label: string,
    assertion: string,
    assertionKind?: ManifestAssertionKind,
  ): void;
  /**
   * Add a resource from a buffer or file
   * @param uri The URI of the resource
   * @param resource The source and format of the resource
   */
  addResource(uri: string, resource: SourceAsset): Promise<void>;

  /**
   * Add an ingredient from a buffer or file
   * @param ingredientJson The JSON representation of the ingredient
   * @param ingredient The source and format of the ingredient
   */
  addIngredient(ingredientJson: string, ingredient: SourceAsset): Promise<void>;

  /**
   * Convert the Builder into a archive formatted buffer or file
   * @param asset The file or buffer for the archive
   */
  toArchive(asset: DestinationAsset): Promise<void>;

  /**
   * Sign an asset from a buffer or file
   * @param signer The local signer to use
   * @param source The file or buffer containing the asset
   * @param dest The file or buffer to write the asset to
   * @returns the bytes of the c2pa_manifest that was embedded
   */
  sign(
    signer: LocalSignerInterface,
    input: SourceAsset,
    output: DestinationAsset,
  ): Buffer;

  /**
   * Sign an asset from a buffer or file asynchronously, using a callback
   * and not passing a private key
   * @param signerConfig The configuration for the signer
   * @param callback The callback function to sign the asset
   * @param source The file or buffer containing the asset
   * @param dest The file or buffer to write the asset to
   * @returns the bytes of the c2pa_manifest that was embedded
   */
  signConfigAsync(
    callback: (data: Buffer) => Promise<Buffer>,
    signerConfig: JsCallbackSignerConfig,
    input: SourceAsset,
    output: DestinationAsset,
  ): Promise<Buffer>;

  /**
   * Sign an asset from a buffer or file asynchronously, using a
   * CallbackSigner
   * @param callbackSigner The CallbackSigner
   * @param source The file or buffer containing the asset
   * @param dest The file or buffer to write the asset to
   * @returns the bytes of the c2pa_manifest that was embedded
   */
  signAsync(
    callbackSigner: CallbackSignerInterface,
    input: SourceAsset,
    output: DestinationAsset,
  ): Promise<Buffer>;

  /**
   * Embed a signed manifest into a stream using the LocalSigner
   * @param signer The local signer to use
   * @param source The file or buffer containing the asset
   * @param dest The file or buffer to write the asset to
   * @returns the bytes of the c2pa_manifest that was embedded
   */
  signFile(
    signer: LocalSignerInterface,
    filePath: string,
    output: DestinationAsset,
  ): Buffer;

  /**
   * Sign an asset from a buffer or file asynchronously, using an
   * IdentityAssertionSigner
   * @param signer The IdentityAssertionSigner
   * @param source The file or buffer containing the asset
   * @param dest The file or buffer to write the asset to
   * @returns the bytes of the c2pa_manifest that was embedded
   */
  identitySignAsync(
    callbackSigner: IdentityAssertionSignerInterface,
    input: SourceAsset,
    output: DestinationAsset,
  ): Promise<Buffer>;

  /**
   * Getter for the builder's manifest definition
   * @returns The manifest definition
   */
  getManifestDefinition(): Manifest;

  /**
   * Update a string property of the manifest
   * @returns The manifest definition
   */
  updateManifestProperty(property: string, value: string | ClaimVersion): void;
}

export interface ReaderInterface {
  /**
   * Get the JSON representation of the manifest
   */
  json(): ManifestStore;

  /**
   * Get the remote url of the manifest if this reader obtained the manifest remotely
   */
  remoteUrl(): string;

  /**
   * Returns true if the the reader was created from an embedded manifest
   */
  isEmbedded(): boolean;

  /**
   * Write a resource to a buffer or file
   * @param uri The URI of the resource
   * @param filePath The path to the file
   */
  resourceToAsset(uri: string, output: DestinationAsset): Promise<number>;

  /**
   * Run CAWG validation
   */
  postValidateCawg(): Promise<void>;
}

export interface IdentityAssertionSignerInterface {
  /** Add a IdentityAssertionBuilder  to be used when signing the
   * next Manifest
   *
   * IMPORTANT: When sign() is called, the list of
   * IdentityAssertionBuilders will be cleared.
   */
  addIdentityAssertion(
    identityAssertionBuilder: IdentityAssertionBuilderInterface,
  ): void;
}

export interface IdentityAssertionBuilderInterface {
  /**
   * Add assertion labels to consider as referenced_assertions.
   * If any of these labels match assertions that are present in the partial
   * claim submitted during signing, they will be added to the
   * `referenced_assertions` list for this identity assertion.
   * @param referencedAssertions The list of assertion labels to add
   */
  addReferencedAssertions(referencedAssertions: string[]): void;
  /**
   * Add roles to attach to the named actor for this identity assertion.
   * @param roles Named actor roles
   */
  addRoles(roles: string[]): void;

  /**
   * Get the underlying IdentityAssertionBuilder
   */
  builder(): IdentityAssertionBuilderInterface;
}

export interface TrustmarkInterface {
  /**
   * Encode a watermark into an image.
   * @param image image to be watermarked
   * @param strength number between 0 and 1 indicating how strongly the watermark should be applied
   * @param watermark optional bitstring to be encoded, automatically generated if not provided
   * @returns raw pixel data in RGB8 format (width * height * 3 bytes)
   */
  encode(image: Buffer, strength: number, watermark?: string): Promise<Buffer>;

  /**
   * Decode a watermark from an image.
   * @param image image to extract the watermark from (must be in a supported image format like JPEG, PNG, etc.)
   */
  decode(image: Buffer): Promise<string>;
}

export interface TrustmarkConfig {
  variant: TrustmarkVariant;
  version: TrustmarkVersion;
  modelPath?: string;
}
