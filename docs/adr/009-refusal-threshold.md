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
