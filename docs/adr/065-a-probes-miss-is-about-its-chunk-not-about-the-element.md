# ADR-065 — a probe's miss is about its chunk, not about the element

Date: 2026-11-05 · Status: accepted · **Corrects a claim in ADR-063**

## Context

Earlier on 2026-11-05 I reported R-05's surviving element — *"points to the official application
route"* — as a **deterministic retrieval miss**, and built three conclusions on it: that no prompt
or golden change could reach it, that REFUSE's ceiling was therefore 7/8 against a ≥7/8 bar, and
that the gate was **structurally pinned**. ADR-063's table records the third as fact.

The measurement behind it was correct. `probe-element-reach --row R-05` reported that the chunk
matching `/Wo kann ich den Antrag stellen|bei einer Elterngeldstelle vor Ort oder digital/` is not
in that row's ranked top-8, and that is reproducibly true: it is embedding similarity against a
fixed corpus, with no model judgement in it.

**The inference was wrong.** `iter12-v5-2` scored R-05 **pass**, both elements covered. The model
satisfied the element from a different chunk, citing the Familienportal's official how-to-apply page
and naming the Elterngeldstelle as the office to ask. REFUSE came in at **8/8**.

The error: I wrote the probe's `carries` regex myself, naming one chunk as *the* carrying chunk, and
then read its absence as the element being unreachable. The probe answers "is **this** chunk in the
top-8". It cannot answer "can this element be satisfied", because it does not know what else in the
top-8 might satisfy it. The tool's own output line — *"A MISS here is a retrieval problem"* — is a
statement about that chunk, and I read it as a statement about the row.

## Decision

A `probe-element-reach` MISS licenses exactly one claim: **that chunk, for that query, is outside
the ranked top-8.** It does not establish that an element is unreachable, that a gate has a ceiling,
or that a gap is structural. To claim an element is unreachable, the evidence is a corpus-wide
absence of the fact — the `0 chunks` standard already used for A-14, A-25 and A-20 — not one
regex's rank.

## Consequence

ADR-063's REFUSE row is **wrong** and is corrected by this ADR: the gate is not pinned, it is
noise-bound. Both of Phase 5's failing gates are now straddles, with the bar between two samples.
The general principle in ADR-063 is untouched — a lower bound still cannot be raised by sampling —
but it was applied to REFUSE on a false premise, and a sound principle on a false premise gives a
confident wrong answer. **Fourth instance of this project's recurring error: reasoning from an
artefact's label instead of the artefact.**
