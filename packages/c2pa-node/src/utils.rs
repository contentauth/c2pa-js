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

use neon::prelude::*;

#[allow(dead_code)]
// Used in debugging
pub fn log_message<'a, C: Context<'a>>(cx: &mut C, message: &str) {
    let global = cx.global_object();
    let console: Handle<JsObject> = global.get(cx, "console").unwrap();
    let log: Handle<JsFunction> = console
        .get::<JsFunction, _, _>(cx, "log")
        .unwrap()
        .downcast_or_throw(cx)
        .unwrap();
    let msg = cx.string(message);
    let this = cx.undefined();
    let args: Vec<Handle<JsValue>> = vec![msg.upcast()];
    log.call(cx, this, args).unwrap();
}
