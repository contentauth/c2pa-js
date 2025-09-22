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
import type {
  BuilderInterface,
  CallbackSignerConfig,
  CallbackSignerInterface,
  ClaimVersion,
  DestinationAsset,
  IdentityAssertionBuilderInterface,
  IdentityAssertionSignerInterface,
  JsCallbackSignerConfig,
  LocalSignerInterface,
  ManifestAssertionKind,
  ReaderInterface,
  SigningAlg,
  SourceAsset,
  TrustConfig,
  TrustmarkConfig,
  TrustmarkInterface,
} from "./types";

declare module "index.node" {
  // Builder methods
  export function builderNew(): BuilderInterface;
  export function builderWithJson(json: string): BuilderInterface;
  export function builderSetNoEmbed(noEmbed: boolean): void;
  export function builderSetRemoteUrl(url: string): void;
  export function builderAddAssertion(
    label: string,
    assertion: unknown,
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
  export function builderFromArchive(
    asset: SourceAsset,
  ): Promise<BuilderInterface>;
  export function builderSign(
    signer: LocalSignerInterface,
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
    signer: CallbackSignerInterface,
    input: SourceAsset,
    output: DestinationAsset,
  ): Promise<Buffer | { manifest: Buffer; signedAsset: Buffer }>;
  export function builderIdentitySignAsync(
    signer: IdentityAssertionSignerInterface,
    input: SourceAsset,
    output: DestinationAsset,
  ): Promise<Buffer | { manifest: Buffer; signedAsset: Buffer }>;
  export function builderManifestDefinition(): string;
  export function builderUpdateManifestProperty(
    property: string,
    value: string | ClaimVersion,
  ): void;

  // Reader methods
  export function readerFromAsset(asset: SourceAsset): Promise<ReaderInterface>;
  export function readerFromManifestDataAndAsset(
    manifestData: Buffer,
    asset: SourceAsset,
  ): Promise<ReaderInterface>;
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
  ): LocalSignerInterface;
  export function localSignerSign(data: Buffer): Buffer;
  export function localSignerAlg(): SigningAlg;
  export function localSignerCerts(): Array<Buffer>;
  export function localSignerReserveSize(): number;
  export function localSignerTimeAuthorityUrl(): string | undefined;

  export function callbackSignerFromConfig(
    config: CallbackSignerConfig,
    callback: (data: Buffer) => Promise<Buffer>,
  ): CallbackSignerInterface;
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
    signer: CallbackSignerInterface,
  ): IdentityAssertionSignerInterface;
  export function identitySignerAddIdentityAssertion(
    identityAssertionBuilder: IdentityAssertionBuilderInterface,
  ): void;
  export function identityBuilderForCredentialHolder(
    credentialHolder: CallbackSignerInterface,
  ): IdentityAssertionBuilderInterface;
  export function identityBuilderAddReferencedAssertions(
    referenced_assertions: Array<string>,
  ): void;
  export function identityBuilderAddRoles(roles: Array<string>): void;

  // Trustmark
  export function trustmarkNew(
    config: TrustmarkConfig,
  ): Promise<TrustmarkInterface>;
  export function trustmarkEncode(
    image: Buffer,
    strength: number,
    watermark?: string,
  ): Promise<Buffer>;
  export function trustmarkDecode(image: Buffer): Promise<string>;

  // Settings API
  export function loadSettings(json: string): void;
  export function loadSettingsToml(toml: string): void;
  export function getSettingsJson(): string;
  export function loadTrustConfig(trustConfigJson: string): void;
  export function loadCawgTrustConfig(trustConfigJson: string): void;
  export function getTrustConfig(): string;
  export function getCawgTrustConfig(): string;
}
