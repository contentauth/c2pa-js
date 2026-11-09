---
"@contentauth/c2pa-node": minor
"@contentauth/c2pa-web": minor
---

Remove deprecated raw-settings SDK creation paths in favor of Context.

- Node: remove synchronous `Builder.new`/`Builder.withJson`, raw settings factory arguments, and the `C2paSettings`, `SettingsContext`, `TrustConfig` and `VerifyConfig` types. Use `newAsync`/`withJsonAsync` and pass a Context to Reader/Builder factories. Omitted contexts use shared defaults; explicit null is no longer accepted.
- Web, including `/inline`: remove `Config.settings`, `c2pa.reader`/`c2pa.builder` and their factory types. Pass a Context to the static Reader/Builder methods.
- Re-export the single utilities Context class from Node and both web entry points without bundling a separate copy. Context subclasses retain constructor identity and compatible types across packages resolving the same utilities version.

The current Settings configuration types and low-level helpers remain available for constructing Context configuration. Native/WASM settings serialization is unchanged.
