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

import { createRequire } from "module";

// Create a require function for the current module to load the .node file
const require = createRequire(import.meta.url);

// Dynamically import the binary module
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let neon: any = null;

// Get the binary module (loads synchronously on first access)
export function getNeonBinary() {
  if (neon === null) {
    neon = require("./index.node");
  }
  return neon;
}

