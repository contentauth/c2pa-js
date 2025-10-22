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

// import native objects from built native code
import type { ManifestStore } from "@contentauth/c2pa-types";
import path from "path";
import * as fs from "fs-extra";

import { Reader } from "./Reader.js";
import { patchVerifyConfig } from "./Settings.js";

const tempDir = path.join(__dirname, "tmp");

describe("Reader", () => {
  const manifestStore: ManifestStore = JSON.parse(`{
  "active_manifest": "contentauth:urn:uuid:c2677d4b-0a93-4444-876f-ed2f2d40b8cf",
  "manifests": {
    "contentauth:urn:uuid:c2677d4b-0a93-4444-876f-ed2f2d40b8cf": {
      "claim_generator": "make_test_images/0.33.1 c2pa-rs/0.33.1",
      "claim_generator_info": [
        {
          "name": "make_test_images",
          "version": "0.33.1"
        },
        {
          "name": "c2pa-rs",
          "version": "0.33.1"
        }
      ],
      "title": "CA.jpg",
      "format": "image/jpeg",
      "instance_id": "xmp:iid:ba572347-db0e-4619-b6eb-d38e487da238",
      "thumbnail": {
        "format": "image/jpeg",
        "identifier": "self#jumbf=/c2pa/contentauth:urn:uuid:c2677d4b-0a93-4444-876f-ed2f2d40b8cf/c2pa.assertions/c2pa.thumbnail.claim.jpeg"
      },
      "ingredients": [
        {
          "title": "A.jpg",
          "format": "image/jpeg",
          "document_id": "xmp.did:813ee422-9736-4cdc-9be6-4e35ed8e41cb",
          "instance_id": "xmp.iid:813ee422-9736-4cdc-9be6-4e35ed8e41cb",
          "thumbnail": {
            "format": "image/jpeg",
            "identifier": "self#jumbf=c2pa.assertions/c2pa.thumbnail.ingredient.jpeg"
          },
          "relationship": "parentOf",
          "label": "c2pa.ingredient"
        }
      ],
      "assertions": [
        {
          "label": "stds.schema-org.CreativeWork",
          "data": {
            "@context": "http://schema.org/",
            "@type": "CreativeWork",
            "author": [
              {
                "name": "John Doe",
                "@type": "Person"
              }
            ]
          },
          "kind": "Json"
        },
        {
          "label": "c2pa.actions.v2",
          "data": {
            "actions": [
              {
                "action": "c2pa.opened",
                "parameters": {
                  "ingredient": {
                    "url": "self#jumbf=c2pa.assertions/c2pa.ingredient",
                    "hash": "5dNlxTKe4afGAicpJa1hF1R3mBZKE+Bl0xmh0McXuO4="
                  }
                }
              },
              {
                "action": "c2pa.color_adjustments",
                "parameters": {
                  "name": "brightnesscontrast"
                }
              }
            ]
          }
        }
      ],
      "signature_info": {
        "alg": "Ps256",
        "issuer": "C2PA Test Signing Cert",
        "common_name": "C2PA Signer",
        "cert_serial_number": "720724073027128164015125666832722375746636448153",
        "time": "2024-08-06T21:53:37+00:00"
      },
      "label": "contentauth:urn:uuid:c2677d4b-0a93-4444-876f-ed2f2d40b8cf"
    }
  }
}`);

  beforeAll(async () => {
    patchVerifyConfig({ verifyTrust: false });
    await fs.ensureDir(tempDir);
  });

  afterAll(async () => {
    await fs.remove(tempDir);
  });

  it("should read from an ArrayBuffer", async () => {
    const buffer = await fs.readFile("./tests/fixtures/CA.jpg");
    const reader = await Reader.fromAsset({
      buffer,
      mimeType: "jpeg",
    });

    const json = reader.json();
    expect(json.manifests).toEqual(manifestStore.manifests);
    expect(json.active_manifest).toEqual(manifestStore.active_manifest);
  });

  it("should read from a file", async () => {
    const reader = await Reader.fromAsset({
      path: "./tests/fixtures/CA.jpg",
    });
    const json = reader.json();
    expect(json.manifests).toEqual(manifestStore.manifests);
    expect(json.active_manifest).toEqual(manifestStore.active_manifest);
  });

  it("should read from manifest data and buffer", async () => {
    const manifestData = await fs.readFile(
      "./tests/fixtures/CA/manifest_data.c2pa",
    );
    const buffer = await fs.readFile("./tests/fixtures/CA.jpg");
    const reader = await Reader.fromManifestDataAndAsset(manifestData, {
      buffer,
      mimeType: "jpeg",
    });
    const json = reader.json();
    expect(json.manifests).toEqual(manifestStore.manifests);
    expect(json.active_manifest).toEqual(manifestStore.active_manifest);
  });

  it("should read from manifest data and file", async () => {
    const manifestData = await fs.readFile(
      "./tests/fixtures/CA/manifest_data.c2pa",
    );
    const reader = await Reader.fromManifestDataAndAsset(manifestData, {
      path: "./tests/fixtures/CA.jpg",
    });
    const json = reader.json();
    expect(json.manifests).toEqual(manifestStore.manifests);
  });

  it("should write to a file", async () => {
    let bytesWritten = 0;
    const outputPath = path.join(tempDir, "thumbnail.jpg");
    const reader = await Reader.fromAsset({
      path: "./tests/fixtures/CA.jpg",
    });
    const activeManifest = reader.getActive();
    const uri = activeManifest?.thumbnail?.identifier;

    if (uri !== undefined) {
      bytesWritten = await reader.resourceToAsset(uri, {
        path: outputPath,
      });
    }
    expect(bytesWritten).toBe(49690);
    expect(fs.existsSync(outputPath));
  });

  it("should report manifest is embedded", async () => {
    const reader = await Reader.fromAsset({
      path: "./tests/fixtures/CA.jpg",
    });
    expect(reader.remoteUrl()).toEqual("");
    expect(reader.isEmbedded()).toBeTruthy();
  });

  it("should report manifest is not embedded", async () => {
    const reader = await Reader.fromAsset({
      path: "./tests/fixtures/cloud.jpg",
    });
    expect(reader.remoteUrl()).toEqual(
      "https://cai-manifests.adobe.com/manifests/adobe-urn-uuid-5f37e182-3687-462e-a7fb-573462780391",
    );
    expect(reader.isEmbedded()).toBeFalsy();
  });
});
