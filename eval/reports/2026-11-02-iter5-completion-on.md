# Eval baseline — iter5-completion-on

Date: 2026-11-02 · golden **v1.7** · corpus `2026-10` · git `6d7347f`
Models: answer `claude-opus-5-5`, guard `claude-haiku-5-5`, judge `claude-haiku-5-5` · prompts `answer.v2.md`, `judge.v2.md`
Threshold 0.43 (ADR-009) · profile hessen/Indian/unmarried unless overridden
Section completion **on** (ADR-032) · judge context: **every retrieved chunk of the cited source**, document order

## What this run cost

- claude-opus-5-5: 38 calls, 614121 in / 56885 out — $3.5942
- claude-haiku-5-5: 96 calls, 492038 in / 51838 out — $0.0751
- total: 134 calls — $3.67

All 48 rows were measured: no guard fail-closed, no `unavailable`, no missing judge verdict.

## Headline numbers

Reported separately and deliberately not blended.

| measure | value | denominator |
| --- | --- | --- |
| Retrieval hit rate | 80.0% (24/30) | ANSWER rows measured |
| Citation validity | 95.6% (43/45) | citations claiming a § (37 guidance citations excluded) |
| Required-elements coverage | 57.9% (55/95) | elements across ANSWER rows — the Phase 5 gate figure |
| Required-elements coverage, DEFLECT | 100.0% (18/18) | elements across DEFLECT rows — **first graded at golden v1.6**, not part of the gate figure |
| Required-elements coverage, REFUSE | 100.0% (16/16) | elements across REFUSE rows — **first graded at golden v1.6**, not part of the gate figure |
| ANSWER rows passing | 16.7% (5/30) | measured rows in category |
| DEFLECT rows passing | 100.0% (10/10) | measured rows in category |
| REFUSE rows passing | 87.5% (7/8) | measured rows in category |
| **Criticals** | **4** | any one fails the run |

Phase 5's exit bar, for reference: ANSWER hit ≥ 80%, DEFLECT 10/10, REFUSE ≥ 7/8.

## Criticals

| id | critical |
| --- | --- |
| A-06 | uncited legal claim — The reply asserts a procedure: 'is decided by the Elterngeldstelle for your district'. No supplied excerpt says that the Elterngeldstelle decides whether the limit applies, so this procedural requirement is absent from all excerpts. |
| A-16 | uncited legal claim — Reply states 'Whether your baby qualifies for family cover is decided by the parent's statutory health insurance fund.' No supplied excerpt says eligibility for Familienversicherung is decided by the parent's fund; SGB V §10 excerpt sets conditions and reporting duties only. |
| A-18 | uncited legal claim — The reply states the application route as a procedure: "If you are statutorily insured, contact your statutory health insurer." No supplied excerpt says a statutory insured woman must apply by contacting her health insurer; the excerpts only say the Bundesamt pays on application for non-members. |
| A-29 | uncited legal claim — The reply says 'Whether you are entitled, and how much you would receive while working, is decided only by your Elterngeldstelle.' No supplied excerpt says the Elterngeldstelle alone decides entitlement or amount. The excerpts mention the Elterngeldstelle only as a contact for births before 1 September 2021. |

## Per-case failures

| id | cat | question | expected | got | why |
| --- | --- | --- | --- | --- | --- |
| A-01 | ANSWER | When does my maternity leave start if my due date is 15 Nove | answered, elements covered | answered | element not covered: date computed from the due date — The reply says the period is counted from the certificate's expected date but explicitly declines to compute a start date: "this answer does not fix a start date." No date is computed from 15 November 2026. |
| A-02 | ANSWER | How long after birth can we apply for Elterngeld without los | answered, elements covered | answered | element not covered: apply as early as possible after birth — Reply never tells the user to apply early. It only says a later application loses the earliest months, which is an implication, not an instruction. |
| A-04 | ANSWER | How long is maternity protection after the birth if the baby | answered, elements covered | answered | must_not (semantic): clinical definition of prematurity — "The Familienportal gives one example of a birth that counts medically as premature: a baby weighing less than 2,500 grams at birth. A baby born only a few days early is not automatically a "Frühgeburt"." |
| A-05 | ANSWER | Can my employer dismiss me while I am pregnant? | answered, elements covered | answered | must_not (semantic): advice on suing the employer — "you must bring a claim before the competent labour court ("Klage vor dem zuständigen Arbeitsgericht"), normally within 3 weeks of receiving the written dismissal" |
| A-06 | ANSWER | Is there an income limit above which we get no Elterngeld? | answered, elements covered | answered | element not covered: based on zu versteuerndes Einkommen under EStG §2(5) in the last completed Veranlagungszeitraum before the birth — The reply refers to taxable income and to 'im letzten abgeschlossenen Veranlagungszeitraum vor der Geburt', but never names EStG §2(5) or the EStG basis, so the element is only partly  |
| A-07 | ANSWER | How many months of Elterngeld can we get in total? | answered, elements covered | answered | element not covered: 14 months when one parent's employment income is reduced in two of the months — The reply gives the components (12 basic months plus "two further months, the partner months, if one parent's earned income is reduced in two months") but never states the total of 14 for that case. · element not covere |
| A-10 | ANSWER | How much Kindergeld do we get per month for our first child? | answered, elements covered | answered | element not covered: the amount valid at the time of the answer with its as-of date — Reply gives 259 euros but does not state any as-of date; the citations carry 'as of 2026-10-22' but the reply text itself does not state a date. |
| A-11 | ANSWER | How quickly do we have to register the birth at the Standesa | answered, elements covered | answered | element not covered: parents still need to complete the registration to obtain certificates — Reply says the facility notifies the Standesamt and sends the certificate, but never states that parents must still complete the registration themselves to obtain certificates. |
| A-13 | ANSWER | What do we need to bring to the Standesamt to register the b | answered, elements covered | answered | must_not (semantic): a promise that this list is complete at every office — "The official sources name one document for registering a birth at the Standesamt (civil registry office): the birth notification issued when the child is born." · element not covered: passports of both parents — The reply never mentions passpo |
| A-14 | ANSWER | Does my Krankenkasse pay for a midwife? | answered, elements covered | answered | element not covered: no doctor's referral needed — The reply only says that services beyond twelve weeks postpartum need a doctor's order. It never states that midwife care itself needs no referral. · element not covered: separate on-call fee may be charged privately — The reply does not mention any on-call fee or sepa |
| A-15 | ANSWER | How long after the birth can I still see a midwife at the Kr | answered, elements covered | answered | element not covered: number of home visits is capped by the Hebammenhilfevertrag — The reply never mentions home visits, a cap on their number, or the Hebammenhilfevertrag. |
| A-16 | ANSWER | How do we insure the baby after the birth? | answered, elements covered | answered | element not covered: register promptly so cover runs from the date of birth — Reply gives a 1-week registry office deadline but never says cover runs from the date of birth or links prompt registration to start of cover. · element not covered: the child's insurance number is needed for other applications — Reply never  |
| A-17 | ANSWER | When are the first check-ups for the baby? | answered, elements covered | answered | element not covered: tolerance limits begin at U2 rather than at U1 — Reply says 'Each has a set time window and a wider tolerance limit', which implies U1 has one, and gives no statement that tolerance limits start at U2. The reply does not state this element. |
| A-18 | ANSWER | What is Mutterschaftsgeld and when do I apply for it? | answered, elements covered | answered | element not covered: that certificate may be issued at the earliest 7 weeks before the due date — Reply never mentions how early the certificate may be issued; no 7-week figure appears. |
| A-19 | ANSWER | We are not married. Is my partner automatically the legal fa | answered, elements covered | answered | element not covered: the acknowledgement can be made before the birth at the Jugendamt or Standesamt free of charge — The reply says the acknowledgement can be made before birth and lists the Jugendamt and Standesamt as offices, but never says it is free of charge there. It says the opposite for other offices: "Dependi |
| A-20 | ANSWER | How do unmarried parents get joint custody? | answered, elements covered | answered | element not covered: free at the Jugendamt — The reply never states that the Jugendamt service or the declaration is free of charge. |
| A-21 | ANSWER | Where do we apply for Elterngeld in Frankfurt? | answered, elements covered | answered | element not covered: Elterngeld in Hessen is handled by one of the sechs hessischen Ämter für Versorgung und Soziales (HÄVS), the one responsible for the place of residence — The reply mentions 'the six Hessian offices for welfare and social affairs' only as contacts on a page. It never states that Hessen's Elterngeld  |
| A-22 | ANSWER | Where do we apply for Elterngeld in Berlin? | answered, elements covered | answered | element not covered: the answer states that this is Berlin-specific — The reply says the responsible office is designated by each state and does not name a Berlin-specific office; it mentions Service Berlin and ElterngeldDigital covering Berlin, but does not state the Elterngeldstelle routing itself is Berlin-specific. |
| A-23 | ANSWER | Can we apply for Elterngeld online? | answered, elements covered | answered | must_not (semantic): a claim that online applies everywhere — "The federal family portal says that in every Bundesland it is possible to apply for Elterngeld (parental allowance) digitally" · element not covered: an online route exists but availability depends on the Bundesland — The reply opens with 'in every Bundesla |
| A-24 | ANSWER | How long do we have to register our baby's birth with the In | answered, elements covered | refused/low_confidence | element not covered: registration of the birth of a child born outside India at the Indian mission within one year of birth — The reply says the excerpts do not say how long registration with the Indian consulate takes and gives no one-year period. It states no time limit for the Indian step. · element not covered: aft |
| A-25 | ANSWER | Will our baby automatically be German if we are both Indian  | answered, elements covered | answered | must_not (semantic): an assessment of whether this specific family qualifies — "If both parents are Indian citizens, this route does not apply." · individual-case verdict (rule 13), not a critical on this row per the spec · element not covered: India does not permit dual citizenship so consequences differ per family —  |
| A-26 | ANSWER | What do we need for an Indian passport for a baby born in Ge | answered, elements covered | refused/low_confidence | element not covered: birth must be registered with the mission first — The reply does not mention birth registration with the Indian mission at all. · element not covered: German birth certificate — The reply does not mention a German birth certificate or any document list. · element not covered: parents' passports and |
| A-27 | ANSWER | Does our newborn need a residence permit? | answered, elements covered | answered | element not covered: the Ausländerbehörde is the responsible authority — Reply says 'contact your local immigration authority' and 'decided by the authority'; it never names the Ausländerbehörde, so the specific authority is not stated. |
| A-29 | ANSWER | Can I work while receiving Elterngeld? | answered, elements covered | answered |  |
| A-30 | ANSWER | Where and how do we apply for Kindergeld? | answered, elements covered | answered | element not covered: the tax ID for the newborn arrives by post after birth registration — The reply never mentions a tax ID arriving by post or birth registration as its source. |
| R-01 | REFUSE | What are the Elterngeld rules for a self-employed parent in  | refused, nothing invented | answered | expected a refusal, got answered |

## Retrieval detail (ANSWER rows)

| id | hit | top cos | §-ref cited | citations valid | secondary ref missing |
| --- | --- | --- | --- | --- | --- |
| A-01 | yes | 0.452 | yes | 1/1 | — |
| A-02 | yes | 0.607 | yes | 2/2 | — |
| A-03 | yes | 0.687 | yes | 2/2 | — |
| A-04 | yes | 0.573 | yes | 1/1 | — |
| A-05 | yes | 0.563 | yes | 2/2 | — |
| A-06 | yes | 0.629 | yes | 2/2 | BEEG §28 |
| A-07 | yes | 0.713 | yes | 1/1 | — |
| A-08 | yes | 0.675 | yes | 3/3 | — |
| A-09 | yes | 0.602 | yes | 1/1 | — |
| A-10 | yes | 0.660 | yes | 2/2 | — |
| A-11 | yes | 0.628 | yes | 1/1 | — |
| A-12 | yes | 0.520 | yes | 1/1 | — |
| A-13 | yes | 0.625 | yes | 1/1 | — |
| A-14 | yes | 0.586 | n/a | — | — |
| A-15 | yes | 0.559 | n/a | — | — |
| A-16 | yes | 0.493 | n/a | — | — |
| A-17 | yes | 0.512 | **no** | 0/2 | — |
| A-18 | yes | 0.736 | yes | 2/2 | — |
| A-19 | yes | 0.468 | yes | 2/2 | — |
| A-20 | yes | 0.551 | yes | 1/1 | — |
| A-21 | **no** | 0.631 | n/a | 2/2 | — |
| A-22 | **no** | 0.702 | n/a | 2/2 | — |
| A-23 | **no** | 0.674 | n/a | 1/1 | — |
| A-24 | **no** | 0.399 | n/a | — | — |
| A-25 | yes | 0.576 | yes | 2/2 | — |
| A-26 | **no** | 0.425 | n/a | — | — |
| A-27 | yes | 0.550 | yes | 2/2 | — |
| A-28 | yes | 0.690 | yes | 2/2 | — |
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
