// Copyright 2026 Adobe. All rights reserved.
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

import { decode } from "cbor2";
import { encodeSignerPayload } from "./index.js";

describe("encodeSignerPayload", () => {
  it("maps the CAWG wire keys and encodes hashes as byte strings", () => {
    const hash = Uint8Array.of(0, 127, 128, 255);
    const payload = {
      referencedAssertions: [
        {
          url: "self#jumbf=/c2pa/assertions/c2pa.actions",
          hash,
          alg: "sha256",
        },
        { url: "second", hash: new Uint8Array() },
      ],
      sigType: "cawg.x509.cose",
      roles: ["cawg.creator", "cawg.publisher"],
    };
    const bytes = encodeSignerPayload(payload);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(decode(bytes)).toEqual({
      referenced_assertions: [
        { url: payload.referencedAssertions[0].url, alg: "sha256", hash },
        { url: "second", hash: new Uint8Array() },
      ],
      sig_type: payload.sigType,
      role: payload.roles,
    });
    expect(payload.referencedAssertions[0].hash).toEqual(hash);
  });

  it.each([undefined, []])("omits an absent or empty role (%j)", (roles) => {
    const bytes = encodeSignerPayload({
      referencedAssertions: [],
      sigType: "cawg.x509.cose",
      roles,
    });
    expect(decode(bytes)).toEqual({
      referenced_assertions: [],
      sig_type: "cawg.x509.cose",
    });
  });

  it.each([0, 1, 23, 24, 255, 256, 65535, 65536])(
    "preserves a %i-byte hash and respects typed array offsets",
    (length) => {
      const backing = new Uint8Array(length + 4).fill(255);
      const hash = backing.subarray(2, length + 2);
      hash.fill(128);
      const bytes = encodeSignerPayload({
        referencedAssertions: [{ url: "assertion", hash }],
        sigType: "cawg.x509.cose",
      });
      const decoded = decode(bytes) as {
        referenced_assertions: { hash: Uint8Array }[];
      };
      expect(decoded.referenced_assertions[0].hash).toBeInstanceOf(Uint8Array);
      expect(decoded.referenced_assertions[0].hash).toEqual(hash);
      expect(backing[0]).toBe(255);
    },
  );

  it("accepts a Node Buffer hash", () => {
    const payload = {
      referencedAssertions: [{ url: "a", hash: Buffer.from([1, 2]) }],
      sigType: "test",
    };
    expect(encodeSignerPayload(payload)).toEqual(
      encodeSignerPayload({
        ...payload,
        referencedAssertions: [{ url: "a", hash: Uint8Array.of(1, 2) }],
      }),
    );
  });

  it("rejects malformed payloads instead of encoding a partial value", () => {
    expect(() => encodeSignerPayload({ sigType: "test" } as never)).toThrow();
    expect(() =>
      encodeSignerPayload({ referencedAssertions: [] } as never),
    ).toThrow();
    expect(() =>
      encodeSignerPayload({
        referencedAssertions: [{ url: "a", hash: "not bytes" }],
        sigType: "test",
      } as never),
    ).toThrow();
  });
});
