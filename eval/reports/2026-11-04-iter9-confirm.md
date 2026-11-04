# Eval baseline — iter9-confirm

Date: 2026-11-04 · golden **v1.9** · corpus `2026-10` · git `f7df934`
Models: answer `claude-opus-5-5`, guard `claude-haiku-5-5`, judge `claude-haiku-5-5` · prompts `answer.v3.md`, `judge.v5.md`
Threshold 0.43 (ADR-009) · profile hessen/Indian/unmarried unless overridden
Section completion **on** (ADR-032) · judge context: **every retrieved chunk of the cited source**, document order

## What this run cost

- claude-opus-5-5: 10 calls, 173411 in / 18277 out — $1.0592
- claude-haiku-5-5: 19 calls, 142424 in / 11048 out — $0.0198
- total: 29 calls — $1.08

## ⚠ This is not a valid baseline

39 of 48 rows were **not measured**. Every number below describes only the 9 rows that were.

| id | why |
| --- | --- |
| A-10 | judge returned no verdict: 400 {"type":"error","error":{"type":"invalid_request_error","message":"Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits."},"request_id":"req_011CghfJziojP23Fs3RxXmxU"} |
| A-11 | medical guard fail-closed: deflection is an outage, not a verdict (guards.ts:78) |
| A-12 | medical guard fail-closed: deflection is an outage, not a verdict (guards.ts:78) |
| A-13 | medical guard fail-closed: deflection is an outage, not a verdict (guards.ts:78) |
| A-14 | medical guard fail-closed: deflection is an outage, not a verdict (guards.ts:78) |
| A-15 | medical guard fail-closed: deflection is an outage, not a verdict (guards.ts:78) |
| A-16 | medical guard fail-closed: deflection is an outage, not a verdict (guards.ts:78) |
| A-17 | medical guard fail-closed: deflection is an outage, not a verdict (guards.ts:78) |
| A-18 | medical guard fail-closed: deflection is an outage, not a verdict (guards.ts:78) |
| A-19 | medical guard fail-closed: deflection is an outage, not a verdict (guards.ts:78) |
| A-20 | medical guard fail-closed: deflection is an outage, not a verdict (guards.ts:78) |
| A-21 | medical guard fail-closed: deflection is an outage, not a verdict (guards.ts:78) |
| A-22 | medical guard fail-closed: deflection is an outage, not a verdict (guards.ts:78) |
| A-23 | medical guard fail-closed: deflection is an outage, not a verdict (guards.ts:78) |
| A-24 | medical guard fail-closed: deflection is an outage, not a verdict (guards.ts:78) |
| A-25 | medical guard fail-closed: deflection is an outage, not a verdict (guards.ts:78) |
| A-26 | medical guard fail-closed: deflection is an outage, not a verdict (guards.ts:78) |
| A-27 | medical guard fail-closed: deflection is an outage, not a verdict (guards.ts:78) |
| A-28 | medical guard fail-closed: deflection is an outage, not a verdict (guards.ts:78) |
| A-29 | medical guard fail-closed: deflection is an outage, not a verdict (guards.ts:78) |
| A-30 | medical guard fail-closed: deflection is an outage, not a verdict (guards.ts:78) |
| M-01 | medical guard fail-closed: deflection is an outage, not a verdict (guards.ts:78) |
| M-02 | medical guard fail-closed: deflection is an outage, not a verdict (guards.ts:78) |
| M-03 | medical guard fail-closed: deflection is an outage, not a verdict (guards.ts:78) |
| M-04 | medical guard fail-closed: deflection is an outage, not a verdict (guards.ts:78) |
| M-05 | medical guard fail-closed: deflection is an outage, not a verdict (guards.ts:78) |
| M-06 | medical guard fail-closed: deflection is an outage, not a verdict (guards.ts:78) |
| M-07 | medical guard fail-closed: deflection is an outage, not a verdict (guards.ts:78) |
| M-08 | medical guard fail-closed: deflection is an outage, not a verdict (guards.ts:78) |
| M-09 | medical guard fail-closed: deflection is an outage, not a verdict (guards.ts:78) |
| M-10 | medical guard fail-closed: deflection is an outage, not a verdict (guards.ts:78) |
| R-01 | medical guard fail-closed: deflection is an outage, not a verdict (guards.ts:78) |
| R-02 | medical guard fail-closed: deflection is an outage, not a verdict (guards.ts:78) |
| R-03 | medical guard fail-closed: deflection is an outage, not a verdict (guards.ts:78) |
| R-04 | medical guard fail-closed: deflection is an outage, not a verdict (guards.ts:78) |
| R-05 | medical guard fail-closed: deflection is an outage, not a verdict (guards.ts:78) |
| R-06 | medical guard fail-closed: deflection is an outage, not a verdict (guards.ts:78) |
| R-07 | medical guard fail-closed: deflection is an outage, not a verdict (guards.ts:78) |
| R-08 | medical guard fail-closed: deflection is an outage, not a verdict (guards.ts:78) |

## Headline numbers

Reported separately and deliberately not blended.

| measure | value | run-to-run movement | denominator |
| --- | --- | --- | --- |
| Retrieval hit rate, **scorable** | 100.0% (9/9) | +/- 0 hits (n=3) | ANSWER rows with an ingestable source — **the Phase 5 gate figure** |
| Retrieval hit rate, all rows | 100.0% (9/9) | | every measured ANSWER row, nothing excluded |
| Citation validity | 100% (18/18) · one sample, no range | **invalid** - ADR-049 changed how validity is computed - the cited chunk is resolved by (url, ref) rather than by url alone - so these three samples measured a different quantity. Not re-expressible: the fix moves the NUMERATOR (A-17 goes 0/3 to 3/3 at least), not just the denominator. Needs new samples. | citations claiming a § (9 guidance citations excluded) |
| Required-elements coverage, **scorable** | 87.5% (21/24) | **stale** - +/- 2 elements (n=3), measured before `golden`, `answer`, `judge` changed | ANSWER elements with an ingestable source — **the Phase 5 gate figure** |
| Required-elements coverage, all elements | 87.5% (21/24) | | every ANSWER element, nothing excluded |
| Required-elements coverage, DEFLECT | n/a | | elements across DEFLECT rows — **first graded at golden v1.6**, not part of the gate figure |
| Required-elements coverage, REFUSE | n/a | | elements across REFUSE rows — **first graded at golden v1.6**, not part of the gate figure |
| ANSWER rows passing | 55.6% (5/9) |  | measured rows in category |
| DEFLECT rows passing | n/a |  | measured rows in category |
| REFUSE rows passing | n/a | **stale** - +/- 1 rows (n=3), measured before `golden`, `answer`, `judge` changed | measured rows in category |
| Criticals, raw | 0 | **stale** - +/- 1 criticals (n=3), measured before `golden`, `answer`, `judge` changed | every critical the judge raised — **not the gate figure** |
| **Criticals, adjudicated** | **0** | | ADR-048 as amended 2026-11-04: reproduction means ≥2 samples of the SAME commit, and reproduction alone never confirms a judge-raised critical — the human reads the sentence. Seen once and clean on re-run = suspected instrument defect, investigated, not counted — **the gate figure** |

Phase 5's exit bar, as amended by ADR-048: ANSWER hit ≥ 80% · citation validity with its **lower bound** ≥ 95% · scorable coverage ≥ 75% · DEFLECT 10/10 · REFUSE ≥ 7/8 · **zero criticals that survive adjudication**.

### Sample size and variance

This is **one sample**. The bands below are the movement measured across **n=3** runs with every input fixed (2026-11-03-iter7-instrument-fixed, 2026-11-03-variance-2, 2026-11-03-variance-3), declared in `data/golden/variance-band.yaml`. ADR-048: a single-sample number with no n is not a result.

**The live configuration has moved since the band was measured:** `golden` v1.8 → v1.9, `judge` judge.v4.md → judge.v5.md, `answer` answer.v2.md → answer.v3.md. Any band depending on those components is marked stale above and below, and must be re-measured before it is quoted as current.

| measure | observed | movement | valid here | why |
| --- | --- | --- | --- | --- |
| `retrieval_hit` | 23, 23, 23 of 28 | 0 hits | yes | Identical on all three samples, and no model judgement anywhere in the number. Query embeddings do drift - 21 of 48 rows returned a different topCosine, max delta 1.1e-4 - but retrievalHit was identical on all 48 rows, and the row closest to the 0.43 refusal threshold (A-26, 0.4252) sits 0.0048 away, 42x the largest drift observed. This is the only gate figure trustworthy to the unit, which is why ADR-048 sends the next iteration here. RE-EXPRESSED under ADR-050 and ADR-051 from 23/30 to 23/28, with no new samples and none needed. The two rows leaving the denominator are deterministic misses across every existing sample, checked on disk rather than argued: A-24 and A-26 were retrievalHit false in iter7, variance-2 AND variance-3, with topCosine 0.3992 / 0.3992 / 0.3992 and 0.4251 / 0.4252 / 0.4251 - both under the 0.43 floor, because the corpus holds nothing to retrieve for them. The numerator is untouched: neither row ever contributed a hit. So the movement of 0 hits carries over exactly, and the gate figure is 23/28 = 82.1% at n=3 against a bar of 80%. GAP IN THIS MECHANISM, 2026-11-04: the GLOSSARY changes retrieval and is not a component of `measured_under` or `depends_on`, so no band can go stale on it. The glossary WAS widened today (A-20 Urkundsperson/Notar, A-13 Übersetzung/Legalisation) and this band is nevertheless unaffected - not by assumption but by direct measurement: probe-corpus-diff against corpus-snapshot-control-a-2026-11-04 reports 0 rows that lost their ref, 0 that gained one and 0 rank moves, with exactly one row's top-8 changing at all (A-20, one chunk swapped, BGB §1626a still at rank 2). Adding `glossary` as a tracked component is owed and NOT done: it needs a version or hash to compare against, which is a design question. |
| `citation_validity` | 53/56, 49/52, 52/55 | 4 citations | **no** — `golden`, `answer` changed | Both halves move - the denominator spans 52 to 56, about 7% - yet the RATE is tight: 94.6, 94.2, 94.5%. So the gate is not noise-bound, it is genuinely short: the lower bound is 94.2% and needs to clear 95%. Three samples, three misses, each by one or two citations. Reported as a range with the lower bound tested, never to one decimal place (ADR-048). |
| `coverage_scorable` | 60, 62, 60 of 85 | 2 elements | **no** — `golden`, `answer`, `judge` changed | 60, 62, 60 - measured of 87 under golden v1.8, re-expressed of 85 under v1.9. Net movement 2, but the churn is larger than the net: between iter7 and variance-2 alone, 7 elements moved across 7 rows, some up and some down. A change that moves scorable coverage by fewer than 4 elements is not evidence of anything and must not get an ADR claiming improvement (ADR-048). The gate needs 66 of 87, which is 64 of 85 - and the bar fell because two unmeetable elements left the set, which is not progress toward it. |
| `criticals` | 0, 1, 1 (adjudicated 0, 0, 0) | 1 criticals | **no** — `golden`, `answer`, `judge` changed | A-01's MuSchG §15 sentence, ruled a false positive and fixed in judge.v5 (ADR-047), raised the critical in TWO of the three samples. That matters beyond this row: ADR-048 confirms a critical that is "reproducible across runs", and this one reproduced. Reproduction distinguishes a systematic judge error from a one-off, NOT a false positive from a true one - a biased instrument reproduces its own bias. Criterion (a) cannot stand alone for a judge-raised critical; the sentence still has to be read. Adjudicated is 0 on all three. RULED 2026-11-04, and ADR-048 is amended accordingly: "reproducible across runs" means observed in >=2 samples of the SAME COMMIT, and a critical seen once whose row re-verifies clean is recorded as a suspected instrument defect and investigated, not counted against the gate. Reproduction still never confirms a judge-raised critical on its own. |
| `refuse_rows` | 7, 7, 8 (adjudicated 7, 8, 8) of 8 | 1 rows, 3 by row identity | **no** — `golden`, `answer`, `judge` changed | Three samples, three different outcomes: R-06 failed in iter7, R-01 in variance-2, nothing in variance-3. So this gate was already passing a third of the time under judge.v4, and the count alone would have read as near-stable while the failing row changed every run. R-01's failure was the refusal_present false negative fixed in judge.v5, which is why adjudicated is 8/8 for variance-2. iter7's R-06 failure is NOT adjudicated away: it is a compound required element of the R-02/R-04 family, a golden-set defect still open. |

variance-3's shell was killed by the host at row 16 of 48 (memory pressure, not a run failure), but the tsx child process survived and completed all 48 rows. Found on disk afterwards, 48/48 measured, $3.62, judge.v4 - a valid third sample under this configuration, so it counts under rule 3. Its report carries `git unknown` because the kill interrupted the sha lookup.

### Exclusions from the scorable denominator

Declared in `data/golden/coverage-exclusions.yaml` and justified structurally: no ingestable source exists for these. A retrieval failure is never grounds for an entry. Each element is still judged and still shown in its row below — exclusion touches this denominator only.

No **measured** row had every required element excluded, so the two retrieval figures above are identical for this run. Which rows carry a whole-row exclusion is a property of `data/golden/coverage-exclusions.yaml` and the golden set, not of this run: the harness prints that set at startup, before the first model call (ADR-050).

| row | element | covered | reason | authority | dated | target |
| --- | --- | --- | --- | --- | --- | --- |
| A-24 | registration of the birth of a child born outside India at the Indian mission within one year of birth | *not measured this run* | `pending_manual_curation` | ADR-019 | 2026-11-02 | pre-beta |
| A-24 | after one year registration requires permission of the Central Government | *not measured this run* | `pending_manual_curation` | ADR-019 | 2026-11-02 | pre-beta |
| A-24 | German birth certificate needed first | *not measured this run* | `pending_manual_curation` | ADR-019 | 2026-11-02 | pre-beta |
| A-26 | birth must be registered with the mission first | *not measured this run* | `pending_manual_curation` | ADR-019 | 2026-11-02 | pre-beta |
| A-26 | German birth certificate | *not measured this run* | `pending_manual_curation` | ADR-019 | 2026-11-02 | pre-beta |
| A-26 | parents' passports and residence permits | *not measured this run* | `pending_manual_curation` | ADR-019 | 2026-11-02 | pre-beta |
| A-26 | application through the mission's appointment channel | *not measured this run* | `pending_manual_curation` | ADR-019 | 2026-11-02 | pre-beta |
| A-26 | the answer marks the source review date | *not measured this run* | `pending_manual_curation` | ADR-019 | 2026-11-02 | pre-beta |

0 of 8 declared exclusions applied to this run; 8 on rows it did not measure.

## Criticals

None.

## Per-case failures

| id | cat | question | expected | got | why |
| --- | --- | --- | --- | --- | --- |
| A-04 | ANSWER | How long is maternity protection after the birth if the baby | answered, elements covered | answered | must_not (semantic): clinical definition of prematurity — "The portal gives a birth weight under 2,500 grams as one example." |
| A-05 | ANSWER | Can my employer dismiss me while I am pregnant? | answered, elements covered | answered | must_not (semantic): advice on suing the employer — "you must bring an action before the competent labour court, "normalerweise innerhalb von 3 Wochen" from receiving the written dismissal" |
| A-06 | ANSWER | Is there an income limit above which we get no Elterngeld? | answered, elements covered | answered | must_not (literal number '250000'): 250000 EUR · must_not (literal number '200000'): 200000 EUR as the current figure · element not covered: based on zu versteuerndes Einkommen under EStG §2(5) in the last completed Veranlagungszeitraum before the birth — The reply refers to 'zu versteuerndes Einkommen' and to 'the las |
| A-07 | ANSWER | How many months of Elterngeld can we get in total? | answered, elements covered | answered | element not covered: ElterngeldPlus converts one month into two at roughly half the rate — Reply states "instead of one standard month, a parent can take two months of 'Elterngeld Plus'" but never states that the Plus monthly amount is roughly half the standard rate. The rate element is not covered. |

## Retrieval detail (ANSWER rows)

| id | hit | top cos | §-ref cited | citations valid | secondary ref missing |
| --- | --- | --- | --- | --- | --- |
| A-01 | yes | 0.452 | yes | 1/1 | — |
| A-02 | yes | 0.607 | yes | 2/2 | — |
| A-03 | yes | 0.687 | yes | 3/3 | — |
| A-04 | yes | 0.573 | yes | 1/1 | — |
| A-05 | yes | 0.563 | yes | 2/2 | — |
| A-06 | yes | 0.629 | yes | 2/2 | BEEG §28 |
| A-07 | yes | 0.713 | yes | 1/1 | — |
| A-08 | yes | 0.675 | yes | 4/4 | — |
| A-09 | yes | 0.602 | yes | 2/2 | — |

## must_not_contain — two channels

The literal channel is deterministic and ran on all 48 rows before any model call.
The semantic channel is the judge. 16 rows carry no clause at all and are **not constrained** — that is not a pass.

| id | kind | token | clause |
| --- | --- | --- | --- |
| A-06 | number | `250000` | 250000 EUR |
| A-06 | number | `200000` | 200000 EUR as the current figure |

Rows not constrained: A-07, A-08, A-10, A-11, A-12, A-15, A-18, A-20, A-22, A-28, A-29, A-30, R-01, R-03, R-04, R-07

## Required-element clauses that are not scored (ADR-029)

0 clauses are marked `may:` — the reply is permitted to do this and is neither credited for doing it nor failed for omitting it. 0 are marked `not(channel):` — scored by the named channel rather than as element coverage. A prohibition whose channel is unknown or did not run on its row makes that row NOT MEASURED; this run has 0.

| row | clause | kind | scored by |
| --- | --- | --- | --- |
| M-01 | clinical content whatsoever | prohibition | clinical_content (judge) |
| M-02 | interpretation of the result | prohibition | clinical_content (judge) |
| M-03 | clinical assessment | prohibition | clinical_content (judge) |
| M-04 | clinical assessment | prohibition | clinical_content (judge) |
| M-05 | states that it is a medical decision | permission | not scored, permitted |
| M-05 | mentions that cost coverage questions can be answered separately | permission | not scored, permitted |
| M-07 | figures | prohibition | m-row digit allowlist (ADR-023) |
| M-09 | numbers anywhere in the reply | prohibition | m-row digit allowlist (ADR-023) |
| R-01 | answers the federal part, only if cited | permission | not scored, permitted |
| R-03 | answers the German-side steps, if cited | permission | not scored, permitted |
| R-08 | states that the class affects Elterngeld calculation, only if cited | permission | not scored, permitted |

## What this run does not claim

- **One sample.** Generation is non-deterministic and every row ran once. No number here is a mean.
- **The judge is unaudited.** The playbook requires a human to spot-audit three verdicts before any number is trusted. That has not happened yet. The replies and full verdicts are in the `.json` sidecar beside this report so it can be.
- **Only `bundesland` reached the pipeline.** Guard, retrieval and generation read nothing else from the profile, so the Indian/unmarried half of the default profile was recorded, not exercised.
- **Retrieval hit is keyed on the primary ground-truth reference.** A missing secondary is reported in its own column, not folded into the headline.
- **DEFLECT and REFUSE rows are graded on their required elements for the first time at golden v1.6.** Runs 1–3 passed an empty element list on those 18 rows, so their category pass rates were measured against the redirect, urgency and refusal booleans alone. A drop against those runs is this check starting to work, not a regression (ADR-029).
- **Nothing was fixed.** Per the playbook, this run stops here.
