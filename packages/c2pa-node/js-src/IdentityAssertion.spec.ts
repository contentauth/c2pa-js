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

/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { CallbackSigner } from "./Signer";
import { Reader } from "./Reader";
import { Builder } from "./Builder";
import {
  IdentityAssertionBuilder,
  IdentityAssertionSigner,
} from "./IdentityAssertion";
import type {
  JsCallbackSignerConfig,
  DestinationBufferAsset,
  SigningAlg,
} from "./types";
import type { Manifest } from "@contentauth/toolkit";
import * as fs from "fs-extra";
import * as crypto from "crypto";

// TODO: move to a separate test file
class TestSigner {
  private privateKey: crypto.KeyObject;

  constructor(privateKey: Buffer) {
    this.privateKey = crypto.createPrivateKey({
      key: privateKey,
      format: "pem",
    });
  }

  sign = async (bytes: Buffer): Promise<Buffer> => {
    return crypto.sign(null, bytes, this.privateKey);
  };
}

describe("IdentityAssertionBuilder", () => {
  const manifestDefinition: Manifest = {
    vendor: "test",
    claim_generator_info: [
      {
        name: "c2pa_test",
        version: "2.0.0",
      },
    ],
    claim_generator: "c2pa_test",
    title: "Test_Manifest",
    format: "image/jpeg",
    instance_id: "1234",
    thumbnail: { format: "", identifier: "" },
    resources: { resources: {} },
    ingredients: [
      {
        title: "Test",
        format: "image/jpeg",
        instance_id: "12345",
        relationship: "componentOf",
        thumbnail: { format: "", identifier: "" },
        resources: { resources: {} },
      },
    ],
    assertions: [
      {
        label: "c2pa.actions",
        data: {
          metadata: {
            actions: [
              {
                action: "c2pa.created",
                digitalSourceType:
                  "http://cv.iptc.org/newscodes/digitalsourcetype/digitalCapture",
              },
            ],
          },
        },
      },
      {
        label: "cawg.training-mining",
        data: {
          metadata: {
            "cawg.ai_inference": {
              use: "notAllowed",
            },
            "cawg.ai_generative_training": {
              use: "notAllowed",
            },
          },
        },
      },
    ],
  };

  it("should build an Identity Assertion Signer", async () => {
    // Read certificate files once
    const c2paPrivateKey = await fs.readFile(
      "./tests/fixtures/certs/es256.pem",
    );
    const c2paPublicKey = await fs.readFile("./tests/fixtures/certs/es256.pub");
    const cawgPrivateKey = await fs.readFile(
      "./tests/fixtures/certs/ed25519.pem",
    );
    const cawgPublicKey = await fs.readFile(
      "./tests/fixtures/certs/ed25519.pub",
    );

    // Create signer configurations
    const c2paConfig: JsCallbackSignerConfig = {
      alg: "es256" as SigningAlg,
      certs: [c2paPublicKey],
      reserveSize: 10000,
      tsaUrl: undefined,
      tsaHeaders: undefined,
      tsaBody: undefined,
    };

    const cawgConfig: JsCallbackSignerConfig = {
      alg: "ed25519" as SigningAlg,
      certs: [cawgPublicKey],
      reserveSize: 10000,
      tsaUrl: undefined,
      tsaHeaders: undefined,
      tsaBody: undefined,
    };

    // Create signers
    const c2paTestSigner = new TestSigner(c2paPrivateKey);
    const cawgTestSigner = new TestSigner(cawgPrivateKey);
    const c2paSigner = CallbackSigner.newSigner(
      c2paConfig,
      c2paTestSigner.sign,
    );
    const cawgSigner = CallbackSigner.newSigner(
      cawgConfig,
      cawgTestSigner.sign,
    );

    const source = {
      buffer: await fs.readFile("./tests/fixtures/CA.jpg"),
      mimeType: "jpeg",
    };
    const dest: DestinationBufferAsset = {
      buffer: null,
    };

    // Create the manifest builder
    const builder = Builder.withJson(manifestDefinition);

    // Create and configure the identity assertion
    const ia_signer = IdentityAssertionSigner.new(c2paSigner);
    const iab =
      await IdentityAssertionBuilder.identityBuilderForCredentialHolder(
        cawgSigner,
      );
    iab.addReferencedAssertions(["cawg.training-mining"]);
    ia_signer.addIdentityAssertion(iab);

    // Sign the manifest
    await builder.signAsync(c2paSigner, source, dest);

    // Verify the manifest
    const reader = await Reader.fromAsset({
      buffer: dest.buffer! as Buffer,
      mimeType: "jpeg",
    });
    await reader.postValidateCawg();
  });
});
