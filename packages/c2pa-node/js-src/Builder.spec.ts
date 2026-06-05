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
  C2paSettings,
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
      expect(reader).not.toBeNull();
      const manifestStore = reader!.json();
      const activeManifest = reader!.getActive();
      expect(manifestStore.validation_status![0].code).toBe(
        "signingCredential.untrusted",
      );
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
      expect(reader).not.toBeNull();
      const activeManifest = reader!.getActive();
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
      expect(reader).not.toBeNull();
      const manifestStore = reader!.json();
      const activeManifest = reader!.getActive();
      expect(manifestStore.validation_status![0].code).toBe(
        "signingCredential.untrusted",
      );
      expect(manifestStore.active_manifest).not.toBeUndefined();
      expect(activeManifest?.title).toBe("Test_Manifest");
    });

    it("should populate buffer when archiving to buffer", async () => {
      const archive: DestinationBufferAsset = {
        buffer: null,
      };
      await builder.toArchive(archive);
      expect(archive.buffer).not.toBeNull();
      expect(archive.buffer!.length).toBeGreaterThan(0);
    });

    it("should write archive to file", async () => {
      const archivePath = path.join(tempDir, "archive_file_test.zip");
      const archive = { path: archivePath };
      await builder.toArchive(archive);

      // Verify file was created and has content
      expect(await fs.pathExists(archivePath)).toBe(true);
      const stats = await fs.stat(archivePath);
      expect(stats.size).toBeGreaterThan(0);
    });

    it("should construct reader directly from builder archive buffer", async () => {
      const settings: C2paSettings = JSON.stringify({
        builder: {
          generate_c2pa_archive: true,
        },
        verify: {
          verify_after_reading: false,
        },
      });
      // Create a builder
      const simpleManifestDefinition = {
        claim_generator_info: [
          {
            name: "c2pa_test",
            version: "1.0.0",
          },
        ],
        title: "Test_Manifest",
        format: "image/jpeg",
        assertions: [],
        resources: { resources: {} },
      };

      const testBuilder = Builder.withJson(simpleManifestDefinition, settings);

      // Add an ingredient
      await testBuilder.addIngredient(parent_json, source);

      // Create an archive from the builder written to a buffer
      const archive: DestinationBufferAsset = {
        buffer: null,
      };
      await testBuilder.toArchive(archive);

      // Verify buffer was populated
      expect(archive.buffer).not.toBeNull();
      expect(archive.buffer!.length).toBeGreaterThan(0);

      // Construct a reader from the builder archive with mime-type "application/c2pa"
      const reader = await Reader.fromAsset(
        {
          buffer: archive.buffer! as Buffer,
          mimeType: "application/c2pa",
        },
        settings,
      );
      expect(reader).not.toBeNull();
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
      expect(reader).not.toBeNull();
      const manifestStore = reader!.json();
      const activeManifest = reader!.getActive();
      expect(manifestStore.validation_status![0].code).toBe(
        "signingCredential.untrusted",
      );
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
      expect(reader).not.toBeNull();
      const manifestStore = reader!.json();
      const activeManifest = reader!.getActive();
      expect(manifestStore.validation_status![0].code).toBe(
        "signingCredential.untrusted",
      );
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
      expect(reader).not.toBeNull();
      const manifestStore = reader!.json();
      const activeManifest = reader!.getActive();
      expect(manifestStore.validation_status![0].code).toBe(
        "signingCredential.untrusted",
      );
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
      expect(reader).not.toBeNull();
      const manifest = reader!.json();

      // Check that our specific JSON assertion doesn't have escaped characters
      const activeManifest = manifest.manifests![manifest.active_manifest!];
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
      expect(reader).not.toBeNull();
      const manifestStore = reader!.json();
      expect(JSON.stringify(manifestStore)).toContain("Test Ingredient");
      expect(JSON.stringify(manifestStore)).toContain("thumbnail.ingredient");
    });

    it("should add ingredient with custom metadata", async () => {
      const builder = Builder.new();
      const ingredient = {
        title: "Test Ingredient",
        format: "image/jpeg",
        instance_id: "ingredient-12345",
        relationship: "componentOf",
        metadata: {
          customString: "my custom value",
          customNumber: 42,
          customBool: true,
          customObject: {
            nested: "value",
            count: 123,
          },
          customArray: ["item1", "item2", "item3"],
        },
      };
      await builder.addIngredient(JSON.stringify(ingredient));

      const definition = builder.getManifestDefinition();
      expect(definition.ingredients).toHaveLength(1);
      expect(definition.ingredients![0]).toMatchObject(ingredient);
    });

    it("should redact a thumbnail from an ingredient manifest", async () => {
      const signerConfig: JsCallbackSignerConfig = {
        alg: "es256",
        certs: [publicKey],
        reserveSize: 10000,
        tsaUrl: undefined,
        directCoseHandling: false,
      };
      const testSigner = new TestSigner(privateKey);
      const signer = CallbackSigner.newSigner(signerConfig, testSigner.sign);

      // Sign source asset with a thumbnail
      const step1Builder = Builder.withJson({
        claim_generator_info: [{ name: "c2pa_test", version: "1.0.0" }],
        title: "Asset With Thumbnail",
        format: "image/jpeg",
        instance_id: "thumb-step1-1234",
        thumbnail: { format: "image/jpeg", identifier: "thumbnail.jpg" },
      });
      await step1Builder.addResource("thumbnail.jpg", {
        mimeType: "image/jpeg",
        buffer: testThumbnail,
      });
      const step1Dest = { buffer: null };
      await step1Builder.signAsync(signer, source, step1Dest);
      const step1Asset = {
        buffer: step1Dest.buffer! as Buffer,
        mimeType: "image/jpeg",
      };

      // Verify thumbnail exists in original manifest
      const originalReader = await Reader.fromAsset(step1Asset);
      expect(originalReader).not.toBeNull();
      const parentLabel = originalReader!.activeLabel();
      expect(parentLabel).toBeDefined();
      const originalManifest = originalReader!.getActive();
      expect(originalManifest?.thumbnail).toBeDefined();
      expect(originalManifest?.thumbnail).not.toBeNull();

      // Redact the thumbnail
      const thumbnailUri = `self#jumbf=/c2pa/${parentLabel}/c2pa.assertions/c2pa.thumbnail.claim`;
      const redactionBuilder = Builder.withJson({
        claim_generator_info: [{ name: "c2pa_test", version: "1.0.0" }],
        title: "Redacted Thumbnail Manifest",
        format: "image/jpeg",
        instance_id: "thumb-step2-1234",
      });
      redactionBuilder.setIntent("update");
      redactionBuilder.addRedaction(thumbnailUri, "c2pa.PII.present");

      const step2Dest = { buffer: null };
      await redactionBuilder.signAsync(signer, step1Asset, step2Dest);

      const finalReader = await Reader.fromAsset({
        buffer: step2Dest.buffer! as Buffer,
        mimeType: "image/jpeg",
      });
      expect(finalReader).not.toBeNull();

      const store = finalReader!.json();
      const parentManifest = store.manifests?.[parentLabel!];
      expect(parentManifest).toBeDefined();
      expect(parentManifest?.thumbnail).toBeUndefined();
    });

    it("should redact an assertion from an ingredient manifest", async () => {
      const signerConfig: JsCallbackSignerConfig = {
        alg: "es256",
        certs: [publicKey],
        reserveSize: 10000,
        tsaUrl: undefined,
        directCoseHandling: false,
      };
      const testSigner = new TestSigner(privateKey);
      const signer = CallbackSigner.newSigner(signerConfig, testSigner.sign);

      // Sign source asset with multiple distinct assertions
      const piiLabel = "stds.schema-org.CreativeWork";
      const retainedLabel = "org.contentauth.retained";
      const step1Builder = Builder.withJson({
        claim_generator_info: [{ name: "c2pa_test", version: "1.0.0" }],
        title: "Asset With Multiple Assertions",
        format: "image/jpeg",
        instance_id: "assert-step1-1234",
        assertions: [
          {
            label: piiLabel,
            data: {
              "@context": "http://schema.org/",
              "@type": "CreativeWork",
              author: [{ "@type": "Person", name: "John Doe" }],
            },
          },
          {
            label: retainedLabel,
            data: { keep: true },
          },
        ],
      });
      const step1Dest = { buffer: null };
      await step1Builder.signAsync(signer, source, step1Dest);
      const step1Asset = {
        buffer: step1Dest.buffer! as Buffer,
        mimeType: "image/jpeg",
      };

      // Verify both assertions exist in original manifest
      const originalReader = await Reader.fromAsset(step1Asset);
      expect(originalReader).not.toBeNull();
      const parentLabel = originalReader!.activeLabel();
      expect(parentLabel).toBeDefined();

      const originalStore = originalReader!.json();
      const originalLabels = originalStore.manifests![parentLabel!].assertions!.map(
        (a: any) => a.label,
      );
      expect(originalLabels).toContain(piiLabel);
      expect(originalLabels).toContain(retainedLabel);

      // Redact only the PII assertion
      const redactionUri = `self#jumbf=/c2pa/${parentLabel}/c2pa.assertions/${piiLabel}`;
      const redactionBuilder = Builder.withJson({
        claim_generator_info: [{ name: "c2pa_test", version: "1.0.0" }],
        title: "Redacted Assertion Manifest",
        format: "image/jpeg",
        instance_id: "assert-step2-1234",
      });
      redactionBuilder.setIntent("update");
      redactionBuilder.addRedaction(redactionUri, "c2pa.PII.present");

      const step2Dest = { buffer: null };
      await redactionBuilder.signAsync(signer, step1Asset, step2Dest);

      const finalReader = await Reader.fromAsset({
        buffer: step2Dest.buffer! as Buffer,
        mimeType: "image/jpeg",
      });
      expect(finalReader).not.toBeNull();

      const store = finalReader!.json();
      const parentManifest = store.manifests?.[parentLabel!];
      expect(parentManifest).toBeDefined();

      const assertionLabels = parentManifest?.assertions?.map(
        (a: any) => a.label,
      );
      // PII assertion removed, retained assertion still present
      expect(assertionLabels).not.toContain(piiLabel);
      expect(assertionLabels).toContain(retainedLabel);
    });

    it("should add redactions via addRedaction method", () => {
      const uri1 = "self#jumbf=/c2pa/test-label/c2pa.assertions/cawg.identity";
      const uri2 =
        "self#jumbf=/c2pa/test-label/c2pa.assertions/stds.schema-org.CreativeWork";
      const builder = Builder.new();
      builder.addRedaction(uri1, "c2pa.PII.present");
      builder.addRedaction(uri2, "c2pa.PII.present");
      const definition = builder.getManifestDefinition();
      expect(definition.redactions).toEqual([uri1, uri2]);
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
      const activeManifest = reader!.getActive();
      expect(activeManifest).toBeDefined();
      expect(activeManifest?.title).toBe("Test_Manifest");
    });

    it("should add action using addAction method", async () => {
      const simpleManifestDefinition = {
        claim_generator_info: [
          {
            name: "c2pa_test",
            version: "1.0.0",
          },
        ],
        title: "Test_AddAction",
        format: "image/jpeg",
        assertions: [],
        resources: { resources: {} },
      };

      const builder = Builder.withJson(simpleManifestDefinition);

      // Add an action using addAction method
      // The action needs to be a structured object matching the c2pa Action type
      const actionJson = JSON.stringify({
        action: "c2pa.edited",
      });
      builder.addAction(actionJson);

      // Sign the manifest
      const dest = { path: path.join(tempDir, "add_action_test.jpg") };
      const signer = LocalSigner.newSigner(publicKey, privateKey, "es256");
      builder.sign(signer, source, dest);

      // Verify the action was added
      const reader = await Reader.fromAsset(dest);
      expect(reader).not.toBeNull();
      const activeManifest = reader!.getActive();
      const actionsAssertion = activeManifest?.assertions?.find(
        (a: any) => a.label === "c2pa.actions.v2",
      );
      expect(actionsAssertion).toBeDefined();
      if (isActionsAssertion(actionsAssertion)) {
        const actions = actionsAssertion.data.actions;
        const editedAction = actions.find(
          (a: any) => a.action === "c2pa.edited",
        );
        expect(editedAction).toBeDefined();
        expect(editedAction?.action).toBe("c2pa.edited");
      } else {
        throw new Error(
          "Actions assertion does not have the expected structure",
        );
      }
    });

    it("should add ingredient using addIngredient method", async () => {
      const simpleManifestDefinition = {
        claim_generator_info: [
          {
            name: "c2pa_test",
            version: "1.0.0",
          },
        ],
        title: "Test_AddIngredient",
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

      const builder = Builder.withJson(simpleManifestDefinition);

      // Add an ingredient using addIngredient method
      const ingredientJson = JSON.stringify({
        title: "Test Ingredient via addIngredient",
        format: "image/jpeg",
        instance_id: "ingredient-12345",
        relationship: "componentOf",
      });
      builder.addIngredient(ingredientJson);

      // Sign the manifest
      const dest = { path: path.join(tempDir, "add_ingredient_test.jpg") };
      const signer = LocalSigner.newSigner(publicKey, privateKey, "es256");
      builder.sign(signer, source, dest);

      // Verify the ingredient was added
      const reader = await Reader.fromAsset(dest);
      expect(reader).not.toBeNull();
      const activeManifest = reader!.getActive();
      expect(activeManifest?.ingredients).toBeDefined();
      expect(activeManifest?.ingredients?.length).toBeGreaterThan(0);
      const addedIngredient = activeManifest?.ingredients?.find(
        (ing: any) => ing.title === "Test Ingredient via addIngredient",
      );
      expect(addedIngredient).toBeDefined();
      expect(addedIngredient?.instance_id).toBe("ingredient-12345");
      expect(addedIngredient?.relationship).toBe("componentOf");
    });

    it("should add ingredient from reader", async () => {
      const builder1 = Builder.new();
      builder1.setIntent("edit" as any);
      const signer = LocalSigner.newSigner(publicKey, privateKey, "es256");
      const dest1: DestinationBufferAsset = {
        buffer: null,
      };
      builder1.sign(signer, source, dest1);

      // Read the signed file back with Reader
      const reader = await Reader.fromAsset({
        buffer: dest1.buffer! as Buffer,
        mimeType: "image/jpeg",
      });
      expect(reader).not.toBeNull();

      // Create a new builder and add ingredient from the reader
      const builder2 = Builder.new();
      const ingredient = builder2.addIngredientFromReader(reader!);
      expect(ingredient).toBeDefined();

      // Verify the ingredient was added to the builder
      const definition = builder2.getManifestDefinition();
      expect(definition.ingredients).toBeDefined();
      expect(definition.ingredients!.length).toBeGreaterThan(0);

      // Sign again with the new builder
      const dest2: DestinationBufferAsset = {
        buffer: null,
      };
      builder2.sign(signer, source, dest2);

      // Verify the ingredient is in the signed manifest
      const reader2 = await Reader.fromAsset({
        buffer: dest2.buffer! as Buffer,
        mimeType: "image/jpeg",
      });
      expect(reader2).not.toBeNull();
      const activeManifest = reader2!.getActive();
      expect(activeManifest?.ingredients).toBeDefined();
      expect(activeManifest?.ingredients?.length).toBe(1);
    });
  });
});
