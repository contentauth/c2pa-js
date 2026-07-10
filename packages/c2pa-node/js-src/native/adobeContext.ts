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

// Bridge to the Adobe-specific `adobe_c2pa` C API (adobe_api/sdk-c), only
// present when the loaded native library is `libadobe_c2pa` rather than
// plain `libc2pa_c` (see native/lib.ts findLibraryPath). This is the piece
// this RFC is actually about: moving Adobe claims-signer/CAWG-identity
// business logic into shared Rust rather than reimplementing it per
// language binding. See RFC.md for background and spike results.

import koffi from "koffi";
import { getLib, isAdobeApiAvailable } from "./lib.js";
import { checkPtr } from "./error.js";
import { Signer } from "./signer.js";

// struct Identities { const struct Identity *const *identities; uintptr_t length; }
const IdentitiesStruct = koffi.struct("AdobeIdentities", {
  identities: koffi.pointer("void *"),
  length: "size_t",
});

export interface AdobeIdentity {
  type: string;
  displayName: string | null;
  username: string | null;
  isVerified: boolean;
}

function requireAdobeApi(): void {
  if (!isAdobeApiAvailable()) {
    throw new Error(
      "The loaded native library does not export the Adobe adobe_c2pa API " +
        "(adobe_context_create is missing). Point C2PA_LIBRARY_PATH at " +
        "libadobe_c2pa (built from the adobe_api repo) — see README.md.",
    );
  }
}

/**
 * A short-lived handle used only to fetch identities and mint a signer.
 * Freed internally right after use — the resulting Signer clones its own
 * network client/runtime references and doesn't depend on this context
 * staying alive (confirmed against the real adobe_api C API this session).
 */
export class AdobeContext {
  private constructor(private readonly ptr: unknown) {}

  static create(authToken: string, apiKey: string): AdobeContext {
    requireAdobeApi();
    const contextOut = [null];
    const status = getLib().adobe_context_create(authToken, apiKey, contextOut);
    if (status !== 0 || !contextOut[0]) {
      throw new Error(`adobe_context_create failed with status ${status}`);
    }
    return new AdobeContext(contextOut[0]);
  }

  /** Fetch the caller's IMS-connected identities usable for CAWG signing. */
  getIdentities(): AdobeIdentity[] {
    const clientOut = [null];
    let status = getLib().adobe_context_create_ims_user_client(
      [this.ptr],
      clientOut,
    );
    if (status !== 0 || !clientOut[0]) {
      throw new Error(
        `adobe_context_create_ims_user_client failed with status ${status}`,
      );
    }

    const identitiesOut = [null];
    status = getLib().adobe_context_get_identities([clientOut[0]], identitiesOut);
    if (status !== 0 || !identitiesOut[0]) {
      getLib().free_ims_client(clientOut[0]);
      throw new Error(`adobe_context_get_identities failed with status ${status}`);
    }

    const decoded = koffi.decode(identitiesOut[0], IdentitiesStruct) as {
      identities: unknown;
      length: number;
    };
    const pointers = decoded.length
      ? (koffi.decode(decoded.identities, koffi.array("void *", decoded.length)) as unknown[])
      : [];

    const result: AdobeIdentity[] = pointers.map((p) => ({
      type: getLib().adobe_identity_type(p) ?? "",
      displayName: getLib().adobe_identity_display_name(p),
      username: getLib().adobe_identity_username(p),
      isVerified: getLib().adobe_identity_is_verified(p),
    }));

    getLib().free_identities(identitiesOut[0]);
    getLib().free_ims_client(clientOut[0]);
    return result;
  }

  /**
   * Create a CAWG-capable signer that signs via Adobe's claims-signer
   * service, attaching the given verified identity types (e.g. "behance",
   * as returned by getIdentities()[].type). Pass an empty array for a
   * plain (non-CAWG) Adobe service signer.
   */
  createSigner(
    identityTypes: string[],
    opts: { disableTimestamping?: boolean } = {},
  ): Signer {
    requireAdobeApi();
    const signerOut = [null];
    const status = getLib().adobe_context_create_signer_with_options(
      [this.ptr],
      signerOut,
      {
        identities: identityTypes,
        identities_count: identityTypes.length,
        disable_timestamping: opts.disableTimestamping ?? false,
      },
    );
    if (status !== 0 || !signerOut[0]) {
      throw new Error(
        `adobe_context_create_signer_with_options failed with status ${status}`,
      );
    }
    return Signer.fromPointer(checkPtr(signerOut[0]));
  }

  /** Free the underlying AdobeContext. Safe to call after createSigner(). */
  dispose(): void {
    if (this.ptr) getLib().free_adobe_context(this.ptr);
  }
}
