---
'@contentauth/c2pa-utilities': minor
---

Add Context options to configure trust-resource retries, HTTPS enforcement, and in-flight deduplication.

HTTPS enforcement rejects all redirects before contacting their targets and isolates strict requests from permissive in-flight requests. Document equivalent-policy request sharing and explicit undefined overrides of Context options. Completed responses are not cached; successful settings remain memoized only within each Context.
