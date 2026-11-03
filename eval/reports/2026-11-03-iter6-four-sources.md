# Eval baseline — iter6-four-sources

Date: 2026-11-03 · golden **v1.7** · corpus `2026-10` · git `2143393`
Models: answer `claude-opus-5-5`, guard `claude-haiku-5-5`, judge `claude-haiku-5-5` · prompts `answer.v2.md`, `judge.v3.md`
Threshold 0.43 (ADR-009) · profile hessen/Indian/unmarried unless overridden
Section completion **on** (ADR-032) · judge context: **every retrieved chunk of the cited source**, document order

## What this run cost

- claude-opus-5-5: 29 calls, 441158 in / 45659 out — $2.6778
- claude-haiku-5-5: 59 calls, 365280 in / 34237 out — $0.0536
- total: 88 calls — $2.73

## ⚠ This is not a valid baseline

19 of 48 rows were **not measured**. Every number below describes only the 29 rows that were.

| id | why |
| --- | --- |
| A-30 | answer path returned 'unavailable': our outage, not a refusal (ADR-022) |
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

| measure | value | denominator |
| --- | --- | --- |
| Retrieval hit rate | 75.9% (22/29) | ANSWER rows measured |
| Citation validity | 93.9% (46/49) | citations claiming a § (33 guidance citations excluded) |
| Required-elements coverage, **scorable** | 65.5% (55/84) | ANSWER elements with an ingestable source — **the Phase 5 gate figure** |
| Required-elements coverage, all elements | 59.8% (55/92) | every ANSWER element, nothing excluded |
| Required-elements coverage, DEFLECT | n/a | elements across DEFLECT rows — **first graded at golden v1.6**, not part of the gate figure |
| Required-elements coverage, REFUSE | n/a | elements across REFUSE rows — **first graded at golden v1.6**, not part of the gate figure |
| ANSWER rows passing | 24.1% (7/29) | measured rows in category |
| DEFLECT rows passing | n/a | measured rows in category |
| REFUSE rows passing | n/a | measured rows in category |
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
| A-01 | ANSWER | When does my maternity leave start if my due date is 15 Nove | answered, elements covered | answered | element not covered: date computed from the due date — The reply says that if the certificate gives 15 November 2026 the period is the six weeks leading to that date, but it does not compute the start date. It says the excerpts do not fix the exact first day. |
| A-02 | ANSWER | How long after birth can we apply for Elterngeld without los | answered, elements covered | answered | element not covered: apply as early as possible after birth — Reply only says an application received within the first months keeps those months payable and later applications lose months. It never tells the user to apply as early as possible, so this is implied rather than stated. |
| A-04 | ANSWER | How long is maternity protection after the birth if the baby | answered, elements covered | answered | must_not (semantic): clinical definition of prematurity — "The family portal gives a birth weight under 2,500 grams as one example of a premature birth." |
| A-05 | ANSWER | Can my employer dismiss me while I am pregnant? | answered, elements covered | answered | must_not (semantic): advice on suing the employer — "you must bring a claim before the competent labour court (Arbeitsgericht), "normalerweise innerhalb von 3 Wochen" (normally within 3 weeks) of receiving the written dismissal. ... You can bring the claim yourself or through a lawyer, and you can also make it orally a |
| A-06 | ANSWER | Is there an income limit above which we get no Elterngeld? | answered, elements covered | answered | element not covered: based on zu versteuerndes Einkommen under EStG §2(5) in the last completed Veranlagungszeitraum before the birth — Reply refers to "the last completed tax assessment period before the birth" and to taxable income, but never mentions EStG §2(5) or the term zu versteuerndes Einkommen as defined there |
| A-07 | ANSWER | How many months of Elterngeld can we get in total? | answered, elements covered | answered | element not covered: 14 months when one parent's employment income is reduced in two of the months — Reply gives 12 monthly amounts plus 'two further months (Partnermonate)' when one parent's earned income is reduced in two months, but never states the total of 14 for that case. |
| A-10 | ANSWER | How much Kindergeld do we get per month for our first child? | answered, elements covered | answered | element not covered: the amount valid at the time of the answer with its as-of date — The reply gives the 259 euro figure and says the amount can change over time, but it does not state an as-of date anywhere in the reply. |
| A-11 | ANSWER | How quickly do we have to register the birth at the Standesa | answered, elements covered | answered | element not covered: parents still need to complete the registration to obtain certificates — The reply never says parents must complete a registration in order to obtain certificates. It only says a home-birth certificate must be presented within one week and that documents needed should be checked on the Standesamt w |
| A-13 | ANSWER | What do we need to bring to the Standesamt to register the b | answered, elements covered | answered | element not covered: residence registration — The reply never mentions residence registration (Meldeamt or Anmeldung beim Einwohnermeldeamt). · element not covered: certified German translations and legalisation for foreign documents — The reply says nothing about translations, certification or legalisation of foreign- |
| A-14 | ANSWER | Does my Krankenkasse pay for a midwife? | answered, elements covered | answered | element not covered: no doctor's referral needed — The reply says only that services beyond twelve weeks need a doctor's order. It never says that base midwife care needs no referral, so this is implied at most and not stated. · element not covered: separate on-call fee may be charged privately — The reply does not men |
| A-15 | ANSWER | How long after the birth can I still see a midwife at the Kr | answered, elements covered | answered | element not covered: number of home visits is capped by the Hebammenhilfevertrag — The reply never mentions a cap on home visits or the Hebammenhilfevertrag. Nothing in it addresses this element. |
| A-16 | ANSWER | How do we insure the baby after the birth? | answered, elements covered | answered | element not covered: register promptly so cover runs from the date of birth — The reply gives a one-week deadline for the registry office but never says that prompt fund registration makes cover run from the date of birth. · element not covered: the child's insurance number is needed for other applications — The reply  |
| A-17 | ANSWER | When are the first check-ups for the baby? | answered, elements covered | answered | element not covered: tolerance limits begin at U2 rather than at U1 — Reply attaches tolerance windows to U2 through U5 only, and the U1 bullet has no tolerance window. It never explicitly states that tolerance limits begin at U2 or that U1 has none, so this is implied rather than stated. |
| A-18 | ANSWER | What is Mutterschaftsgeld and when do I apply for it? | answered, elements covered | answered | element not covered: that certificate may be issued at the earliest 7 weeks before the due date — The reply gives no earliest issue date for the certificate; the 7-week figure does not appear anywhere in the reply. |
| A-19 | ANSWER | We are not married. Is my partner automatically the legal fa | answered, elements covered | answered | element not covered: the acknowledgement can be made before the birth at the Jugendamt or Standesamt free of charge — Reply says acknowledgement can be made before birth (BGB §1594(4), supported), names Jugendamt and Standesamt, but states that it 'can cost a fee' depending on Bundesland; it does not say free of charge |
| A-20 | ANSWER | How do unmarried parents get joint custody? | answered, elements covered | answered | element not covered: can be declared at the Jugendamt or notary — The reply says 'The excerpts do not say where or in what form a Sorgeerklärung is made' and only suggests asking the local youth welfare office about the procedure. It does not say the declaration can be made at the Jugendamt or before a notary. · elemen |
| A-21 | ANSWER | Where do we apply for Elterngeld in Frankfurt? | answered, elements covered | answered | element not covered: Elterngeld in Hessen is handled by one of the sechs hessischen Ämter für Versorgung und Soziales (HÄVS), the one responsible for the place of residence — The reply says the office covering Frankfurt must be found on the Regierungspräsidium Gießen page and states 'The excerpts do not say which of th |
| A-23 | ANSWER | Can we apply for Elterngeld online? | answered, elements covered | answered | must_not (semantic): a claim that online applies everywhere — "Es gibt in allen Bundesländern die Möglichkeit, Elterngeld digital zu beantragen." · element not covered: an online route exists but availability depends on the Bundesland — The reply states the opposite, that online application is available in every Bundes |
| A-24 | ANSWER | How long do we have to register our baby's birth with the In | answered, elements covered | refused/low_confidence | element not covered: registration of the birth of a child born outside India at the Indian mission within one year of birth — The reply says 'The excerpts I have do not say how long you have to register a birth with the Indian consulate. I cannot give you a time limit for that step.' It states no one-year period for th |
| A-25 | ANSWER | Will our baby automatically be German if we are both Indian  | answered, elements covered | answered | element not covered: otherwise not automatic — The reply says "Not by descent" and lists conditions, and it notes that if the child does not acquire citizenship AufenthG §33 applies. It never states in terms that, without meeting those conditions, citizenship is not automatic. · element not covered: India does not perm |
| A-26 | ANSWER | What do we need for an Indian passport for a baby born in Ge | answered, elements covered | refused/low_confidence | element not covered: birth must be registered with the mission first — The reply does not mention birth registration with the Indian mission or any ordering of steps. · element not covered: German birth certificate — The reply does not mention a German birth certificate or any other document. · element not covered: par |
| A-29 | ANSWER | Can I work while receiving Elterngeld? | answered, elements covered | answered | element not covered: the hours limit is stated with its source — Reply says only 'The law says' and gives the 32-hour figure; it never names BEEG or § 1 Abs. 6, so the source is not stated. |

## Retrieval detail (ANSWER rows)

| id | hit | top cos | §-ref cited | citations valid | secondary ref missing |
| --- | --- | --- | --- | --- | --- |
| A-01 | yes | 0.452 | yes | 1/1 | — |
| A-02 | yes | 0.607 | yes | 2/2 | — |
| A-03 | yes | 0.687 | yes | 1/1 | — |
| A-04 | yes | 0.573 | yes | 1/1 | — |
| A-05 | yes | 0.563 | yes | 1/1 | — |
| A-06 | yes | 0.629 | yes | 2/2 | BEEG §28 |
| A-07 | yes | 0.713 | yes | 2/2 | — |
| A-08 | yes | 0.675 | yes | 3/3 | — |
| A-09 | yes | 0.602 | yes | 2/2 | — |
| A-10 | yes | 0.660 | yes | 2/2 | — |
| A-11 | yes | 0.628 | yes | 1/1 | — |
| A-12 | **no** | 0.520 | **no** | — | — |
| A-13 | **no** | 0.625 | **no** | 3/3 | — |
| A-14 | yes | 0.587 | n/a | — | — |
| A-15 | yes | 0.559 | n/a | — | — |
| A-16 | yes | 0.446 | n/a | — | — |
| A-17 | yes | 0.512 | **no** | 0/3 | — |
| A-18 | yes | 0.736 | yes | 2/2 | — |
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

## must_not_contain — two channels

The literal channel is deterministic and ran on all 48 rows before any model call.
The semantic channel is the judge. 16 rows carry no clause at all and are **not constrained** — that is not a pass.

No literal violations.

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
