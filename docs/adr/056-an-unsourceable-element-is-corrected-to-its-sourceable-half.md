# ADR-056 — Correct an element to its sourceable half before deleting it

Date: 2026-11-04 · Human ruling · Golden: v1.10 · Follows: ADR-053 (removal), v1.7 (correction)

Context: A-16 element 1 asserted *"Familienversicherung is free of charge for the child under
statutory insurance"* and raised a critical in iter8. SGB V §10 says who is covered, never what it
costs; SGB V §3 and §223, which govern contributions, are **not ingested** (`only_sections:
["10","24d","24i"]`). So the claim is unsourceable, and the glossary gloss that carried it is
already fixed.

Decision, ruled by the human: **delete only if no provision in the corpus carries the fact — and
search before editing.** A literal scan of every chunk for seven phrasings returned 37 matches and
none about the child, so the "free of charge" claim goes. But the element bundled two claims, and
its other half — *the child is covered under a parent's statutory insurance* — **is** §10(1)
verbatim. That half is kept, as the A-17 correction kept Kinder-RL §2's.

Alternative: delete the whole element, as ADR-053 did for A-02 and A-16 element 3. Rejected here:
deletion would stop the row requiring the actual answer to its own question, and it would shrink a
gate denominator for the third time in Phase 5. Correction keeps ANSWER at 93 and scorable at 85.

Consequence: **a measurement correction, not an improvement** — if coverage rises it is because an
unmeetable element became meetable. The rule generalises: an element wrong *in part* is corrected
against the source text; only an element with no sourceable half is removed.
