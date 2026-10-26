# ADR-009: Refusal threshold is 0.43 top cosine, and it is a floor, not the refusal mechanism

Date: 2026-10-24 · Status: **accepted**

## Context
`scripts/eval/calibrate.ts` put all 30 ANSWER and all 8 REFUSE rows of `golden_set_v1.1.csv`
through retrieval only (38 attempted, 38 measured, 0 failed). Top cosine:
ANSWER `min 0.399 · p25 0.528 · med 0.604 · p75 0.652 · max 0.736`;
REFUSE `min 0.382 · p25 0.409 · med 0.465 · p75 0.581 · max 0.638`. The groups overlap by 0.238,
because four REFUSE rows are legitimately in the corpus: R-01 (0.638) retrieves federal BEEG for
a Bavarian question, R-08 (0.615) Steuerklasse, R-06 (0.570) "will we be approved", R-05 (0.514)
"fill in our form". Reaching R-01 at 0.65 would refuse 22 of 30 answerable questions.

## Decision
0.43, applied to `max(cosine)` over the returned rows, never to `rrf` (ADR-008). It refuses
A-24/A-26/A-27 — the consular and residence rows the corpus cannot source yet — and catches
R-02/R-03/R-04/R-07. R-01/R-05/R-06/R-08 are refused by the scope and individual-case rules in
`answer.v1.md` instead, which is where RDG and StBerG reasoning belongs (legal pack §3).

## Alternatives
0.45: identical error counts, but leaves A-01 only 0.002 of margin, and A-01 swings 0.442–0.452
depending on whether glossary expansion fires. 0.39: refuses nothing answerable, leaves 7 of 8
REFUSE rows to the prompt alone. 0.53: catches one more REFUSE row by declining five more
answerable ones. 0.43 is the midpoint of the only usable gap — R-02 at 0.416 below, A-01 at 0.442
worst case above.

## Consequence
Every row in the 0.38–0.47 band has zero glossary expansion, so widening glossary triggers cannot
move the decision; it moves Phase 4's hit rate instead. Re-run `calibrate.ts` after any re-ingest:
composition changes rank order and nothing else reports it. A-24/A-26/A-27 must flip to answered
when consular curation lands — if they do not, the corpus, not the threshold, is the problem.
8 REFUSE rows is a small sample; this number is tuned to 8 questions, not to a class.

**Re-measured 2026-10-26** against `golden_set_v1.6.csv` (38 attempted, 38 measured, 0 failed) —
retrieval only, no model calls, so the credit outage did not block it. The decision stands at
0.43 and the REFUSE side is unchanged: R-02 0.416, R-03 0.393, R-04 0.414 and R-07 0.382 are still
the four it catches, R-01 0.638, R-05 0.514, R-06 0.570 and R-08 0.615 still the four left to the
prompt. Two figures above have **drifted** since this ADR was written, both from the glossary
widening of 2026-10-24:

- **ANSWER p25 is 0.550, not 0.528.** min, median, p75 and max are identical. The decision is
  unaffected: the only band that can move it is 0.38–0.47 and p25 sits above it.
- **A-27 now measures 0.550 and is no longer refused by the threshold** — the Decision paragraph
  above names it among the rows 0.43 refuses, and that is now false. It retrieves `AufenthG §33`
  as its top hit. The rows 0.43 refuses today are A-24 (0.399) and A-26 (0.425) only.

A-27 flipping to answered is this ADR's own stated success criterion being met early, by retrieval
improving rather than by consular curation landing. A-24 and A-26 still need the curated text.
A-01 is 0.452, the top of the 0.442–0.452 swing recorded under Alternatives.
