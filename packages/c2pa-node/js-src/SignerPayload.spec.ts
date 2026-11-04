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

import { encodeSignerPayload } from "./index.js";

const toHex = (bytes: Uint8Array) => Buffer.from(bytes).toString("hex");

describe("encodeSignerPayload", () => {
  it("encodes roles, alg, and non-ASCII URLs to the golden CBOR bytes", () => {
    const hash = Uint8Array.of(1, 2, 3);
    const payload = {
      referencedAssertions: [
        {
          url: "self#jumbf=/c2pa/assertions/c2pa.actions",
          hash,
          alg: "sha256",
        },
        { url: "second/日本語", hash: Uint8Array.of(0, 127, 128, 255) },
      ],
      sigType: "cawg.x509.cose",
      roles: ["cawg.creator", "cawg.publisher"],
    };
    const bytes = encodeSignerPayload(payload);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(toHex(bytes)).toBe(
      "a3757265666572656e6365645f617373657274696f6e7382a36375726c782873656c66236a756d62663d2f633270612f617373657274696f6e732f633270612e616374696f6e7363616c6766736861323536646861736843010203a26375726c707365636f6e642fe697a5e69cace8aa9e646861736844007f80ff687369675f747970656e636177672e783530392e636f736564726f6c65826c636177672e63726561746f726e636177672e7075626c6973686572",
    );
    expect(payload.referencedAssertions[0].hash).toEqual(hash);
  });

  it.each([undefined, []])(
    "omits an absent or empty role (%j) and encodes empty assertions",
    (roles) => {
      const bytes = encodeSignerPayload({
        referencedAssertions: [],
        sigType: "cawg.x509.cose",
        roles,
      });
      expect(toHex(bytes)).toBe(
        "a2757265666572656e6365645f617373657274696f6e7380687369675f747970656e636177672e783530392e636f7365",
      );
    },
  );

  it("accepts explicit undefined roles and rejects null roles", () => {
    const base = { referencedAssertions: [], sigType: "test" };
    expect(toHex(encodeSignerPayload({ ...base, roles: undefined }))).toBe(
      toHex(encodeSignerPayload(base)),
    );
    expect(() =>
      encodeSignerPayload({ ...base, roles: null } as never),
    ).toThrow();
  });

  it.each([
    [0, "40"],
    [1, "41"],
    [23, "57"],
    [24, "5818"],
    [255, "58ff"],
    [256, "590100"],
    [65535, "59ffff"],
    [65536, "5a00010000"],
  ] as const)(
    "encodes a %i-byte hash with the correct header and respects typed array offsets",
    (length, header) => {
      const backing = new Uint8Array(length + 4).fill(255);
      const hash = backing.subarray(2, length + 2);
      hash.fill(128);
      const bytes = encodeSignerPayload({
        referencedAssertions: [{ url: "a", hash }],
        sigType: "test",
      });
      expect(toHex(bytes)).toBe(
        "a2757265666572656e6365645f617373657274696f6e7381a26375726c61616468617368" +
          header +
          "80".repeat(length) +
          "687369675f747970656474657374",
      );
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

  describe("input contract", () => {
    // Keep these cases aligned with c2pa-web's signer.spec.ts. The JS-to-Rust
    // adapters differ even though both bindings use the same Rust serializer.
    const hash = Uint8Array.of(1, 2);
    const uri = { url: "a", hash };
    const payload = { referencedAssertions: [uri], sigType: "test" };
    const rejected: [string, unknown][] = [
      ["an undefined payload", undefined],
      ["a null payload", null],
      ["missing referencedAssertions", { sigType: "test" }],
      ["missing sigType", { referencedAssertions: [uri] }],
      [
        "snake_case referenced_assertions",
        { referenced_assertions: [uri], sigType: "test" },
      ],
      [
        "snake_case sig_type",
        { referencedAssertions: [uri], sig_type: "test" },
      ],
      [
        "case-mismatched SigType",
        { referencedAssertions: [uri], SigType: "test" },
      ],
      [
        "non-array referencedAssertions",
        { ...payload, referencedAssertions: {} },
      ],
      ["a non-string sigType", { ...payload, sigType: 42 }],
      ["a null assertion", { ...payload, referencedAssertions: [null] }],
      ["a missing url", { ...payload, referencedAssertions: [{ hash }] }],
      [
        "case-mismatched Url",
        { ...payload, referencedAssertions: [{ Url: "a", hash }] },
      ],
      [
        "a non-string url",
        { ...payload, referencedAssertions: [{ ...uri, url: 42 }] },
      ],
      ["a missing hash", { ...payload, referencedAssertions: [{ url: "a" }] }],
      [
        "case-mismatched Hash",
        { ...payload, referencedAssertions: [{ url: "a", Hash: hash }] },
      ],
      [
        "a string hash",
        { ...payload, referencedAssertions: [{ ...uri, hash: "not bytes" }] },
      ],
      [
        "a non-string alg",
        { ...payload, referencedAssertions: [{ ...uri, alg: 42 }] },
      ],
      ["null roles", { ...payload, roles: null }],
      ["non-array roles", { ...payload, roles: "creator" }],
      ["a non-string role", { ...payload, roles: [42] }],
    ];

    it.each(rejected)("rejects %s", (_name, input) => {
      expect(() => encodeSignerPayload(input as never)).toThrow();
    });

    const ignored: [string, unknown][] = [
      ["extra payload properties", { ...payload, extra: { version: 1 } }],
      [
        "wire-format field names alongside camelCase fields",
        {
          ...payload,
          referenced_assertions: [],
          sig_type: "ignored",
          role: ["ignored"],
        },
      ],
      [
        "extra assertion properties",
        { ...payload, referencedAssertions: [{ ...uri, extra: true }] },
      ],
      [
        "case-mismatched optional Roles and Alg",
        {
          ...payload,
          Roles: ["ignored"],
          referencedAssertions: [{ ...uri, Alg: "ignored" }],
        },
      ],
    ];

    it.each(ignored)("ignores %s", (_name, input) => {
      expect(encodeSignerPayload(input as never)).toEqual(
        encodeSignerPayload(payload),
      );
    });

    it("ignores an unknown function property without cloning the payload", () => {
      expect(
        encodeSignerPayload({
          ...payload,
          extra: () => undefined,
        } as never),
      ).toEqual(encodeSignerPayload(payload));
    });
  });
});
