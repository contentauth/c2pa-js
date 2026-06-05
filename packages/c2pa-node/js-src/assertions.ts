// Copyright 2025 Adobe. All rights reserved.
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

/* eslint-disable @typescript-eslint/no-explicit-any */

export function isActionsAssertion(
  obj: unknown,
): obj is { label: string; data: { actions: Array<{ action: string }> } } {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "label" in obj &&
    "data" in obj &&
    typeof (obj as any).label === "string" &&
    ((obj as any).label === "c2pa.actions" || (obj as any).label === "c2pa.actions.v2") &&
    typeof (obj as any).data === "object" &&
    (obj as any).data !== null &&
    Array.isArray((obj as any).data.actions)
  );
}
