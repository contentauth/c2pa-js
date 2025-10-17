// Copyright 2025 Adobe. All rights reserved.
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

use neon::prelude::*;

mod asset;
mod error;
mod runtime;
mod settings;
mod utils;

pub mod neon_builder;
pub mod neon_credential_holder;
pub mod neon_identity_assertion_builder;
pub mod neon_identity_assertion_signer;
pub mod neon_reader;
pub mod neon_signer;
pub mod neon_trustmark;

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    // Builder
    cx.export_function("builderNew", neon_builder::NeonBuilder::new)?;
    cx.export_function("builderWithJson", neon_builder::NeonBuilder::with_json)?;
    cx.export_function("builderSetNoEmbed", neon_builder::NeonBuilder::set_no_embed)?;
    cx.export_function(
        "builderSetRemote_url",
        neon_builder::NeonBuilder::set_remote_url,
    )?;
    cx.export_function(
        "builderAddAssertion",
        neon_builder::NeonBuilder::add_assertion,
    )?;
    cx.export_function(
        "builderAddResource",
        neon_builder::NeonBuilder::add_resource,
    )?;
    cx.export_function(
        "builderAddIngredient",
        neon_builder::NeonBuilder::add_ingredient,
    )?;
    cx.export_function("builderToArchive", neon_builder::NeonBuilder::to_archive)?;
    cx.export_function(
        "builderFromArchive",
        neon_builder::NeonBuilder::from_archive,
    )?;
    cx.export_function("builderSign", neon_builder::NeonBuilder::sign)?;
    cx.export_function(
        "builderSignConfigAsync",
        neon_builder::NeonBuilder::sign_config_async,
    )?;
    cx.export_function("builderSignAsync", neon_builder::NeonBuilder::sign_async)?;
    cx.export_function(
        "builderIdentitySignAsync",
        neon_builder::NeonBuilder::identity_sign_async,
    )?;
    cx.export_function(
        "builderManifestDefinition",
        neon_builder::NeonBuilder::manifest_definition,
    )?;
    cx.export_function(
        "builderUpdateManifestProperty",
        neon_builder::NeonBuilder::update_manifest_property,
    )?;

    // Reader
    cx.export_function("readerNew", neon_reader::NeonReader::new)?;
    cx.export_function("readerFromAsset", neon_reader::NeonReader::from_stream)?;
    cx.export_function(
        "readerFromManifestDataAndAsset",
        neon_reader::NeonReader::from_manifest_data_and_asset,
    )?;
    cx.export_function(
        "readerFromManifestDataAndFile",
        neon_reader::NeonReader::from_manifest_data_and_asset,
    )?;
    cx.export_function("readerJson", neon_reader::NeonReader::json)?;
    cx.export_function("readerRemoteUrl", neon_reader::NeonReader::remote_url)?;
    cx.export_function("readerIsEmbedded", neon_reader::NeonReader::is_embedded)?;
    cx.export_function(
        "readerResourceToAsset",
        neon_reader::NeonReader::resource_to_asset,
    )?;
    cx.export_function(
        "readerPostValidateCawg",
        neon_reader::NeonReader::post_validate_cawg,
    )?;

    // Signers
    cx.export_function("localSignerNew", neon_signer::NeonLocalSigner::new)?;
    cx.export_function("localSignerSign", neon_signer::NeonLocalSigner::sign)?;
    cx.export_function("localSignerAlg", neon_signer::NeonLocalSigner::alg)?;
    cx.export_function("localSignerCerts", neon_signer::NeonLocalSigner::certs)?;
    cx.export_function(
        "localSignerReserveSize",
        neon_signer::NeonLocalSigner::reserve_size,
    )?;
    cx.export_function(
        "localSignerTimeAuthorityUrl",
        neon_signer::NeonLocalSigner::time_authority_url,
    )?;
    cx.export_function(
        "callbackSignerFromConfig",
        neon_signer::NeonCallbackSigner::from_config,
    )?;
    cx.export_function(
        "callbackSignerConfigFromJs",
        neon_signer::callback_signer_config_from_js,
    )?;
    cx.export_function("callbackSignerSign", neon_signer::NeonCallbackSigner::sign)?;
    cx.export_function("callbackSignerAlg", neon_signer::NeonCallbackSigner::alg)?;
    cx.export_function(
        "callbackSignerCerts",
        neon_signer::NeonCallbackSigner::certs,
    )?;
    cx.export_function(
        "callbackSignerReserveSize",
        neon_signer::NeonCallbackSigner::reserve_size,
    )?;
    cx.export_function(
        "callbackSignerTimeAuthorityUrl",
        neon_signer::NeonCallbackSigner::time_authority_url,
    )?;
    cx.export_function(
        "callbackSignerDirectCoseHandling",
        neon_signer::NeonCallbackSigner::direct_cose_handling,
    )?;

    // Identity Assertions
    cx.export_function(
        "identitySignerNew",
        neon_identity_assertion_signer::NeonIdentityAssertionSigner::new,
    )?;
    cx.export_function(
        "identitySignerAddIdentityAssertion",
        neon_identity_assertion_signer::NeonIdentityAssertionSigner::add_identity_assertion,
    )?;
    cx.export_function(
        "identityBuilderForCredentialHolder",
        neon_identity_assertion_builder::NeonIdentityAssertionBuilder::for_credential_holder,
    )?;
    cx.export_function(
        "identityBuilderAddReferencedAssertions",
        neon_identity_assertion_builder::NeonIdentityAssertionBuilder::add_referenced_assertions,
    )?;
    cx.export_function(
        "identityBuilderAddRoles",
        neon_identity_assertion_builder::NeonIdentityAssertionBuilder::add_roles,
    )?;
    cx.export_function(
        "newCallbackCredentialHolder",
        neon_credential_holder::NeonCallbackCredentialHolder::from_js,
    )?;

    // Trustmark
    cx.export_function(
        "trustmarkNew",
        neon_trustmark::NeonTrustmark::new_from_config,
    )?;
    cx.export_function("trustmarkEncode", neon_trustmark::NeonTrustmark::encode)?;
    cx.export_function("trustmarkDecode", neon_trustmark::NeonTrustmark::decode)?;

    // Settings
    cx.export_function("loadSettings", settings::load_settings)?;
    cx.export_function("loadSettingsToml", settings::load_settings_toml)?;
    cx.export_function("getSettingsJson", settings::get_settings_json)?;

    // Trust Settings
    cx.export_function("loadTrustConfig", settings::load_trust_config)?;
    cx.export_function("loadCawgTrustConfig", settings::load_cawg_trust_config)?;
    cx.export_function("getTrustConfig", settings::get_trust_config)?;
    cx.export_function("getCawgTrustConfig", settings::get_cawg_trust_config)?;

    // Verify Settings
    cx.export_function("loadVerifyConfig", settings::load_verify_config)?;
    cx.export_function("getVerifyConfig", settings::get_verify_config)?;

    Ok(())
}
