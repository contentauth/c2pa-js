---
'@contentauth/c2pa-web': minor
'@contentauth/c2pa-wasm': minor
---

Add `crJson()` to `Reader`, exposing the asset's manifest store as crJSON (backed by `c2pa-rs`'s `Reader::crjson`). Bumps the `c2pa` workspace dependency to `=0.78.6` to pick up the new method; this also updates the default `Builder` actions assertion label from `c2pa.actions` to `c2pa.actions.v2`, and the corresponding test has been updated.
