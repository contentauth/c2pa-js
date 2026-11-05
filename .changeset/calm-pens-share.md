---
'@contentauth/c2pa-utilities': minor
---

Add Context options to configure trust-resource retries, HTTPS enforcement, in-flight deduplication, and successful-response caching.

HTTPS enforcement rejects all redirects before contacting their targets and isolates strict requests from permissive cache entries. Document zero-TTL behavior, equivalent-policy cache reuse, and explicit undefined overrides of Context options.
