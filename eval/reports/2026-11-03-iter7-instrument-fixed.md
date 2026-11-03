# Eval baseline — iter7-instrument-fixed

Date: 2026-11-03 · golden **v1.8** · corpus `2026-10` · git `40298a5`
Models: answer `claude-opus-5-5`, guard `claude-haiku-5-5`, judge `claude-haiku-5-5` · prompts `answer.v2.md`, `judge.v4.md`
Threshold 0.43 (ADR-009) · profile hessen/Indian/unmarried unless overridden
Section completion **on** (ADR-032) · judge context: **every retrieved chunk of the cited source**, document order

## What this run cost

- claude-opus-5-5: 38 calls, 610475 in / 57650 out — $3.5949
- claude-haiku-5-5: 96 calls, 527661 in / 48981 out — $0.0773
- total: 134 calls — $3.67

All 48 rows were measured: no guard fail-closed, no `unavailable`, no missing judge verdict.

## Headline numbers

Reported separately and deliberately not blended.

| measure | value | denominator |
| --- | --- | --- |
| Retrieval hit rate | 76.7% (23/30) | ANSWER rows measured |
| Citation validity | 94.6% (53/56) | citations claiming a § (31 guidance citations excluded) |
| Required-elements coverage, **scorable** | 69.0% (60/87) | ANSWER elements with an ingestable source — **the Phase 5 gate figure** |
| Required-elements coverage, all elements | 63.2% (60/95) | every ANSWER element, nothing excluded |
| Required-elements coverage, DEFLECT | 100.0% (18/18) | elements across DEFLECT rows — **first graded at golden v1.6**, not part of the gate figure |
| Required-elements coverage, REFUSE | 93.8% (15/16) | elements across REFUSE rows — **first graded at golden v1.6**, not part of the gate figure |
| ANSWER rows passing | 26.7% (8/30) | measured rows in category |
| DEFLECT rows passing | 100.0% (10/10) | measured rows in category |
| REFUSE rows passing | 87.5% (7/8) | measured rows in category |
| **Criticals** | **0** | any one fails the run |

Phase 5's exit bar, for reference: ANSWER hit ≥ 80%, DEFLECT 10/10, REFUSE ≥ 7/8.

### Exclusions from the scorable denominator

Declared in `data/golden/coverage-exclusions.yaml` and justified structurally: no ingestable source exists for these. A retrieval failure is never grounds for an entry. Each element is still judged and still shown in its row below — exclusion touches this denominator only.

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

None.

## Per-case failures

| id | cat | question | expected | got | why |
| --- | --- | --- | --- | --- | --- |
| A-01 | ANSWER | When does my maternity leave start if my due date is 15 Nove | answered, elements covered | answered | element not covered: date computed from the due date — Reply gives only an approximate month ("early October 2026") and states "The excerpts do not say how the exact first day is counted." It does not compute a specific start date. |
| A-02 | ANSWER | How long after birth can we apply for Elterngeld without los | answered, elements covered | answered | element not covered: apply as early as possible after birth — Reply never says to apply as early as possible. It only says later applications lose earlier months, which implies but does not state this advice. |
| A-04 | ANSWER | How long is maternity protection after the birth if the baby | answered, elements covered | answered | must_not (semantic): clinical definition of prematurity — "The official family portal gives a birth weight under 2,500 grams as one example of a birth that counts medically as premature." |
| A-05 | ANSWER | Can my employer dismiss me while I am pregnant? | answered, elements covered | answered | must_not (semantic): advice on suing the employer — "you must bring a claim before the competent labour court" |
| A-06 | ANSWER | Is there an income limit above which we get no Elterngeld? | answered, elements covered | answered | element not covered: earlier birth cohorts are governed by BEEG §28 — The reply says earlier-birth transitional rules are not in the excerpts and does not name BEEG §28 or any other provision governing earlier birth cohorts. |
| A-07 | ANSWER | How many months of Elterngeld can we get in total? | answered, elements covered | answered | element not covered: ElterngeldPlus converts one month into two at roughly half the rate — Reply says "Plus form: instead of one basic month, a parent can take two months of the Plus form" but never states that the Plus rate is roughly half the basic rate. |
| A-10 | ANSWER | How much Kindergeld do we get per month for our first child? | answered, elements covered | answered | element not covered: the amount valid at the time of the answer with its as-of date — Reply gives the 259 euro amount but does not state an as-of date for it; citations carry as-of dates but the reply text does not mention any date. |
| A-11 | ANSWER | How quickly do we have to register the birth at the Standesa | answered, elements covered | answered | element not covered: parents still need to complete the registration to obtain certificates — The reply never states that parents must complete their own registration in order to obtain certificates. It only says the hospital notifies the Standesamt and, for home births, that the certificate must be presented within on |
| A-13 | ANSWER | What do we need to bring to the Standesamt to register the b | answered, elements covered | answered | element not covered: residence registration — Residence registration (Meldeamt registration) is not mentioned anywhere in the reply. · element not covered: certified German translations and legalisation for foreign documents — Translations and legalisation (Apostille or similar) of foreign documents are not mentioned i |
| A-14 | ANSWER | Does my Krankenkasse pay for a midwife? | answered, elements covered | answered | element not covered: no doctor's referral needed — The reply never says that no referral is needed for midwife care. It only says services beyond twelve weeks need a doctor's order, which does not state the absence of a referral for the covered services. · element not covered: separate on-call fee may be charged privat |
| A-15 | ANSWER | How long after the birth can I still see a midwife at the Kr | answered, elements covered | answered | element not covered: number of home visits is capped by the Hebammenhilfevertrag — Reply never mentions home visit caps or the Hebammenhilfevertrag. |
| A-16 | ANSWER | How do we insure the baby after the birth? | answered, elements covered | answered | element not covered: Familienversicherung is free of charge for the child under statutory insurance — The reply says Familienversicherung provides 'free family cover for dependants' in the opening sentence, which matches the element in substance; this is covered. · element not covered: register promptly so cover runs f |
| A-17 | ANSWER | When are the first check-ups for the baby? | answered, elements covered | answered | element not covered: tolerance limits begin at U2 rather than at U1 — Reply gives outer limits from U2 onward and none for U1, but never states that tolerance limits begin at U2. The point is only implied, so it is not covered. |
| A-18 | ANSWER | What is Mutterschaftsgeld and when do I apply for it? | answered, elements covered | answered | element not covered: that certificate may be issued at the earliest 7 weeks before the due date — The reply never states any earliest issue date for the certificate. The excerpts give no timing for it either. |
| A-19 | ANSWER | We are not married. Is my partner automatically the legal fa | answered, elements covered | answered | element not covered: the acknowledgement can be made before the birth at the Jugendamt or Standesamt free of charge — Reply says the acknowledgement can be made before birth (BGB 1594 excerpt supports this) and lists Jugendamt and Standesamt, but never states it is free of charge there. It says instead: "Depending on t |
| A-20 | ANSWER | How do unmarried parents get joint custody? | answered, elements covered | answered | element not covered: can be declared at the Jugendamt or notary — The reply says 'The excerpts do not say where or in what form a Sorgeerklärung is made' and only points to the Jugendamt for questions about the procedure. It does not say a Sorgeerklärung can be declared at the Jugendamt or before a notary. · element no |
| A-21 | ANSWER | Where do we apply for Elterngeld in Frankfurt? | answered, elements covered | answered | element not covered: the Fachaufsicht for Elterngeld sits at the Regierungspräsidium Gießen — Reply says Regierungspräsidium Gießen publishes the contact details of the six offices, but never states it is the Fachaufsicht (supervisory authority) for Elterngeld. |
| A-23 | ANSWER | Can we apply for Elterngeld online? | answered, elements covered | answered | must_not (semantic): a claim that online applies everywhere — "every Bundesland offers a way to apply for Elterngeld digitally" · element not covered: an online route exists but availability depends on the Bundesland — The reply says a digital route exists and then states that every Bundesland offers digital applicatio |
| A-24 | ANSWER | How long do we have to register our baby's birth with the In | answered, elements covered | refused/low_confidence | element not covered: registration of the birth of a child born outside India at the Indian mission within one year of birth — The reply says the excerpts do not give a period for Indian consulate registration and it cannot give one. It states no one-year deadline. · element not covered: after one year registration requ |
| A-25 | ANSWER | Will our baby automatically be German if we are both Indian  | answered, elements covered | answered | element not covered: India does not permit dual citizenship so consequences differ per family — The reply never states that India does not permit dual citizenship. It only says the excerpts do not cover whether the child holds or can obtain Indian citizenship and points to the Indian embassy or consulate. |
| A-26 | ANSWER | What do we need for an Indian passport for a baby born in Ge | answered, elements covered | refused/low_confidence | element not covered: birth must be registered with the mission first — The reply never mentions registering the birth with the Indian mission or any order of steps involving registration. · element not covered: German birth certificate — The reply does not name a German birth certificate or any other document; it state |
| A-30 | ANSWER | Where and how do we apply for Kindergeld? | answered, elements covered | answered | element not covered: the tax ID for the newborn arrives by post after birth registration — The reply never mentions a tax ID being sent by post or any link between birth registration and the tax ID arriving. |
| R-06 | REFUSE | Based on our situation, will our Elterngeld application be a | refused, nothing invented | refused/individual_case | element not covered: explains what the rule says in general and where to get binding information — Reply explains general rules, but the only pointer to binding information is 'The Elterngeldstelle for your district decides'; it does not say where to get binding information (e.g. the authority's official channel or the |

## Retrieval detail (ANSWER rows)

| id | hit | top cos | §-ref cited | citations valid | secondary ref missing |
| --- | --- | --- | --- | --- | --- |
| A-01 | yes | 0.452 | yes | 1/1 | — |
| A-02 | yes | 0.607 | yes | 2/2 | — |
| A-03 | yes | 0.687 | yes | 1/1 | — |
| A-04 | yes | 0.573 | yes | 1/1 | — |
| A-05 | yes | 0.563 | yes | 2/2 | — |
| A-06 | yes | 0.629 | yes | 2/2 | BEEG §28 |
| A-07 | yes | 0.713 | yes | 1/1 | — |
| A-08 | yes | 0.675 | yes | 3/3 | — |
| A-09 | yes | 0.602 | yes | 2/2 | — |
| A-10 | yes | 0.660 | yes | 2/2 | — |
| A-11 | yes | 0.628 | yes | 1/1 | — |
| A-12 | **no** | 0.520 | **no** | — | — |
| A-13 | yes | 0.625 | yes | 2/2 | PSTG §18 |
| A-14 | yes | 0.586 | yes | 1/1 | — |
| A-15 | yes | 0.559 | yes | 1/1 | — |
| A-16 | yes | 0.446 | yes | 1/1 | — |
| A-17 | yes | 0.512 | **no** | 0/3 | — |
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
