# Eval baseline — iter8-completeness

Date: 2026-11-04 · golden **v1.9** · corpus `2026-10` · git `unknown`
Models: answer `claude-opus-5-5`, guard `claude-haiku-5-5`, judge `claude-haiku-5-5` · prompts `answer.v3.md`, `judge.v5.md`
Threshold 0.43 (ADR-009) · profile hessen/Indian/unmarried unless overridden
Section completion **on** (ADR-032) · judge context: **every retrieved chunk of the cited source**, document order

## What this run cost

- claude-opus-5-5: 38 calls, 659541 in / 67180 out — $3.9818
- claude-haiku-5-5: 96 calls, 598831 in / 52874 out — $0.0863
- total: 134 calls — $4.07

All 48 rows were measured: no guard fail-closed, no `unavailable`, no missing judge verdict.

## Headline numbers

Reported separately and deliberately not blended.

| measure | value | run-to-run movement | denominator |
| --- | --- | --- | --- |
| Retrieval hit rate, **scorable** | 82.1% (23/28) | +/- 0 hits (n=3) | ANSWER rows with an ingestable source — **the Phase 5 gate figure** |
| Retrieval hit rate, all rows | 76.7% (23/30) | | every measured ANSWER row, nothing excluded |
| Citation validity | 100% (60/60) · one sample, no range | **invalid** - ADR-049 changed how validity is computed - the cited chunk is resolved by (url, ref) rather than by url alone - so these three samples measured a different quantity. Not re-expressible: the fix moves the NUMERATOR (A-17 goes 0/3 to 3/3 at least), not just the denominator. Needs new samples. | citations claiming a § (36 guidance citations excluded) |
| Required-elements coverage, **scorable** | 77.6% (66/85) | **stale** - +/- 2 elements (n=3), measured before `golden`, `answer`, `judge` changed | ANSWER elements with an ingestable source — **the Phase 5 gate figure** |
| Required-elements coverage, all elements | 71.0% (66/93) | | every ANSWER element, nothing excluded |
| Required-elements coverage, DEFLECT | 100.0% (18/18) | | elements across DEFLECT rows — **first graded at golden v1.6**, not part of the gate figure |
| Required-elements coverage, REFUSE | 100.0% (16/16) | | elements across REFUSE rows — **first graded at golden v1.6**, not part of the gate figure |
| ANSWER rows passing | 40.0% (12/30) |  | measured rows in category |
| DEFLECT rows passing | 100.0% (10/10) |  | measured rows in category |
| REFUSE rows passing | 87.5% (7/8) | **stale** - +/- 1 rows (n=3), measured before `golden`, `answer`, `judge` changed | measured rows in category |
| Criticals, raw | 2 | **stale** - +/- 1 criticals (n=3), measured before `golden`, `answer`, `judge` changed | every critical the judge raised — **not the gate figure** |
| **Criticals, adjudicated** | **pending** | | ADR-048 as amended 2026-11-04: reproduction means ≥2 samples of the SAME commit, and reproduction alone never confirms a judge-raised critical — the human reads the sentence. Seen once and clean on re-run = suspected instrument defect, investigated, not counted — **the gate figure** |

**Read the retrieval figure carefully.** 82.1% (23/28) after excluding A-24/A-26 as unretrievable, consistent with their prior exclusion from coverage (ADR-043). **Unchanged on the original denominator: 76.7% (23/30). No retrieval behaviour changed** (ADR-050).

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

**Retrieval, too (ADR-050).** `A-24`, `A-26` have every required element declared unreachable, so they also leave the scorable retrieval denominator: 28 rows rather than 30. The hit is still measured and still printed per row. A partially-excluded row stays in.

| row | element | covered | reason | authority | dated | target |
| --- | --- | --- | --- | --- | --- | --- |
| A-24 | registration of the birth of a child born outside India at the Indian mission within one year of birth | no | `pending_manual_curation` | ADR-019 | 2026-11-02 | pre-beta |
| A-24 | after one year registration requires permission of the Central Government | no | `pending_manual_curation` | ADR-019 | 2026-11-02 | pre-beta |
| A-24 | German birth certificate needed first | no | `pending_manual_curation` | ADR-019 | 2026-11-02 | pre-beta |
| A-26 | birth must be registered with the mission first | no | `pending_manual_curation` | ADR-019 | 2026-11-02 | pre-beta |
| A-26 | German birth certificate | no | `pending_manual_curation` | ADR-019 | 2026-11-02 | pre-beta |
| A-26 | parents' passports and residence permits | no | `pending_manual_curation` | ADR-019 | 2026-11-02 | pre-beta |
| A-26 | application through the mission's appointment channel | no | `pending_manual_curation` | ADR-019 | 2026-11-02 | pre-beta |
| A-26 | the answer marks the source review date | no | `pending_manual_curation` | ADR-019 | 2026-11-02 | pre-beta |

8 of 8 declared exclusions applied to this run.

## Criticals

| id | critical |
| --- | --- |
| A-16 | uncited legal claim — The reply says 'free family cover for dependants', a claim that the cover costs nothing. No supplied excerpt states that Familienversicherung is free of charge; the SGB V §10 excerpt sets out eligibility and says the child is 'versichert' but says nothing about cost. |
| A-20 | uncited legal claim — The reply says: 'A single declaration is a Sorgeerklärung (declaration of joint custody).' Sorgeerklärungen require the declaration of both parents, as the cited BGB §1626a(1) No. 1 and the familienportal excerpt both state ('Erklärung beider Elternteile'). No excerpt supports the claim that a single declaration counts. |

## Per-case failures

| id | cat | question | expected | got | why |
| --- | --- | --- | --- | --- | --- |
| A-04 | ANSWER | How long is maternity protection after the birth if the baby | answered, elements covered | answered | must_not (semantic): clinical definition of prematurity — "A premature birth in the medical sense (Frühgeburt): the period after the birth is extended to twelve weeks (§3(2)). ... The Familienportal gives a birth weight under 2,500 grams as an example of a Frühgeburt." |
| A-05 | ANSWER | Can my employer dismiss me while I am pregnant? | answered, elements covered | answered | must_not (semantic): advice on suing the employer — "you must bring a claim before the competent labour court to have the dismissal declared invalid" |
| A-06 | ANSWER | Is there an income limit above which we get no Elterngeld? | answered, elements covered | answered | element not covered: earlier birth cohorts are governed by BEEG §28 — The reply says earlier births had different, higher limits but says the transitional provision is not among its excerpts and does not name BEEG §28. |
| A-10 | ANSWER | How much Kindergeld do we get per month for our first child? | answered, elements covered | answered | element not covered: the amount valid at the time of the answer with its as-of date — The reply gives 259 euros but never states an as-of date or says when that amount was valid. The citations carry dates, but the reply does not state them. |
| A-11 | ANSWER | How quickly do we have to register the birth at the Standesa | answered, elements covered | answered | element not covered: parents still need to complete the registration to obtain certificates — The reply says the Standesamt issues the birth certificate and that parents must present the certificate within one week for home births. It never says parents must complete the registration before they can obtain certificates |
| A-13 | ANSWER | What do we need to bring to the Standesamt to register the b | answered, elements covered | answered | element not covered: residence registration — The reply never mentions residence registration (Meldeanmeldung or Einwohnermeldeamt). · element not covered: parents' own birth certificates — The reply requires the parents' own birth certificates only conditionally: for married parents only if the marriage certificate do |
| A-14 | ANSWER | Does my Krankenkasse pay for a midwife? | answered, elements covered | answered | element not covered: no doctor's referral needed — Reply says care beyond 12 weeks postpartum requires a doctor's order, but never states that no referral is needed for covered midwife care. Not stated explicitly. · element not covered: separate on-call fee may be charged privately — Reply mentions only that privately  |
| A-15 | ANSWER | How long after the birth can I still see a midwife at the Kr | answered, elements covered | answered | element not covered: number of home visits is capped by the Hebammenhilfevertrag — The reply never mentions the Hebammenhilfevertrag or any cap on the number of home visits. |
| A-16 | ANSWER | How do we insure the baby after the birth? | answered, elements covered | answered | element not covered: the child's insurance number is needed for other applications — The reply never mentions an insurance number or its use in other applications. |
| A-18 | ANSWER | What is Mutterschaftsgeld and when do I apply for it? | answered, elements covered | answered | element not covered: that certificate may be issued at the earliest 7 weeks before the due date — The reply never mentions the earliest issue date of the certificate or any 7-week window; the only timing given is the 6-week protection period start, which is a different item. |
| A-19 | ANSWER | We are not married. Is my partner automatically the legal fa | answered, elements covered | answered | element not covered: the acknowledgement can be made before the birth at the Jugendamt or Standesamt free of charge — Reply says the acknowledgement can be made before birth and lists Jugendamt and Standesamt, but never says it is free of charge. It states the opposite possibility: "Depending on the federal state, ackn |
| A-20 | ANSWER | How do unmarried parents get joint custody? | answered, elements covered | answered | element not covered: free at the Jugendamt — The reply never says the declarations or the Jugendamt advice cost nothing. No cited excerpt mentions cost either. |
| A-21 | ANSWER | Where do we apply for Elterngeld in Frankfurt? | answered, elements covered | answered | element not covered: the answer names the authority, links its page, and states that this is Hessen-specific — Reply names the Regierungspräsidium Gießen and refers to 'Its Elterngeld page' but contains no hyperlink to the page; it does state the Hessen-specific offices. Link is not present in the reply text, so not fu |
| A-23 | ANSWER | Can we apply for Elterngeld online? | answered, elements covered | answered | must_not (semantic): a claim that online applies everywhere — "Yes. The Familienportal says that every Bundesland offers a way to apply for Elterngeld (parental allowance) digitally" · element not covered: an online route exists but availability depends on the Bundesland — The reply says the online route exists in ever |
| A-24 | ANSWER | How long do we have to register our baby's birth with the In | answered, elements covered | refused/low_confidence | element not covered: registration of the birth of a child born outside India at the Indian mission within one year of birth — The reply says the excerpts do not give any time limit for Indian registration and that it cannot give the period. It only tells the user to contact the consulate or embassy. · element not cover |
| A-25 | ANSWER | Will our baby automatically be German if we are both Indian  | answered, elements covered | answered | element not covered: India does not permit dual citizenship so consequences differ per family — The reply never mentions Indian citizenship law, dual citizenship, or how consequences might differ for this family. |
| A-26 | ANSWER | What do we need for an Indian passport for a baby born in Ge | answered, elements covered | refused/low_confidence | element not covered: birth must be registered with the mission first — The reply never mentions birth registration or that it must precede the passport application. · element not covered: German birth certificate — The reply does not mention a German birth certificate or any other document. · element not covered: paren |
| A-30 | ANSWER | Where and how do we apply for Kindergeld? | answered, elements covered | answered | element not covered: the tax ID for the newborn arrives by post after birth registration — The reply never mentions the newborn's tax ID being sent by post or its timing relative to birth registration. |
| R-01 | REFUSE | What are the Elterngeld rules for a self-employed parent in  | refused, nothing invented | answered | expected a refusal, got answered |

## Retrieval detail (ANSWER rows)

| id | hit | top cos | §-ref cited | citations valid | secondary ref missing |
| --- | --- | --- | --- | --- | --- |
| A-01 | yes | 0.452 | yes | 2/2 | — |
| A-02 | yes | 0.607 | yes | 2/2 | — |
| A-03 | yes | 0.687 | yes | 2/2 | — |
| A-04 | yes | 0.573 | yes | 2/2 | — |
| A-05 | yes | 0.563 | yes | 2/2 | — |
| A-06 | yes | 0.629 | yes | 2/2 | BEEG §28 |
| A-07 | yes | 0.713 | yes | 1/1 | — |
| A-08 | yes | 0.675 | yes | 4/4 | — |
| A-09 | yes | 0.602 | yes | 2/2 | — |
| A-10 | yes | 0.660 | yes | 2/2 | — |
| A-11 | yes | 0.628 | yes | 1/1 | — |
| A-12 | **no** | 0.520 | **no** | — | — |
| A-13 | yes | 0.625 | yes | 3/3 | PSTG §18 |
| A-14 | yes | 0.587 | yes | 1/1 | — |
| A-15 | yes | 0.559 | yes | 1/1 | — |
| A-16 | yes | 0.446 | yes | 1/1 | — |
| A-17 | yes | 0.512 | **no** | 2/2 | — |
| A-18 | yes | 0.736 | yes | 4/4 | — |
| A-19 | yes | 0.468 | yes | 2/2 | — |
| A-20 | yes | 0.551 | yes | 3/3 | — |
| A-21 | **no** | 0.631 | n/a | 2/2 | — |
| A-22 | **no** | 0.702 | n/a | 2/2 | — |
| A-23 | **no** | 0.674 | n/a | 1/1 | — |
| A-24 | **no** | 0.399 | n/a | — | — |
| A-25 | yes | 0.576 | yes | 3/3 | — |
| A-26 | **no** | 0.425 | n/a | — | — |
| A-27 | yes | 0.550 | yes | 3/3 | — |
| A-28 | yes | 0.690 | yes | 3/3 | — |
| A-29 | yes | 0.610 | yes | 4/4 | — |
| A-30 | **no** | 0.699 | **no** | 3/3 | — |

## must_not_contain — two channels

The literal channel is deterministic and ran on all 48 rows before any model call.
The semantic channel is the judge. 16 rows carry no clause at all and are **not constrained** — that is not a pass.

No literal violations.

Rows not constrained: A-07, A-08, A-10, A-11, A-12, A-15, A-18, A-20, A-22, A-28, A-29, A-30, R-01, R-03, R-04, R-07

## Required-element clauses that are not scored (ADR-029)

5 clauses are marked `may:` — the reply is permitted to do this and is neither credited for doing it nor failed for omitting it. 6 are marked `not(channel):` — scored by the named channel rather than as element coverage. A prohibition whose channel is unknown or did not run on its row makes that row NOT MEASURED; this run has 0.

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
