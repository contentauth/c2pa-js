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

import * as fs from "fs-extra";
import * as crypto from "crypto";

import { CallbackSigner } from "./Signer.js";
import { Builder } from "./Builder.js";
import { Reader } from "./Reader.js";
import type { JsCallbackSignerConfig, SigningAlg } from "./types.d.ts";
import type { Manifest } from "@contentauth/c2pa-types";

class TestSigner {
  private privateKey: crypto.KeyObject;

  constructor(privateKey: Buffer) {
    this.privateKey = crypto.createPrivateKey({
      key: privateKey,
      format: "pem",
    });
  }

  sign = async (bytes: Buffer): Promise<Buffer> => {
    const sign = crypto.createSign("SHA256");
    sign.update(bytes);
    sign.end();
    const signature = sign.sign(this.privateKey);
    return signature;
  };
}

describe("TestSigner", () => {
  it("should sign data", async () => {
    const signer = new TestSigner(
      await fs.readFile("./tests/fixtures/certs/es256.pem"),
    );
    const bytes = Buffer.from("Hello, World!");
    const signature = await signer.sign(bytes);
    expect(signature.length).toBeGreaterThan(0);
  });
});

describe("CallbackSigner", () => {
  const config: JsCallbackSignerConfig = {
    alg: "es256" as SigningAlg,
    certs: [fs.readFileSync("./tests/fixtures/certs/es256.pub")],
    reserveSize: 10000,
    tsaUrl: "https://timestamp.digicert.com",
    tsaHeaders: [["Content-Type", "application/json"]],
    tsaBody: Buffer.from('{"test": "body"}'),
    directCoseHandling: false,
  };

  it("should create a new instance", () => {
    const signer = CallbackSigner.newSigner(config, async (data) => data);
    expect(signer).toBeDefined();
  });

  it("should sign data", async () => {
    const signer = CallbackSigner.newSigner(config, async (data) => data);
    const data = Buffer.from("test data");
    const signature = await signer.sign(data);
    expect(signature).toBeDefined();
  });

  it("should get algorithm", () => {
    const signer = CallbackSigner.newSigner(config, async (data) => data);
    const alg = signer.alg();
    expect(alg).toBe("es256");
  });

  it("should return certificates", () => {
    const signer = CallbackSigner.newSigner(config, async (data) => data);
    const certs = signer.certs();
    expect(Array.isArray(certs)).toBe(true);
    expect(certs.length).toBeGreaterThan(0);
  });

  it("should return reserve size", () => {
    const signer = CallbackSigner.newSigner(config, async (data) => data);
    expect(signer.reserveSize()).toBe(10000);
  });

  it("should return time authority URL when provided", () => {
    const signer = CallbackSigner.newSigner(config, async (data) => data);
    expect(signer.timeAuthorityUrl()).toBe("https://timestamp.digicert.com");
  });

  it("should return undefined for time authority URL when not provided", async () => {
    const config: JsCallbackSignerConfig = {
      alg: "es256" as SigningAlg,
      certs: [await fs.readFile("./tests/fixtures/certs/es256.pub")],
      reserveSize: 10000,
      tsaUrl: undefined,
      tsaHeaders: undefined,
      tsaBody: undefined,
      directCoseHandling: false,
    };
    const signer = CallbackSigner.newSigner(config, async (data) => data);
    expect(signer.timeAuthorityUrl()).toBeUndefined();
  });

  it("should create valid COSE signature with buffer output", async () => {
    const testSigner = new TestSigner(
      await fs.readFile("./tests/fixtures/certs/es256.pem"),
    );

    const createRawSignatureCallback = () => {
      return async (data: Buffer): Promise<Buffer> => {
        // For directCoseHandling: false, return raw signature data
        // The c2pa SDK will handle COSE wrapping internally
        return await testSigner.sign(data);
      };
    };

    // Create a simple manifest
    const manifestDefinition: Manifest = {
      vendor: "test",
      claim_generator: "test-generator",
      claim_generator_info: [
        {
          name: "c2pa_test",
          version: "1.0.0",
        },
      ],
      title: "Test_Manifest_Buffer",
      format: "image/jpeg",
      instance_id: "5678",
      assertions: [
        {
          label: "org.test.assertion",
          data: { message: "Buffer test with directCoseHandling: false" },
        },
      ],
      resources: { resources: {} },
    };

    const builder = Builder.withJson(manifestDefinition);
    const source = {
      buffer: await fs.readFile("./tests/fixtures/CA.jpg"),
      mimeType: "image/jpeg",
    };

    const config: JsCallbackSignerConfig = {
      alg: "es256" as SigningAlg,
      certs: [fs.readFileSync("./tests/fixtures/certs/es256.pub")],
      reserveSize: 10000,
      tsaUrl: undefined,
      directCoseHandling: false,
    };

    const callback = createRawSignatureCallback();
    const signer = CallbackSigner.newSigner(config, callback);

    // Sign the manifest to buffer
    const dest = { buffer: null };
    await builder.signAsync(signer, source, dest);

    // Read the signed manifest back and verify signature is valid
    const reader = await Reader.fromAsset({
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      buffer: dest.buffer! as Buffer,
      mimeType: "image/jpeg",
    });
    const manifestStore = reader.json();
    const activeManifest = reader.getActive();

    // If validation_status is undefined, the signature is valid
    expect(manifestStore.validation_status).toBeUndefined();
    expect(manifestStore.active_manifest).not.toBeUndefined();
    expect(activeManifest?.title).toBe("Test_Manifest_Buffer");
  });
});
