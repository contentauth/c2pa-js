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

import { decodeAndFree, getLib } from "./lib.js";

/** Base error thrown by all native C2PA operations. */
export class C2paError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "C2paError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ManifestNotFoundError extends C2paError {
  constructor(msg: string) {
    super(msg);
    this.name = "ManifestNotFoundError";
  }
}

/** Retrieve the last C2PA error from Rust and throw it. */
export function throwLastError(fallback = "Unknown C2PA error"): never {
  const ptr = getLib().c2pa_error();
  const message = decodeAndFree(ptr) || fallback;
  if (/manifestnotfound/i.test(message)) {
    throw new ManifestNotFoundError(message);
  }
  throw new C2paError(message);
}

/** Check integer return value; throw last error if negative. */
export function checkInt(result: number | bigint, fallback?: string): number {
  const n = typeof result === "bigint" ? Number(result) : result;
  if (n < 0) throwLastError(fallback);
  return n;
}

/** Check pointer return value; throw last error if null/falsy. */
export function checkPtr<T>(
  ptr: T | null | undefined | false | 0,
  fallback?: string,
): T {
  if (!ptr) throwLastError(fallback);
  return ptr as T;
}

// ── Async variants ───────────────────────────────────────────────────────────
//
// c2pa-rs's LAST_ERROR is thread-local. Calls made via koffi's .async() run
// on a worker thread, but c2pa_error() is a plain synchronous call that reads
// whichever thread it's invoked from — under concurrency that's essentially
// never the worker thread that set the error. So async failures can only
// report a generic message, not the detailed reason the sync API provides.

/** Check integer return value from an async call; throws a generic error
 * (no detailed message — see note above) if negative. */
export function checkIntAsync(
  result: number | bigint,
  fallback = "Unknown C2PA error",
): number {
  const n = typeof result === "bigint" ? Number(result) : result;
  if (n < 0) throw new C2paError(fallback);
  return n;
}

/** Check pointer return value from an async call; throws a generic error
 * (no detailed message — see note above) if null/falsy. */
export function checkPtrAsync<T>(
  ptr: T | null | undefined | false | 0,
  fallback = "Unknown C2PA error",
): T {
  if (!ptr) throw new C2paError(fallback);
  return ptr as T;
}
