# ADR-020: Glossary triggers match the phrasings users actually type, and one phrasing is excluded on purpose

Date: 2026-10-24 · Status: **accepted**

## Context
7 of 30 ANSWER rows in the golden set produced **no** glossary expansion, so the lexical half of
`match_chunks` ran them against raw English with no German stems — the dead weight `expand.ts`
exists to prevent. The causes were phrasing, not vocabulary: triggers held the past participle
(`dismissed while pregnant`) while A-05 asks "Can my employer **dismiss me**"; `check ups for the
baby` cannot match A-17's hyphenated "check-ups"; `\bcitizenship\b` does not match A-25's
"citizens"; the three `residence permit` triggers were all longer phrases than A-27's question;
and `Partnerschaftsbonus` (A-08) had no entry at all.

## Decision
Widen the triggers on Kündigungsschutz, Vorsorgeuntersuchung, Staatsangehörigkeit and
Aufenthaltserlaubnis, and add `Partnerschaftsbonus` as a term (gloss "partnership bonus months",
`expand_with` taken from the ingested familienportal text, not invented). **Do not** add
`passport for my baby` to Staatsangehörigkeit: that is golden row R-03, a Chinese-passport
question that must stay out of scope, and expanding it with German nationality vocabulary would
push an out-of-scope row toward the answer side of ADR-009.

## Alternatives
Normalise punctuation and stem the question before matching — rejected for now: it replaces an
auditable list with behaviour nobody can read off the file, and the glossary doubles as the UI's
gloss source. Leave it and let Phase 5 tune retrieval — rejected: this is a data defect with a
measurable cost, not a tuning parameter.

## Consequence
Unexpanded ANSWER rows 7 → **2** (A-24 and A-26, both consular, unhelpable until the corpus has
consular text). **A-27 moved 0.410 → 0.550 and its top hit changed from `BKGG §1` to `AufenthG
§33`, its own ground-truth source** — a recovered retrieval hit, not just a score. ADR-009's 0.43
is confirmed, not disturbed: re-measured, the REFUSE distribution is unchanged to three decimals
(min 0.382 · med 0.465 · max 0.638) because no REFUSE or DEFLECT row gained an expansion, and the
cost at 0.43 fell from 3 wrongly-refused ANSWER rows to 2. Every trigger added is a string anyone
can grep; re-run `calibrate.ts` after any future glossary edit, because this file is now proven to
move retrieval.
