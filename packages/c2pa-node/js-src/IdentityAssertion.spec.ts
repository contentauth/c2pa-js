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

import type { Manifest } from "@contentauth/c2pa-types";
import fs from "fs-extra";
import * as crypto from "crypto";
import { spawnSync } from "child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import { encodeSignerPayload } from "./index.js";

import type {
  JsCallbackSignerConfig,
  DestinationBufferAsset,
  SigningAlg,
  SignerPayload,
} from "./types.d.ts";

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
    return sign.sign(this.privateKey);
  };
}

class TestCawgSigner {
  constructor(private manifestSigner: TestSigner) {}

  sign = async (payload: SignerPayload): Promise<Buffer> => {
    const cborBytes = Buffer.from(encodeSignerPayload(payload));
    return this.manifestSigner.sign(cborBytes);
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
    thumbnail: { format: "image/jpeg", identifier: "thumbnail.jpg" },
    resources: { resources: {} },
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
        label: "c2pa.actions.v2",
        data: {
          actions: [
            {
              action: "c2pa.created",
              digitalSourceType:
                "http://cv.iptc.org/newscodes/digitalsourcetype/digitalCapture",
            },
          ],
        } as any,
        kind: "Json",
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
    const { CallbackSigner } = await import("./Signer");
    const { Reader } = await import("./Reader");
    const { Builder } = await import("./Builder");
    const {
      IdentityAssertionBuilder,
      IdentityAssertionSigner,
      CallbackCredentialHolder,
    } = await import("./IdentityAssertion");
    // Read certificate files once
    const c2paPrivateKey = await fs.readFile(
      "./tests/fixtures/certs/es256.pem",
    );
    const c2paPublicKey = await fs.readFile("./tests/fixtures/certs/es256.pub");
    // Use the same signer for both C2PA manifest and COSE signing

    // Create signer configurations
    const c2paConfig: JsCallbackSignerConfig = {
      alg: "es256" as SigningAlg,
      certs: [c2paPublicKey],
      reserveSize: 10000,
      tsaUrl: undefined,
      tsaHeaders: undefined,
      tsaBody: undefined,
      directCoseHandling: true,
    };

    // Create signers
    const c2paTestSigner = new TestSigner(c2paPrivateKey);
    const c2paSigner = CallbackSigner.newSigner(
      c2paConfig,
      c2paTestSigner.sign,
    );
    const cawgTestSigner = new TestCawgSigner(c2paTestSigner);
    const cawgSigner = CallbackCredentialHolder.newCallbackCredentialHolder(
      10000,
      "cawg.x509.cose",
      cawgTestSigner.sign,
    );

    const source = {
      buffer: await fs.readFile("./tests/fixtures/CA.jpg"),
      mimeType: "image/jpeg",
    };
    const dest: DestinationBufferAsset = {
      buffer: null,
    };

    // Create the manifest builder
    const builder = Builder.withJson(manifestDefinition);

    // Add the required resources
    await builder.addResource("thumbnail.jpg", {
      mimeType: "image/jpeg",
      buffer: await fs.readFile("./tests/fixtures/thumbnail.jpg"),
    });
    await builder.addResource("ingredient-thumb.jpg", {
      mimeType: "image/jpeg",
      buffer: await fs.readFile("./tests/fixtures/thumbnail.jpg"),
    });

    // Create and configure the identity assertion
    const iaSigner = IdentityAssertionSigner.new(c2paSigner.getHandle());
    const iab =
      await IdentityAssertionBuilder.identityBuilderForCredentialHolder(
        cawgSigner,
      );
    iab.addReferencedAssertions(["cawg.training-mining"]);
    iaSigner.addIdentityAssertion(iab);

    // Sign the manifest (standard async flow)
    await builder.signAsync(iaSigner, source, dest);

    // Verify the manifest
    await Reader.fromAsset({
      buffer: dest.buffer! as Buffer,
      mimeType: "image/jpeg",
    });
  });

  it("forwards timestamp requests and failures through the identity signer", async () => {
    const { CallbackSigner } = await import("./Signer.js");
    const { Builder } = await import("./Builder.js");
    const { IdentityAssertionSigner } = await import("./IdentityAssertion.js");
    const requests: {
      method: string | undefined;
      marker: string | string[] | undefined;
    }[] = [];
    const server = createServer((request, response) => {
      requests.push({
        method: request.method,
        marker: request.headers["x-c2pa-preflight"],
      });
      request.resume();
      response.writeHead(503).end("Timestamp service unavailable");
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");

    try {
      const address = server.address();
      if (!address || typeof address === "string") {
        throw new Error("Expected a TCP timestamp test server");
      }

      const testSigner = new TestSigner(
        await fs.readFile("./tests/fixtures/certs/es256.pem"),
      );
      const signer = CallbackSigner.newSigner(
        {
          alg: "es256",
          certs: [await fs.readFile("./tests/fixtures/certs/es256.pub")],
          reserveSize: 10000,
          tsaUrl: `http://127.0.0.1:${address.port}`,
          tsaHeaders: [["x-c2pa-preflight", "identity-signer"]],
          directCoseHandling: false,
        },
        testSigner.sign,
      );
      const builder = Builder.withJson({
        claim_generator_info: [{ name: "c2pa_test", version: "2.0.0" }],
        format: "image/jpeg",
        assertions: manifestDefinition.assertions,
      });

      await expect(
        builder.signAsync(
          IdentityAssertionSigner.new(signer.getHandle()),
          {
            buffer: await fs.readFile("./tests/fixtures/CA.jpg"),
            mimeType: "image/jpeg",
          },
          { buffer: null },
        ),
      ).rejects.toThrow(/timestamp|503/i);
      expect(requests).toContainEqual({
        method: "POST",
        marker: "identity-signer",
      });
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });
});

describe("CallbackCredentialHolder accessors", () => {
  it("returns reserveSize and sigType set on the constructor", async () => {
    const { CallbackCredentialHolder } = await import("./IdentityAssertion");

    const holder = CallbackCredentialHolder.newCallbackCredentialHolder(
      10000,
      "cawg.x509.cose",
      async () => Buffer.alloc(0),
    );

    expect(holder.reserveSize()).toBe(10000);
    expect(holder.sigType()).toBe("cawg.x509.cose");
  });

  it("signs a payload through the callback set", async () => {
    const { CallbackCredentialHolder } = await import("./IdentityAssertion");

    const seen: SignerPayload[] = [];
    const holder = CallbackCredentialHolder.newCallbackCredentialHolder(
      10000,
      "cawg.x509.cose",
      async (payload) => {
        seen.push(payload);
        return Buffer.from([1, 2, 3]);
      },
    );

    const signature = await holder.sign({
      referencedAssertions: [
        {
          url: "self#jumbf=c2pa.assertions/cawg.training-mining",
          hash: new Uint8Array([9, 8, 7]),
          alg: "sha256",
        },
      ],
      sigType: "cawg.x509.cose",
      roles: ["cawg.creator"],
    });

    expect(signature).toEqual(Buffer.from([1, 2, 3]));
    expect(seen).toHaveLength(1);

    const payload = seen[0]!;
    expect(payload.sigType).toBe("cawg.x509.cose");
    expect(payload.roles).toEqual(["cawg.creator"]);
    expect(payload.referencedAssertions).toHaveLength(1);
    expect(payload.referencedAssertions[0]!.url).toBe(
      "self#jumbf=c2pa.assertions/cawg.training-mining",
    );
    expect(Buffer.from(payload.referencedAssertions[0]!.hash)).toEqual(
      Buffer.from([9, 8, 7]),
    );
  });

  it("releases main loop when idle", () => {
    // Note: Runs in a child process, since tests a potential hang.

    const scriptEntrypoint = new URL("../dist/index.js", import.meta.url).href;

    // Check the run of the script releases channels, to free up main loop.
    const testScript = `
      import {
        CallbackCredentialHolder,
        CallbackSigner,
        IdentityAssertionSigner,
      } from ${JSON.stringify(scriptEntrypoint)};
      const signer = CallbackSigner.newSigner(
        { alg: "es256", certs: [Buffer.alloc(1)], reserveSize: 1000, directCoseHandling: false },
        async () => Buffer.alloc(64),
      );
      globalThis.kept = [
        signer,
        IdentityAssertionSigner.new(signer.getHandle()),
        CallbackCredentialHolder.newCallbackCredentialHolder(
          1000,
          "cawg.x509.cose",
          async () => Buffer.alloc(1),
        ),
      ];
    `;

    const runResult = spawnSync(
      process.execPath,
      ["--input-type=module", "-e", testScript],
      { timeout: 5_000, encoding: "utf8" },
    );

    expect(runResult.stderr).not.toMatch(/Error/);
    expect(runResult.signal).toBeNull();
    expect(runResult.status).toBe(0);
  });
});

describe("handles reserveSize", () => {
  async function signWithReserveSize(reserveSize: number) {
    const { CallbackSigner } = await import("./Signer");
    const { Builder } = await import("./Builder");
    const {
      IdentityAssertionBuilder,
      IdentityAssertionSigner,
      CallbackCredentialHolder,
    } = await import("./IdentityAssertion");

    const c2paPrivateKey = await fs.readFile(
      "./tests/fixtures/certs/es256.pem",
    );
    const c2paPublicKey = await fs.readFile("./tests/fixtures/certs/es256.pub");

    const c2paTestSigner = new TestSigner(c2paPrivateKey);
    const c2paSigner = CallbackSigner.newSigner(
      {
        alg: "es256" as SigningAlg,
        certs: [c2paPublicKey],
        reserveSize: 10000,
        tsaUrl: undefined,
        tsaHeaders: undefined,
        tsaBody: undefined,
        directCoseHandling: true,
      },
      c2paTestSigner.sign,
    );

    const cawgTestSigner = new TestCawgSigner(c2paTestSigner);
    const cawgSigner = CallbackCredentialHolder.newCallbackCredentialHolder(
      reserveSize,
      "cawg.x509.cose",
      cawgTestSigner.sign,
    );

    const builder = Builder.withJson({
      claim_generator_info: [{ name: "c2pa_test", version: "2.0.0" }],
      title: "Test_Manifest",
      format: "image/jpeg",
      instance_id: "1234",
      assertions: [
        {
          label: "c2pa.actions.v2",
          data: {
            actions: [
              {
                action: "c2pa.created",
                digitalSourceType:
                  "http://cv.iptc.org/newscodes/digitalsourcetype/digitalCapture",
              },
            ],
          } as any,
          kind: "Json",
        },
        {
          label: "cawg.training-mining",
          data: {
            metadata: {
              "cawg.ai_inference": { use: "notAllowed" },
            },
          },
        },
      ],
    } as Manifest);

    const iaSigner = IdentityAssertionSigner.new(c2paSigner.getHandle());
    const iab =
      await IdentityAssertionBuilder.identityBuilderForCredentialHolder(
        cawgSigner,
      );
    iab.addReferencedAssertions(["cawg.training-mining"]);
    iaSigner.addIdentityAssertion(iab);

    return builder.signAsync(
      iaSigner,
      {
        buffer: await fs.readFile("./tests/fixtures/CA.jpg"),
        mimeType: "image/jpeg",
      },
      { buffer: null } as DestinationBufferAsset,
    );
  }

  it("rejects a reserveSize too small for the identity assertion", async () => {
    await expect(signWithReserveSize(10)).rejects.toThrow(
      /exceeds the planned size/i,
    );
  });

  it("rejects a reserveSize overflowing into padding", async () => {
    await expect(signWithReserveSize(340)).rejects.toThrow(/reserveSize/i);
  });

  it("signs with a large reserveSize", async () => {
    await expect(signWithReserveSize(10000)).resolves.toBeDefined();
  });
});
