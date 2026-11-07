---
'@contentauth/c2pa-node': patch
---

Reuse native C2PA context handles across Node readers and builders for each Context's identical resolved settings, avoiding repeated settings transfer and parsing.

Successful settings resolution remains memoized within each JavaScript Context. Create a new Context to resolve updated trust resources; existing Readers and Builders retain their construction-time settings.
