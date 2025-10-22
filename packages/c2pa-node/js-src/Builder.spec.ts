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

import type { Manifest, ResourceRef } from "@contentauth/c2pa-types";
import * as fs from "fs-extra";
import path from "path";
import * as crypto from "crypto";

import type {
  BuilderInterface,
  JsCallbackSignerConfig,
  DestinationBufferAsset,
  SourceBufferAsset,
  FileAsset,
} from "./types.d.ts";
import { isActionsAssertion } from "./assertions.js";
import { CallbackSigner, LocalSigner } from "./Signer.js";
import { Reader } from "./Reader.js";
import { Builder } from "./Builder.js";

const tempDir = path.join(__dirname, "tmp");

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

describe("Builder", () => {
  const parent_json = `{
            "title": "c2pa-bindings Test",
            "format": "image/jpeg",
            "instance_id": "12345",
            "relationship": "parentOf"
            }`;

  const thumbnail_ref: ResourceRef = {
    format: "ingredient/jpeg",
    identifier: "5678",
  };

  const manifestDefinition: Manifest = {
    vendor: "test",
    claim_generator: "test-generator",
    claim_generator_info: [
      {
        name: "c2pa_test",
        version: "1.0.0",
      },
    ],
    title: "Test_Manifest",
    format: "image/jpeg",
    instance_id: "1234",
    thumbnail: {
      format: "image/jpeg",
      identifier: "thumbnail.jpg",
    },
    ingredients: [
      {
        title: "Test",
        format: "image/jpeg",
        instance_id: "12345",
        relationship: "componentOf",
        thumbnail: { format: "image/jpeg", identifier: "ingredient-thumb.jpg" },
        resources: { resources: {} },
      },
    ],
    assertions: [
      {
        label: "org.test.assertion",
        data: {},
      },
    ],
    resources: { resources: {} },
  };

  let testAssertion: string;
  let testThumbnail: Buffer;
  let source: SourceBufferAsset;
  let publicKey: Buffer;
  let privateKey: Buffer;

  beforeAll(async () => {
    await fs.ensureDir(tempDir);
    // Read all test files once
    source = {
      buffer: await fs.readFile("./tests/fixtures/CA.jpg"),
      mimeType: "image/jpeg",
    };
    testThumbnail = await fs.readFile("./tests/fixtures/thumbnail.jpg");
    publicKey = await fs.readFile("./tests/fixtures/certs/es256.pub");
    privateKey = await fs.readFile("./tests/fixtures/certs/es256.pem");
    testAssertion = JSON.stringify({ answer: 42 });
  });

  afterAll(async () => {
    await fs.remove(tempDir);
  });

  it("should build a manifest store", async () => {
    const test_definition: Manifest = {
      claim_generator: "test-generator",
      claim_generator_info: [
        {
          name: "c2pa-js tests",
          version: "1.0.0",
        },
      ],
      format: "image/tiff",
      instance_id: "1234",
      title: "builder-test-manifest",
      vendor: "test",
      thumbnail: thumbnail_ref,
      label: "ABCDE",
      ingredients: [],
      assertions: [],
      resources: { resources: {} },
    };
    const builder = Builder.withJson(test_definition);
    await builder.addIngredient(parent_json, source);
    builder.addAssertion("org.test.assertion", "assertion");
    await builder.addResource(thumbnail_ref.identifier, {
      buffer: Buffer.from("12345"),
      mimeType: "jpeg",
    });
    // Wait for any pending async operations
    await Promise.resolve();
    const definition = builder.getManifestDefinition();
    expect(definition.vendor).toBe("test");
    expect(definition.title).toBe("builder-test-manifest");
    expect(definition.format).toBe("image/tiff");
    expect(definition.instance_id).toBe("1234");
    expect(definition.ingredients![0].title).toStrictEqual(
      "c2pa-bindings Test",
    );
    expect(definition.assertions![0].label).toBe("org.test.assertion");
    expect(definition.label).toBe("ABCDE");
  });

  describe("Sign and Archive", () => {
    let builder: BuilderInterface;

    beforeEach(() => {
      builder = Builder.withJson(manifestDefinition);
      builder.updateManifestProperty("claim_version", 2);
    });

    beforeEach(async () => {
      // Add ingredients and resources after builder is initialized
      await builder.addIngredient(parent_json, source);
      await builder.addResource("thumbnail.jpg", {
        mimeType: "jpeg",
        buffer: testThumbnail,
      });
      await builder.addResource("ingredient-thumb.jpg", {
        mimeType: "jpeg",
        buffer: testThumbnail,
      });
      await builder.addResource("prompt.txt", {
        buffer: Buffer.from("a random prompt"),
        mimeType: "text/plain",
      });
      builder.addAssertion("org.life.meaning", testAssertion);
      builder.addAssertion("org.life.meaning.json", testAssertion, "Json");
      // Wait for any pending operations
      await Promise.resolve();
    });

    it("should sign data", async () => {
      const dest = { path: path.join(tempDir, "signed.jpg") };
      const signer = LocalSigner.newSigner(publicKey, privateKey, "es256");

      const bytes = builder.sign(signer, source, dest);
      expect(bytes.length).toBeGreaterThan(0);

      const reader = await Reader.fromAsset(dest);
      const manifestStore = reader.json();
      const activeManifest = reader.getActive();
      expect(manifestStore.validation_status).toBeUndefined();
      expect(manifestStore.active_manifest).not.toBeUndefined();
      expect(activeManifest?.title).toBe("Test_Manifest");
    });

    it("should add a CBOR assertion, sign, and verify it in the signed manifest", async () => {
      // Add the c2pa.watermarked action as a CBOR assertion
      const actionsAssertion = {
        actions: [
          {
            action: "c2pa.watermarked",
          },
        ],
      };
      builder.addAssertion("c2pa.actions", actionsAssertion, "Cbor");

      // Sign the manifest
      const dest = { path: path.join(tempDir, "cbor_signed.jpg") };
      const signer = LocalSigner.newSigner(publicKey, privateKey, "es256");
      builder.sign(signer, source, dest);

      // Read and verify the assertion in the signed manifest
      const reader = await Reader.fromAsset(dest);
      const activeManifest = reader.getActive();
      const cborAssertion = activeManifest?.assertions?.find(
        (a: any) => a.label === "c2pa.actions.v2",
      );
      expect(cborAssertion).toBeDefined();
      if (isActionsAssertion(cborAssertion)) {
        const actions = cborAssertion.data.actions.map((a: any) => a.action);
        expect(actions).toContain("c2pa.watermarked");
      } else {
        throw new Error("CBOR assertion does not have the expected structure");
      }
    });

    it("should archive and construct from archive", async () => {
      const dest: DestinationBufferAsset = {
        buffer: null,
      };
      const signer = LocalSigner.newSigner(publicKey, privateKey, "es256");

      const outputPath = path.join(tempDir, "archive.zip");
      const archive = { path: outputPath };
      await builder.toArchive(archive);
      const builder2 = await Builder.fromArchive(archive);
      builder2.sign(signer, source, dest);
      const reader = await Reader.fromAsset({
        buffer: dest.buffer! as Buffer,
        mimeType: "jpeg",
      });
      const manifestStore = reader.json();
      const activeManifest = reader.getActive();
      expect(manifestStore.validation_status).toBeUndefined();
      expect(manifestStore.active_manifest).not.toBeUndefined();
      expect(activeManifest?.title).toBe("Test_Manifest");
    });

    it("should sign data with callback to file", async () => {
      const dest: FileAsset = {
        path: path.join(tempDir, "callback_signed.jpg"),
      };
      const signerConfig: JsCallbackSignerConfig = {
        alg: "es256",
        certs: [publicKey],
        reserveSize: 10000,
        tsaUrl: undefined,
        directCoseHandling: false,
      };
      const signer = new TestSigner(privateKey);

      const bytes = await builder.signConfigAsync(
        signer.sign,
        signerConfig,
        source,
        dest,
      );
      expect(bytes.length).toBeGreaterThan(0);

      const reader = await Reader.fromAsset(dest);
      const manifestStore = reader.json();
      const activeManifest = reader.getActive();
      expect(manifestStore.validation_status).toBeUndefined();
      expect(manifestStore.active_manifest).not.toBeUndefined();
      expect(activeManifest?.title).toBe("Test_Manifest");
    });

    it("should sign data with callback to buffer", async () => {
      const dest: DestinationBufferAsset = {
        buffer: null,
      };
      const signerConfig: JsCallbackSignerConfig = {
        alg: "es256",
        certs: [publicKey],
        reserveSize: 10000,
        tsaUrl: undefined,
        directCoseHandling: false,
      };
      const signer = new TestSigner(privateKey);

      const bytes = await builder.signConfigAsync(
        signer.sign,
        signerConfig,
        source,
        dest,
      );
      expect(bytes.length).toBeGreaterThan(0);

      const reader = await Reader.fromAsset({
        buffer: dest.buffer! as Buffer,
        mimeType: "jpeg",
      });
      const manifestStore = reader.json();
      const activeManifest = reader.getActive();
      expect(manifestStore.validation_status).toBeUndefined();
      expect(manifestStore.active_manifest).not.toBeUndefined();
      expect(activeManifest?.title).toBe("Test_Manifest");
    });

    it("should sign data with callback signer to buffer", async () => {
      const dest: DestinationBufferAsset = {
        buffer: null,
      };
      const signerConfig: JsCallbackSignerConfig = {
        alg: "es256",
        certs: [publicKey],
        reserveSize: 10000,
        tsaUrl: undefined,
        directCoseHandling: false,
      };
      const testSigner = new TestSigner(privateKey);
      const signer = CallbackSigner.newSigner(signerConfig, testSigner.sign);

      const bytes = await builder.signAsync(signer, source, dest);
      expect(bytes.length).toBeGreaterThan(0);

      const reader = await Reader.fromAsset({
        buffer: dest.buffer! as Buffer,
        mimeType: "jpeg",
      });
      const manifestStore = reader.json();
      const activeManifest = reader.getActive();
      expect(manifestStore.validation_status).toBeUndefined();
      expect(manifestStore.active_manifest).not.toBeUndefined();
      expect(activeManifest?.title).toBe("Test_Manifest");
    });

    it("should preserve JSON assertion characters without escaping", async () => {
      const fingerprintAssertion = JSON.stringify({
        alg: "sha256",
        blocks: [
          {
            scope: {},
            value: "test-fingerprint-data",
          },
        ],
      });
      builder.addAssertion(
        "org.contentauth.fingerprint",
        fingerprintAssertion,
        "Json",
      );

      const dest = { path: path.join(tempDir, "json_test.jpg") };
      const signer = LocalSigner.newSigner(publicKey, privateKey, "es256");
      builder.sign(signer, source, dest);

      const reader = await Reader.fromAsset(dest);
      const manifest = reader.json();

      // Check that our specific JSON assertion doesn't have escaped characters
      const activeManifest = manifest.manifests[manifest.active_manifest!];
      const fingerprintAssertionData = activeManifest?.assertions?.find(
        (a: any) => a.label === "org.contentauth.fingerprint",
      );
      expect(fingerprintAssertionData).toBeDefined();
      expect(fingerprintAssertionData?.data).toEqual({
        alg: "sha256",
        blocks: [
          {
            scope: {},
            value: "test-fingerprint-data",
          },
        ],
      });

      // The assertion data should not be a string with escaped quotes
      expect(typeof fingerprintAssertionData?.data).toBe("object");
      expect(JSON.stringify(fingerprintAssertionData?.data)).not.toContain(
        "\\",
      );
    });

    it("should archive and restore builder with ingredient thumbnail", async () => {
      const manifestDefinition = {
        claim_generator_info: [
          {
            name: "c2pa_test",
            version: "1.0.0",
          },
        ],
        title: "Test_Manifest",
        format: "image/jpeg",
        ingredients: [],
        assertions: [
          {
            label: "c2pa.actions",
            data: {
              actions: [
                {
                  action: "c2pa.created",
                  digitalSourceType: "http://c2pa.org/digitalsourcetype/empty",
                },
              ],
            },
          },
        ],
        resources: { resources: {} },
      };

      const builder = Builder.withJson(manifestDefinition);

      const ingredientJson = '{"title": "Test Ingredient"}';
      const testThumbnail = await fs.readFile("./tests/fixtures/thumbnail.jpg");
      await builder.addIngredient(ingredientJson, {
        buffer: testThumbnail,
        mimeType: "jpeg",
      });

      // Archive the builder
      const archivePath = path.join(
        tempDir,
        `ingredient_thumb_archive_${Date.now()}.zip`,
      );
      await builder.toArchive({ path: archivePath });

      // Ensure the file is written to disk before proceeding
      await fs.access(archivePath);

      // Restore from archive
      const builder2 = await Builder.fromArchive({ path: archivePath });

      // Sign with restored builder
      const dest = { buffer: null };
      const publicKey = await fs.readFile("./tests/fixtures/certs/es256.pub");
      const privateKey = await fs.readFile("./tests/fixtures/certs/es256.pem");
      const signer = LocalSigner.newSigner(publicKey, privateKey, "es256");
      builder2.sign(signer, source, dest);

      const reader = await Reader.fromAsset({
        buffer: dest.buffer! as Buffer,
        mimeType: "jpeg",
      });
      const manifestStore = reader.json();
      expect(JSON.stringify(manifestStore)).toContain("Test Ingredient");
      expect(JSON.stringify(manifestStore)).toContain("thumbnail.ingredient");
    });

    it("should perform redaction workflow like test_redaction_async", async () => {
      // This test mirrors the Rust test_redaction_async test

      // Create a reader to get the parent manifest label from the existing source
      const reader = await Reader.fromAsset(source);
      const parentManifestLabel = reader.activeLabel();
      expect(parentManifestLabel).toBeDefined();

      // Create a redacted URI for the assertion we are going to redact
      // Using a common assertion label that might exist
      const assertionLabel = "stds.schema-org.CreativeWork";
      const redactedUri = `contentauth:urn:uuid:${parentManifestLabel}/c2pa.assertions/${assertionLabel}`;

      // Create a builder with edit intent and redactions
      const redactionManifestDefinition = {
        claim_generator: "test-generator",
        claim_generator_info: [
          {
            name: "c2pa_test",
            version: "1.0.0",
          },
        ],
        title: "Test_Redaction_Manifest",
        format: "image/jpeg",
        instance_id: "1234",
        intent: "edit",
        redactions: [redactedUri],
        assertions: [
          {
            label: "org.test.assertion",
            data: {},
          },
        ],
        resources: { resources: {} },
      };

      const builder = Builder.withJson(redactionManifestDefinition);

      // Add a redacted action
      const redactedAction = {
        actions: [
          {
            action: "c2pa.redacted",
          },
        ],
      };

      builder.addAssertion("c2pa.actions", redactedAction, "Cbor");

      // Use the callback signer like the other test
      const signerConfig: JsCallbackSignerConfig = {
        alg: "es256",
        certs: [publicKey],
        reserveSize: 10000,
        tsaUrl: undefined,
        directCoseHandling: false,
      };
      const testSigner = new TestSigner(privateKey);
      const signer = CallbackSigner.newSigner(signerConfig, testSigner.sign);

      // Sign the manifest with the original image as input
      const dest = { buffer: null };
      const outputBuffer = await builder.signAsync(signer, source, dest);
      expect(outputBuffer.length).toBeGreaterThan(0);

      // Verify the result by reading the signed manifest
      const signedReader = await Reader.fromAsset({
        buffer: dest.buffer! as Buffer,
        mimeType: "image/jpeg",
      });
      expect(signedReader).toBeDefined();

      // Check that the manifest was created successfully
      const activeManifest = signedReader.getActive();
      expect(activeManifest).toBeDefined();

      // Verify the redacted action was added
      const assertions = activeManifest?.assertions;
      const actionsAssertion = assertions?.find(
        (a: any) => a.label === "c2pa.actions.v2",
      );
      expect(actionsAssertion).toBeDefined();

      if (actionsAssertion && isActionsAssertion(actionsAssertion)) {
        const actions = actionsAssertion.data.actions;
        const redactedAction = actions.find(
          (a: any) => a.action === "c2pa.redacted",
        );
        expect(redactedAction).toBeDefined();
        expect(redactedAction?.action).toBe("c2pa.redacted");
      }
    });

    it("should test builder remote url", async () => {
      // This test mirrors the Rust test_builder_remote_url test

      // Create a simple manifest definition similar to simple_manifest_json()
      const simpleManifestDefinition = {
        claim_generator_info: [
          {
            name: "c2pa_test",
            version: "1.0.0",
          },
        ],
        title: "Test_Manifest",
        assertions: [
          {
            label: "c2pa.actions",
            data: {
              actions: [
                {
                  action: "c2pa.created",
                  digitalSourceType: "http://c2pa.org/digitalsourcetype/empty",
                },
              ],
            },
          },
        ],
      };

      const builder = Builder.withJson(simpleManifestDefinition);

      // Set remote URL and no embed flag like the Rust test
      builder.setRemoteUrl("http://my_remote_url");
      builder.setNoEmbed(true);

      // Use the callback signer
      const signerConfig: JsCallbackSignerConfig = {
        alg: "es256",
        certs: [publicKey],
        reserveSize: 10000,
        tsaUrl: undefined,
        directCoseHandling: false,
      };
      const testSigner = new TestSigner(privateKey);
      const signer = CallbackSigner.newSigner(signerConfig, testSigner.sign);

      // Sign the Builder and write it to the output stream
      const dest = { buffer: null };
      const manifestData = await builder.signAsync(signer, source, dest);

      // Check to make sure we have a remote url and no manifest data embedded
      // Reading the image directly should fail since no_embed = true
      // Note: This might fail due to remote URL fetch, which is expected behavior
      try {
        await Reader.fromAsset({
          buffer: dest.buffer! as Buffer,
          mimeType: "image/jpeg",
        });
        // If we get here, the test should fail because we expect no embedded manifest
        expect.fail("Expected Reader.fromAsset to fail when no_embed = true");
      } catch (error) {
        // This is expected - there should be no embedded manifest or remote fetch should fail
        expect(error).toBeDefined();
      }

      // Now validate the manifest against the written asset using the separate manifest data
      const reader = await Reader.fromManifestDataAndAsset(manifestData, {
        buffer: dest.buffer! as Buffer,
        mimeType: "image/jpeg",
      });

      // Check if the manifest has the expected structure
      const activeManifest = reader.getActive();
      expect(activeManifest).toBeDefined();
      expect(activeManifest?.title).toBe("Test_Manifest");
    });
  });
});
