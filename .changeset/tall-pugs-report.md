---
"@contentauth/c2pa-node": minor
---

Report progress and support cancellation in `Reader` and `Builder`.

A `Context` constructed with `onProgress` now receives progress events while reading or
signing, and one constructed with an `AbortSignal` can cancel those operations. Both options
may also be passed per call, overriding the `Context`'s. This brings `c2pa-node` in line with
`c2pa-web`, which already consumed the shared `ContextOptions` API.

Cancellation is observed at the engine's next progress checkpoint, so an asset that finishes
before reaching one completes normally. `Builder.sign` is synchronous and blocks the calling
thread: use `Builder.signAsync` for progress reporting or cancellation during signing.
