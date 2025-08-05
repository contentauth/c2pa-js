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

declare module "index.node" {
  import { Buffer } from "buffer";
  /**
   * Assertions in C2PA can be stored in several formats
   */
  export type ManifestAssertionKind = "Cbor" | "Json";
  export type UriOrResource = ResourceRef | HashedUri;
  export type DateT = string;
  export type Relationship = "parentOf" | "componentOf" | "inputTo";
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

  // A claim_version field is now allowed in a manifest definition for Builder and, if set to 2 will generate v2 claims
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

  /**
   * A Container for a set of Manifests and a ValidationStatus list
   */
  export interface ManifestStore {
    /**
     * A label for the active (most recent) manifest in the store
     */
    active_manifest?: string | undefined;
    /**
     * A HashMap of Manifests
     */
    manifests: {
      [k: string]: Manifest;
    };
    /**
     * ValidationStatus generated when loading the ManifestStore from an asset
     */
    validation_status?: ValidationStatus[] | undefined;
    [k: string]: unknown;
  }

  /**
   * A Manifest represents all the information in a c2pa manifest
   */
  export interface Manifest {
    /**
     * A list of assertions
     */
    assertions?: ManifestAssertion[];
    /**
     * A User Agent formatted string identifying the software/hardware/system produced this claim Spaces are not allowed in names, versions can be specified with product/1.0 syntax
     */
    claim_generator?: string;
    claim_generator_hints?:
      | {
          [k: string]: unknown;
        }
      | undefined;
    /**
     * A list of claim generator info data identifying the software/hardware/system produced this claim
     */
    claim_generator_info?: ClaimGeneratorInfo[] | undefined;
    /**
     * A List of verified credentials
     */
    credentials?: unknown[] | undefined;
    /**
     * The format of the source file as a MIME type
     */
    format?: string;
    /**
     * A List of ingredients
     */
    ingredients?: Ingredient[];
    /**
     * Instance ID from `xmpMM:InstanceID` in XMP metadata
     */
    instance_id?: string;
    label?: string | undefined;
    /**
     * A list of redactions - URIs to a redacted assertions
     */
    redactions?: string[] | undefined;
    /**
     * container for binary assets (like thumbnails)
     */
    resources?: ResourceStore;
    /**
     * Signature data (only used for reporting)
     */
    signature_info?: SignatureInfo | undefined;
    thumbnail?: ResourceRef | undefined;
    /**
     * A human-readable title, generally source filename
     */
    title?: string | undefined;
    /**
     * Optional prefix added to the generated Manifest Label This is typically Internet domain name for the vendor (i.e. `adobe`)
     */
    vendor?: string | undefined;
    [k: string]: unknown;
  }

  /**
   * A labeled container for an Assertion value in a Manifest
   */
  export interface ManifestAssertion {
    data: unknown;
    /**
     * There can be more than one assertion for any label
     */
    instance?: number | undefined;
    /**
     * The [ManifestAssertionKind] for this assertion (as stored in c2pa content)
     */
    kind?: ManifestAssertionKind | undefined;
    /**
     * An assertion label in reverse domain format
     */
    label: string;
    [k: string]: unknown;
  }

  /**
   * Description of the claim generator, or the software used in generating the claim
   *
   * This structure is also used for actions softwareAgent
   */
  export interface ClaimGeneratorInfo {
    /**
     * hashed URI to the icon (either embedded or remote)
     */
    icon?: UriOrResource | undefined;
    /**
     * A human readable string naming the claim_generator
     */
    name: string;
    /**
     * A human readable string of the product's version
     */
    version?: string | undefined;
    [k: string]: unknown;
  }

  /**
   * A reference to a resource to be used in JSON serialization
   */
  export interface ResourceRef {
    /**
     * The algorithm used to hash the resource (if applicable)
     */
    alg?: string | undefined;
    /**
     * More detailed data types as defined in the C2PA spec
     */
    data_types?: AssetType[] | undefined;
    /**
     * The mime type of the referenced resource
     */
    format: string;
    /**
     * The hash of the resource (if applicable)
     */
    hash?: string | undefined;
    /**
     * A URI that identifies the resource as referenced from the manifest
     *
     * This may be a JUMBF URI, a file path, a URL or any other string. Relative JUMBF URIs will be resolved with the manifest label. Relative file paths will be resolved with the base path if provided
     */
    identifier: string;
    [k: string]: unknown;
  }

  export interface AssetType {
    type: string;
    version?: string | undefined;
    [k: string]: unknown;
  }

  /**
   * Hashed Uri structure as defined by C2PA spec It is annotated to produce the correctly tagged cbor serialization
   */
  export interface HashedUri {
    alg?: string | undefined;
    hash: number[];
    url: string;
    [k: string]: unknown;
  }

  /**
   * An `Ingredient` is any external asset that has been used in the creation of an image
   */
  export interface Ingredient {
    /**
     * The active manifest label (if one exists)
     *
     * If this ingredient has a [`ManifestStore`], this will hold the label of the active [`Manifest`]
     *
     * [`Manifest`]: crate::Manifest [`ManifestStore`]: crate::ManifestStore
     */
    active_manifest?: string | undefined;
    /**
     * A reference to the actual data of the ingredient
     */
    data?: ResourceRef | undefined;
    /**
     * Additional description of the ingredient
     */
    description?: string | undefined;
    /**
     * Document ID from `xmpMM:DocumentID` in XMP metadata
     */
    document_id?: string | undefined;
    /**
     * The format of the source file as a MIME type
     */
    format?: string;
    /**
     * An optional hash of the asset to prevent duplicates
     */
    hash?: string | undefined;
    /**
     * URI to an informational page about the ingredient or its data
     */
    informational_URI?: string | undefined;
    /**
     * Instance ID from `xmpMM:InstanceID` in XMP metadata
     */
    instance_id?: string | undefined;
    /**
     * A [`ManifestStore`] from the source asset extracted as a binary C2PA blob
     *
     * [`ManifestStore`]: crate::ManifestStore
     */
    manifest_data?: ResourceRef | undefined;
    /**
     * Any additional [`Metadata`] as defined in the C2PA spec
     *
     * [`Manifest`]: crate::Manifest
     */
    metadata?: Metadata | undefined;
    /**
     * URI from `dcterms:provenance` in XMP metadata
     */
    provenance?: string | undefined;
    /**
     * Set to `ParentOf` if this is the parent ingredient
     *
     * There can only be one parent ingredient in the ingredients
     */
    relationship?: Relationship & string;
    resources?: ResourceStore;
    /**
     * A thumbnail image capturing the visual state at the time of import
     *
     * A tuple of thumbnail MIME format (i.e. `image/jpeg`) and binary bits of the image
     */
    thumbnail?: ResourceRef | undefined;
    /**
     * A human-readable title, generally source filename
     */
    title: string;
    /**
     * Validation results
     */
    validation_status?: ValidationStatus[] | undefined;
    [k: string]: unknown;
  }

  /**
   * The Metadata structure can be used as part of other assertions or on its own to reference others
   */
  export interface Metadata {
    data_source?: DataSource | undefined;
    dateTime?: DateT | undefined;
    reference?: HashedUri | undefined;
    reviewRatings?: ReviewRating[] | undefined;
    [k: string]: unknown;
  }

  /**
   * A description of the source for assertion data
   */
  export interface DataSource {
    /**
     * A list of [`Actor`]s associated with this source
     */
    actors?: Actor[] | undefined;
    /**
     * A human-readable string giving details about the source of the assertion data
     */
    details?: string | undefined;
    /**
     * A value from among the enumerated list indicating the source of the assertion
     */
    type: string;
    [k: string]: unknown;
  }

  /**
   * Identifies a person responsible for an action
   */
  export interface Actor {
    /**
     * List of references to W3C Verifiable Credentials
     */
    credentials?: HashedUri[] | undefined;
    /**
     * An identifier for a human actor, used when the "type" is `humanEntry.identified`
     */
    identifier?: string | undefined;
    [k: string]: unknown;
  }

  /**
   * A rating on an Assertion
   *
   * See <https://c2pa.org/specifications/specifications/1.0/specs/C2PA_Specification.html#_claim_review>
   */
  export interface ReviewRating {
    code?: string | undefined;
    explanation: string;
    value: number;
    [k: string]: unknown;
  }

  /**
   * Resource store to contain binary objects referenced from JSON serializable structures
   */
  export interface ResourceStore {
    label?: string | undefined;
    resources: {
      [k: string]: number[];
    };
    [k: string]: unknown;
  }

  /**
   * A `ValidationStatus` struct describes the validation status of a specific part of a manifest
   *
   * See <https://c2pa.org/specifications/specifications/1.0/specs/C2PA_Specification.html#_existing_manifests>
   */
  export interface ValidationStatus {
    code: string;
    explanation?: string | undefined;
    url?: string | undefined;
    [k: string]: unknown;
  }

  /**
   * Holds information about a signature
   */
  export interface SignatureInfo {
    /**
     * human readable issuing authority for this signature
     */
    alg?: SigningAlg | undefined;
    /**
     * The serial number of the certificate
     */
    cert_serial_number?: string | undefined;
    /**
     * human readable issuing authority for this signature
     */
    issuer?: string | undefined;
    /**
     * revocation status of the certificate
     */
    revocation_status?: boolean | undefined;
    /**
     * the time the signature was created
     */
    time?: string | undefined;
    [k: string]: unknown;
  }

  /**
   * From ManifestDefinition.d.ts
   * A Manifest Definition This is used to define a manifest and is used to build a ManifestStore A Manifest is a collection of ingredients and assertions It is used to define a claim that can be signed and embedded into a file
   */
  export interface ManifestDefinition {
    /**
     * A list of assertions
     */
    assertions?: AssertionDefinition[];
    /**
     * Clam Generator Info is always required with at least one entry
     */
    claim_generator_info?: ClaimGeneratorInfo[];
    /**
     * The format of the source file as a MIME type
     */
    format?: string;
    /**
     * A List of ingredients
     */
    ingredients?: Ingredient[];
    /**
     * Instance ID from `xmpMM:InstanceID` in XMP metadata
     */
    instance_id?: string;
    label?: string | undefined;
    /**
     * A list of redactions - URIs to a redacted assertions
     */
    redactions?: string[] | undefined;
    thumbnail?: ResourceRef | undefined;
    /**
     * A human-readable title, generally source filename
     */
    title?: string | undefined;
    /**
     * Optional prefix added to the generated Manifest Label This is typically Internet domain name for the vendor (i.e. `adobe`)
     */
    vendor?: string | undefined;
    [k: string]: unknown;
  }

  export interface AssertionDefinition {
    data: unknown;
    label: string;
    [k: string]: unknown;
  }

  /**
   * Types unique to index.node
   */
  export interface IngredientThumbnail {
    format: string;
    data: Uint8Array;
  }

  export interface IngredientOptions {
    isParent: boolean;
    thumbnail?: IngredientThumbnail;
  }

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
  export interface LocalSigner {
    sign(data: Buffer): Buffer;
    alg(): SigningAlg;
    certs(): Array<Buffer>;
    reserveSize(): number;
    timeAuthorityUrl(): string | undefined;
    signer(): LocalSigner;
  }

  /**
   * A signer that uses a callback to sign data.
   */
  export interface CallbackSigner {
    sign(data: Buffer): Promise<Buffer>;
    alg(): SigningAlg;
    certs(): Array<Buffer>;
    reserveSize(): number;
    timeAuthorityUrl(): string | undefined;
    signer(): CallbackSigner;
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

  export interface Builder {
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
    addIngredient(
      ingredientJson: string,
      ingredient: SourceAsset,
    ): Promise<void>;

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
      signer: LocalSigner,
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
      callbackSigner: CallbackSigner,
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
      signer: LocalSigner,
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
      callbackSigner: IdentityAssertionSigner,
      input: SourceAsset,
      output: DestinationAsset,
    ): Promise<Buffer>;

    /**
     * Getter for the builder's manifest definition
     * @returns The manifest definition
     */
    getManifestDefinition(): ManifestDefinition;

    /**
     * Update a string property of the manifest
     * @returns The manifest definition
     */
    updateManifestProperty(
      property: string,
      value: string | ClaimVersion,
    ): void;
  }

  export interface Reader {
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

  export interface IdentityAssertionSigner {
    /** Add a IdentityAssertionBuilder  to be used when signing the
     * next Manifest
     *
     * IMPORTANT: When sign() is called, the list of
     * IdentityAssertionBuilders will be cleared.
     */
    addIdentityAssertion(
      identityAssertionBuilder: IdentityAssertionBuilder,
    ): void;
  }

  export interface IdentityAssertionBuilder {
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
    builder(): IdentityAssertionBuilder;
  }

  export interface Trustmark {
    /**
     * Encode a watermark into an image.
     * @param image image to be watermarked
     * @param strength number between 0 and 1 indicating how strongly the watermark should be applied
     * @param watermark optional bitstring to be encoded, automatically generated if not provided
     * @returns raw pixel data in RGB8 format (width * height * 3 bytes)
     */
    encode(
      image: Buffer,
      strength: number,
      watermark?: string,
    ): Promise<Buffer>;

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

  // Builder methods
  export function builderNew(): Builder;
  export function builderWithJson(json: string): Builder;
  export function builderSetNoEmbed(noEmbed: boolean): void;
  export function builderSetRemoteUrl(url: string): void;
  export function builderAddAssertion(
    label: string,
    assertion: string,
    assertionKind?: ManifestAssertionKind,
  ): void;
  export function builderAddResource(
    uri: string,
    resource: SourceAsset,
  ): Promise<void>;
  export function builderAddIngredient(
    ingredientJson: string,
    resource: SourceAsset,
  ): Promise<void>;
  export function builderToArchive(asset: DestinationAsset): Promise<void>;
  export function builderFromArchive(asset: SourceAsset): Promise<Builder>;
  export function builderSign(
    signer: LocalSigner,
    input: SourceAsset,
    output: DestinationAsset,
  ): Buffer;
  export function builderSignConfigAsync(
    callback: (data: Buffer) => Promise<Buffer>,
    signerConfig: JsCallbackSignerConfig,
    input: SourceAsset,
    output: DestinationAsset,
  ): Promise<Buffer | { manifest: Buffer; signedAsset: Buffer }>;
  export function builderSignAsync(
    signer: CallbackSigner,
    input: SourceAsset,
    output: DestinationAsset,
  ): Promise<Buffer | { manifest: Buffer; signedAsset: Buffer }>;
  export function builderIdentitySignAsync(
    signer: IdentityAssertionSigner,
    input: SourceAsset,
    output: DestinationAsset,
  ): Promise<Buffer | { manifest: Buffer; signedAsset: Buffer }>;
  export function builderManifestDefinition(): string;
  export function builderUpdateManifestProperty(
    property: string,
    value: string | ClaimVersion,
  ): void;

  // Reader methods
  export function readerFromAsset(asset: SourceAsset): Promise<Reader>;
  export function readerFromManifestDataAndAsset(
    manifestData: Buffer,
    asset: SourceAsset,
  ): Promise<Reader>;
  export function readerJson(): string;
  export function readerRemoteUrl(): string;
  export function readerIsEmbedded(): boolean;
  export function readerResourceToAsset(
    uri: string,
    output: DestinationAsset,
  ): Promise<number>;
  export function readerPostValidateCawg(): Promise<void>;

  // Signers
  export function localSignerNew(
    signcert: Buffer,
    pkey: Buffer,
    signingAlg: SigningAlg,
    tsaUrl?: string,
  ): LocalSigner;
  export function localSignerSign(data: Buffer): Buffer;
  export function localSignerAlg(): SigningAlg;
  export function localSignerCerts(): Array<Buffer>;
  export function localSignerReserveSize(): number;
  export function localSignerTimeAuthorityUrl(): string | undefined;

  export function callbackSignerFromConfig(
    config: CallbackSignerConfig,
    callback: (data: Buffer) => Promise<Buffer>,
  ): CallbackSigner;
  export function callbackSignerConfigFromJs(
    config: JsCallbackSignerConfig,
  ): CallbackSignerConfig;
  export function callbackSignerSign(data: Buffer): Promise<Buffer>;
  export function callbackSignerAlg(): SigningAlg;
  export function callbackSignerCerts(): Array<Buffer>;
  export function callbackSignerReserveSize(): number;
  export function callbackSignerTimeAuthorityUrl(): string | undefined;

  // CAWG Identity
  export function identitySignerNew(
    signer: CallbackSigner,
  ): IdentityAssertionSigner;
  export function identitySignerAddIdentityAssertion(
    identityAssertionBuilder: IdentityAssertionBuilder,
  ): void;
  export function identityBuilderForCredentialHolder(
    credentialHolder: CallbackSigner,
  ): IdentityAssertionBuilder;
  export function identityBuilderAddReferencedAssertions(
    referenced_assertions: Array<string>,
  ): void;
  export function identityBuilderAddRoles(roles: Array<string>): void;

  // Trustmark
  export function trustmarkNew(config: TrustmarkConfig): Promise<Trustmark>;
  export function trustmarkEncode(
    image: Buffer,
    strength: number,
    watermark?: string,
  ): Promise<Buffer>;
  export function trustmarkDecode(image: Buffer): Promise<string>;
}
