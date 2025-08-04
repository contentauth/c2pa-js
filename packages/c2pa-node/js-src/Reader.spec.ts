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

import { Reader } from "./index";

// import native objects from built native code
import { ManifestStore } from "index.node";
import path from "path";
import * as fs from "fs-extra";

const tempDir = path.join(__dirname, "tmp");

describe("Reader", () => {
  const manifestStore: ManifestStore = JSON.parse(`{
  "active_manifest": "contentauth:urn:uuid:e8ce52bc-df72-4ba5-ba37-52c360e76ba4",
  "manifests": {
    "contentauth:urn:uuid:e8ce52bc-df72-4ba5-ba37-52c360e76ba4": {
      "claim_generator": "make_test_images/0.36.1",
      "claim_generator_info": [
        {
          "name": "make_test_images",
          "version": "0.36.1",
          "org.cai.c2pa_rs": "0.42.0"
        }
      ],
      "title": "CAI.jpg",
      "format": "image/jpeg",
      "instance_id": "xmp:iid:099bb0ad-5c66-4ad9-b0b6-6824fb26a198",
      "thumbnail": {
        "format": "image/jpeg",
        "identifier": "self#jumbf=/c2pa/contentauth:urn:uuid:e8ce52bc-df72-4ba5-ba37-52c360e76ba4/c2pa.assertions/c2pa.thumbnail.claim.jpeg"
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
        },
        {
          "title": "I.jpg",
          "format": "image/jpeg",
          "document_id": "xmp.did:8a00de7a-e694-43b2-a7e6-ed950421a21a",
          "instance_id": "xmp.iid:8a00de7a-e694-43b2-a7e6-ed950421a21a",
          "thumbnail": {
            "format": "image/jpeg",
            "identifier": "self#jumbf=c2pa.assertions/c2pa.thumbnail.ingredient__1.jpeg"
          },
          "relationship": "componentOf",
          "label": "c2pa.ingredient__1"
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
                  "org.cai.ingredientIds": [
                    "xmp.iid:813ee422-9736-4cdc-9be6-4e35ed8e41cb"
                  ],
                  "ingredient": [
                    {
                      "url": "self#jumbf=c2pa.assertions/c2pa.ingredient",
                      "hash": "tTBD4/E0R0AjLUdJFpsVz3lE/KJUq22Vz0UGqzhEpVs="
                    }
                  ]
                }
              },
              {
                "action": "c2pa.color_adjustments",
                "parameters": {
                  "name": "brightnesscontrast"
                }
              },
              {
                "action": "c2pa.placed",
                "parameters": {
                  "org.cai.ingredientIds": [
                    "xmp.iid:8a00de7a-e694-43b2-a7e6-ed950421a21a"
                  ],
                  "ingredient": [
                    {
                      "url": "self#jumbf=c2pa.assertions/c2pa.ingredient__1",
                      "hash": "EMeeY5a+lvy1msl+9i5DOcOoeQowrqD7NyV0d8fwAX0="
                    }
                  ]
                }
              },
              {
                "action": "c2pa.resized"
              }
            ]
          }
        }
      ],
      "signature_info": {
        "alg": "Ps256",
        "issuer": "C2PA Test Signing Cert",
        "cert_serial_number": "720724073027128164015125666832722375746636448153",
        "time": "2025-02-04T17:38:01+00:00"
      },
      "label": "contentauth:urn:uuid:e8ce52bc-df72-4ba5-ba37-52c360e76ba4"
    }
  }
}`);

  beforeAll(async () => {
    await fs.ensureDir(tempDir);
  });

  afterAll(async () => {
    await fs.remove(tempDir);
  });

  it("should read from an ArrayBuffer", async () => {
    const buffer = await fs.readFile("./tests/fixtures/CAI.jpg");
    const reader = await Reader.fromAsset({ buffer, mimeType: "jpeg" });

    const json = reader.json();
    expect(json.manifests).toEqual(manifestStore.manifests);
    expect(json.active_manifest).toEqual(manifestStore.active_manifest);
  });

  it("should read from a file", async () => {
    const reader = await Reader.fromAsset({ path: "./tests/fixtures/CAI.jpg" });
    const json = reader.json();
    expect(json.manifests).toEqual(manifestStore.manifests);
    expect(json.active_manifest).toEqual(manifestStore.active_manifest);
  });

  it("should read from manifest data and buffer", async () => {
    const manifestData = await fs.readFile(
      "./tests/fixtures/CAI/manifest_data.c2pa",
    );
    const buffer = await fs.readFile("./tests/fixtures/CAI.jpg");
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
      "./tests/fixtures/CAI/manifest_data.c2pa",
    );
    const reader = await Reader.fromManifestDataAndAsset(manifestData, {
      path: "./tests/fixtures/CAI.jpg",
    });
    const json = reader.json();
    expect(json.manifests).toEqual(manifestStore.manifests);
  });

  it("should write to a file", async () => {
    let bytesWritten = 0;
    const outputPath = path.join(tempDir, "thumbnail.jpg");
    const reader = await Reader.fromAsset({ path: "./tests/fixtures/CAI.jpg" });
    const activeManifest = reader.getActive();
    const uri = activeManifest?.thumbnail?.identifier;

    if (uri !== undefined) {
      bytesWritten = await reader.resourceToAsset(uri, {
        path: outputPath,
      });
    }
    expect(bytesWritten).toBe(85281);
    expect(fs.existsSync(outputPath));
  });
});
