---
'@contentauth/c2pa-node': patch
---

Reuse native C2PA context handles across Node readers and builders for each Context's identical resolved settings, avoiding repeated settings transfer and parsing.
