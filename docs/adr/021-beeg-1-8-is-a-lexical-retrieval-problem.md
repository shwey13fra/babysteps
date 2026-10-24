# ADR-021: BEEG §1(8) is reached through the lexical half, not by re-chunking §1

Date: 2026-10-24 · Status: **accepted**

## Context
A-06 ("is there an income limit…") refused: retrieval returned BEEG §2, §8 and §10 but never
§1(8), which carries the 175 000 € figure. §1 is titled *Berechtigte* and the chunk holding
paragraph (8) is otherwise a list of residence-permit conditions, so its embedding sits far from
an English income question — §1 ranked `vec_pos 13`. Expansion cannot fix that half: `retrieve.ts`
embeds the **original** question by design, so no glossary edit changes the vector ranking. What
expansion can do is feed the lexical half the rare statutory words the paragraph actually uses.

## Decision
Add `zu versteuerndes Einkommen` (gloss "taxable income") to the glossary, with multi-word English
triggers and `expand_with: [zu versteuerndes Einkommen, Veranlagungszeitraum, Einkommensteuergesetz,
Anspruch entfällt]` — every term verbatim from the ingested §1(8). `Veranlagungszeitraum` is rare
enough to put §1 at **`fts_pos 1`**, which lifts it to rank 5 of 8 through RRF. A-06 now answers
with 175 000 € citing BEEG §1.

## Alternatives
Re-chunk §1 by Absatz so (8) gets its own embedding — the better long-term fix and almost
certainly right, but it is a re-ingest that moves every chunk id and re-opens corpus composition
(ADR-017), which is a Phase 5 single-variable change, not a same-day one. Raise `match_count` —
rejected, brief §4 caps context at top-8. Tune `rrf_k`/`candidate_pool` — rejected, ADR-008 says
not before Run #3.

## Consequence
Triggers are deliberately multi-word: a bare `income` would fire on R-08, pulling German
statutory vocabulary into a Steuerberatungsgesetz question that must stay out of scope. A test
guards that. ADR-009 is unaffected — re-measured, both distributions and the cost at 0.43 are
unchanged, because no REFUSE or DEFLECT row gained an expansion. **Open consequence:** with §1
retrieved, the answer also reproduces familienportal's birth-cohort table and fixes boundary dates
that BEEG §28 leaves ambiguous — which is what ADR-018 decided this project would not assert.
That tension is unresolved here and is the reason this ADR does not claim A-06 is finished.
