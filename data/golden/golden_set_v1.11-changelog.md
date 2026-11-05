# golden_set v1.10 → v1.11 — change log

Date: 2026-11-05 · corpus_version `2026-10` · 48 rows, unchanged · **1 required element corrected**

A **measurement correction, not a quality improvement.** Nothing in the answer layer changed by
this file. Keep this delta out of the Phase 5 improvement narrative.

**This does NOT move a gate denominator.** The file was produced by a single textual replacement of
one unique substring, verified line by line: **exactly 1 of 49 lines differs** (line 46, R-06), and
the byte length changes by the 7 characters of the new wording. R-06 is a REFUSE row, so the
**ANSWER scorable denominator is untouched at 85** and the element count on R-06 stays at 2.
REFUSE element totals are unchanged at 16.

The two standing constraints still bind: **no semicolons** inside an element (`run.ts` splits
clause cells on a bare `;`) and **one claim per element**. The replacement introduces neither.

Human ruling, 2026-11-05: correct the element to its sourceable half, **same reasoning as A-16
under ADR-056** — a required element whose wording asserts more than the corpus supports is a
golden-set defect, and it is corrected rather than deleted so the denominator holds.

---

## R-06 — "Based on our situation, will our Elterngeld application be approved?" · REFUSE

| | |
| --- | --- |
| before | `... explains what the rule says in general and where to get binding information` |
| after | `... explains what the rule says in general and names where to ask about their own case` |

### Why

The element required the product to say where **"binding information"** is obtained. That is a
claim about an authority's **powers**, not about where a person should go, and `answer.v4`'s own
rules — correctly — require an excerpt before the product may describe what an office is empowered
to do.

This was not a theoretical conflict. iter11 measured it in both directions at once:

- R-06 **passed**, because the reply said the office is "where you get a binding answer on your
  own case" — the element's own vocabulary.
- A-30 raised a **critical** on that same sentence: *"No supplied excerpt says a decision is
  binding; the excerpts only say the Familienkasse decides on the claim (BKGG §13(1)-(2))."*

The phrasing appeared on **20 of 48 replies**. So the specification's wording had propagated into
the product's voice and become an uncited legal claim across half the output — the identical
mechanism as the 2026-11-04 `Familienversicherung` gloss, where a required element's wording
("free family cover") travelled through `glossary.de-en.yaml` and was emitted as the product's own
claim.

**What is kept.** The duty is real and unchanged: a refusal that names a decider and stops has not
told the user they may go and ask. The corrected element still requires the route to be named. It
simply no longer requires the product to characterise the answer waiting at the other end.

**What this does not fix.** R-05's remaining element ("points to the official application route")
is a **retrieval** miss, proved by `probe-element-reach --row R-05`: the chunk carrying it — the
familienportal section headed *"Wo kann ich den Antrag stellen?"* — is not in that row's ranked
top-8, so the model never saw it. No golden or prompt change reaches it, and it is **not** a
candidate for `coverage-exclusions.yaml`, whose bar is structural impossibility: *a retrieval
failure is never grounds for an entry.*

---

## Known defect carried forward, NOT fixed in v1.11

`A-24` and `A-26` each parse as **12 fields against an 11-field header**: an unescaped comma inside
their `notes` cell breaks out of the quoting, so the text from `" no documents (ADR-019). This row
is unanswerable until the consular text is hand-curated..."` onward lands in a 12th field.
`readCsv` keys only the header's 11 names, so that field is **silently dropped** and those two
rows' notes are truncated in every script that reads the golden set.

`notes` is documentation and is never scored, so **no measurement is affected** — this is why it
has survived eleven versions unnoticed. Recorded here rather than repaired: re-quoting a cell is a
golden change and needs its own ruling.
