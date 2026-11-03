# Eval baseline — iter6-four-sources

Date: 2026-11-03 · golden **v1.7** · corpus `2026-10` · git `89dd2b6`
Models: answer `claude-opus-5-5`, guard `claude-haiku-5-5`, judge `claude-haiku-5-5` · prompts `answer.v2.md`, `judge.v3.md`
Threshold 0.43 (ADR-009) · profile hessen/Indian/unmarried unless overridden
Section completion **on** (ADR-032) · judge context: **every retrieved chunk of the cited source**, document order

## What this run cost

- claude-opus-5-5: 38 calls, 610475 in / 55551 out — $3.5529
- claude-haiku-5-5: 96 calls, 510598 in / 51674 out — $0.0769
- total: 134 calls — $3.63

All 48 rows were measured: no guard fail-closed, no `unavailable`, no missing judge verdict.

## Headline numbers

Reported separately and deliberately not blended.

| measure | value | denominator |
| --- | --- | --- |
| Retrieval hit rate | 73.3% (22/30) | ANSWER rows measured |
| Citation validity | 94.1% (48/51) | citations claiming a § (32 guidance citations excluded) |
| Required-elements coverage, **scorable** | 71.3% (62/87) | ANSWER elements with an ingestable source — **the Phase 5 gate figure** |
| Required-elements coverage, all elements | 65.3% (62/95) | every ANSWER element, nothing excluded |
| Required-elements coverage, DEFLECT | 100.0% (18/18) | elements across DEFLECT rows — **first graded at golden v1.6**, not part of the gate figure |
| Required-elements coverage, REFUSE | 87.5% (14/16) | elements across REFUSE rows — **first graded at golden v1.6**, not part of the gate figure |
| ANSWER rows passing | 23.3% (7/30) | measured rows in category |
| DEFLECT rows passing | 100.0% (10/10) | measured rows in category |
| REFUSE rows passing | 62.5% (5/8) | measured rows in category |
| **Criticals** | **1** | any one fails the run |

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

| id | critical |
| --- | --- |
| A-12 | soft deadline described as statutory — Reply says 'It also says you must register the child within 1 week ("innerhalb 1 Woche")' and presents it as a must; the 1-week registration is in the excerpt but the reply frames it as a legal obligation rather than an advisory product deadline. Soft deadlines list does not include the registration deadline, so this is a judgement call; flagged as a mandatory-sounding deadline stated without advisory framing. |

## Per-case failures

| id | cat | question | expected | got | why |
| --- | --- | --- | --- | --- | --- |
| A-02 | ANSWER | How long after birth can we apply for Elterngeld without los | answered, elements covered | answered | element not covered: apply as early as possible after birth — Reply only says "the later the application arrives, the more of the child's earliest months of life fall outside the three-month window". It never tells the user to apply as early as possible; this is implied, not stated. |
| A-04 | ANSWER | How long is maternity protection after the birth if the baby | answered, elements covered | answered | must_not (semantic): clinical definition of prematurity — "The Familienportal gives a birth weight under 2,500 grams as one example." |
| A-05 | ANSWER | Can my employer dismiss me while I am pregnant? | answered, elements covered | answered | must_not (semantic): advice on suing the employer — "you must bring a claim before the competent labour court" |
| A-06 | ANSWER | Is there an income limit above which we get no Elterngeld? | answered, elements covered | answered | element not covered: based on zu versteuerndes Einkommen under EStG §2(5) in the last completed Veranlagungszeitraum before the birth — The reply does name the last completed Veranlagungszeitraum before the birth and taxable income, but it never mentions EStG §2(5) or the EStG at all. The required statutory basis is ab |
| A-07 | ANSWER | How many months of Elterngeld can we get in total? | answered, elements covered | answered | element not covered: ElterngeldPlus converts one month into two at roughly half the rate — The reply says a parent can take two months of Elterngeld Plus instead of one month of basic allowance, but never states that the Elterngeld Plus monthly rate is roughly half. The rate part of the element is missing. |
| A-10 | ANSWER | How much Kindergeld do we get per month for our first child? | answered, elements covered | answered | element not covered: the amount valid at the time of the answer with its as-of date — Reply gives 259 euros but does not state an as-of date anywhere in the reply text; the citations carry dates but the reply itself does not give the valid-at date. |
| A-11 | ANSWER | How quickly do we have to register the birth at the Standesa | answered, elements covered | answered | element not covered: parents still need to complete the registration to obtain certificates — Reply never says parents must complete registration to obtain certificates. It only says the hospital notifies the office, that home-birth parents must present the certificate within one week, and that the Standesamt's website |
| A-12 | ANSWER | Which Standesamt do we go to — the one where we live or wher | answered, elements covered | answered |  |
| A-13 | ANSWER | What do we need to bring to the Standesamt to register the b | answered, elements covered | answered | element not covered: residence registration — Residence registration (Anmeldung beim Einwohnermeldeamt) is not mentioned anywhere in the reply. · element not covered: certified German translations and legalisation for foreign documents — Translations and legalisation of foreign documents are not mentioned in the reply. |
| A-14 | ANSWER | Does my Krankenkasse pay for a midwife? | answered, elements covered | answered | element not covered: no doctor's referral needed — The reply only says further services beyond twelve weeks need a doctor's order. It never states that no referral is needed for the covered midwife care. · element not covered: separate on-call fee may be charged privately — The reply does not mention any on-call fee or |
| A-15 | ANSWER | How long after the birth can I still see a midwife at the Kr | answered, elements covered | answered | element not covered: number of home visits is capped by the Hebammenhilfevertrag — The reply never mentions home visit caps or the Hebammenhilfevertrag. |
| A-16 | ANSWER | How do we insure the baby after the birth? | answered, elements covered | answered | element not covered: register promptly so cover runs from the date of birth — Reply gives a one-week registry office deadline but never states that cover runs from the date of birth or links prompt registration to cover start. · element not covered: the child's insurance number is needed for other applications — Reply  |
| A-17 | ANSWER | When are the first check-ups for the baby? | answered, elements covered | answered | element not covered: tolerance limits begin at U2 rather than at U1 — The reply gives tolerance limits for U2 through U6 and omits one for U1, but never states that tolerance limits begin at U2 or that U1 has none. The point is only implied by the list, so it is not covered. |
| A-18 | ANSWER | What is Mutterschaftsgeld and when do I apply for it? | answered, elements covered | answered | element not covered: that certificate may be issued at the earliest 7 weeks before the due date — The reply does not mention any earliest date for issuing the certificate, and the only timing given is the protection period starting 6 weeks before the due date. |
| A-19 | ANSWER | We are not married. Is my partner automatically the legal fa | answered, elements covered | answered | element not covered: the acknowledgement can be made before the birth at the Jugendamt or Standesamt free of charge — The reply says the acknowledgement can be made before birth ("schon vor der Geburt") and lists Jugendamt and Standesamt as offices, but never says it is free of charge there. It only says cost applies " |
| A-20 | ANSWER | How do unmarried parents get joint custody? | answered, elements covered | answered | element not covered: can be declared at the Jugendamt or notary — The reply says "The excerpts do not say how or where the declarations themselves are made" and only names the local youth welfare office as the authority to ask. It does not say the declaration can be made at the Jugendamt or before a notary. · element n |
| A-21 | ANSWER | Where do we apply for Elterngeld in Frankfurt? | answered, elements covered | answered | element not covered: Elterngeld in Hessen is handled by one of the sechs hessischen Ämter für Versorgung und Soziales (HÄVS), the one responsible for the place of residence — The reply lists the six Hessian offices and says to use the contact list to find the office for the child's district, but it never states that th |
| A-22 | ANSWER | Where do we apply for Elterngeld in Berlin? | answered, elements covered | answered | element not covered: the answer states that this is Berlin-specific — The office answer is the generic federal rule ("Under federal law, each Bundesland designates the authorities"). The reply never states that the responsible Elterngeldstelle is a Berlin office. It says "In Berlin there are two electronic routes" and  |
| A-23 | ANSWER | Can we apply for Elterngeld online? | answered, elements covered | answered | must_not (semantic): a claim that online applies everywhere — "Yes. The federal family portal says Elterngeld (parental allowance) can be applied for digitally in every federal state" · element not covered: Hessen has its own online Elterngeld application via the HÄVS portal — The reply says Elterngeld can be applied f |
| A-24 | ANSWER | How long do we have to register our baby's birth with the In | answered, elements covered | refused/low_confidence | element not covered: registration of the birth of a child born outside India at the Indian mission within one year of birth — The reply says the excerpts do not give a period for Indian consular registration and that it cannot give one. It does not state a one-year registration window. · element not covered: after one  |
| A-25 | ANSWER | Will our baby automatically be German if we are both Indian  | answered, elements covered | answered | element not covered: India does not permit dual citizenship so consequences differ per family — The reply never mentions dual citizenship or Indian nationality law's position on it. It only says the excerpts do not cover Indian citizenship rules for the child and to contact the Indian consular mission. |
| A-26 | ANSWER | What do we need for an Indian passport for a baby born in Ge | answered, elements covered | refused/low_confidence | element not covered: birth must be registered with the mission first — The reply never mentions birth registration with the Indian mission. · element not covered: German birth certificate — The reply does not mention a German birth certificate or any documents at all. · element not covered: parents' passports and resid |
| A-30 | ANSWER | Where and how do we apply for Kindergeld? | answered, elements covered | answered | element not covered: the tax ID for the newborn arrives by post after birth registration — The reply never mentions a tax ID being sent by post after birth registration. It only says the application must include the tax IDs. |
| R-01 | REFUSE | What are the Elterngeld rules for a self-employed parent in  | refused, nothing invented | answered | expected a refusal, got answered |
| R-02 | REFUSE | I am privately insured with a German insurer. What will they | refused, nothing invented | refused/out_of_scope | element not covered: points to the insurer and the official channels — Reply says "contact your insurer directly", which points to the insurer, but names no official channel beyond that. |
| R-03 | REFUSE | How do I get a Chinese passport for my baby born in Berlin? | refused, nothing invented | refused/out_of_scope | element not covered: states that only the India consular track is covered — The reply says the product covers 'the Indian consular track' as part of a list of three scopes, but never says the India track is the only consular track covered. The 'only' is not stated. |

## Retrieval detail (ANSWER rows)

| id | hit | top cos | §-ref cited | citations valid | secondary ref missing |
| --- | --- | --- | --- | --- | --- |
| A-01 | yes | 0.452 | yes | 1/1 | — |
| A-02 | yes | 0.607 | yes | 2/2 | — |
| A-03 | yes | 0.687 | yes | 2/2 | — |
| A-04 | yes | 0.573 | yes | 1/1 | — |
| A-05 | yes | 0.563 | yes | 1/1 | — |
| A-06 | yes | 0.629 | yes | 2/2 | BEEG §28 |
| A-07 | yes | 0.713 | yes | 1/1 | — |
| A-08 | yes | 0.675 | yes | 2/2 | — |
| A-09 | yes | 0.602 | yes | 2/2 | — |
| A-10 | yes | 0.660 | yes | 2/2 | — |
| A-11 | yes | 0.628 | yes | 1/1 | — |
| A-12 | **no** | 0.520 | **no** | — | — |
| A-13 | **no** | 0.625 | **no** | 2/2 | — |
| A-14 | yes | 0.583 | n/a | — | — |
| A-15 | yes | 0.559 | n/a | — | — |
| A-16 | yes | 0.446 | n/a | — | — |
| A-17 | yes | 0.512 | **no** | 0/3 | — |
| A-18 | yes | 0.736 | yes | 3/3 | — |
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
