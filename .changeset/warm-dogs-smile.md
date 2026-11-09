---
'@contentauth/c2pa-utilities': patch
---

Reuse in-flight trust-resource fetches across concurrent settings resolutions using the global fetch and the same URL and effective fetch policy, without caching completed responses. Keep custom fetch implementations isolated to avoid sharing requests across mutable wrapper contexts.

Apply a 30-second trust-resource deadline covering retries and response-body consumption. Timeouts reject waiting resolutions and allow subsequent fetch attempts without silently substituting trust data.

Validate numeric fetch options before fetching: reject non-finite and negative values, require a safe-integer retry count, and document option-specific zero behavior.
