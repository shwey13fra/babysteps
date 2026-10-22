# Golden set v1 — verification pass

Date: 2026-10-22 · corpus_version 2026-10 · 673 chunks · top-k 8

Scope: the 34 `verify_priority: high` rows. The 14 DEFLECT/REFUSE rows
carry no `ground_truth_source` — they assert behaviour, not a citation, so there is nothing
to check against the corpus. That leaves 20 ANSWER rows.

| verdict | n | meaning |
| --- | --- | --- |
| OK | 13 | cited § is in the corpus and the question retrieves it |
| RETRIEVAL | 3 | § is in the corpus but the question does not surface it in top-8 |
| MISSING | 0 | cited § is not in the corpus at all |
| OK-GUIDANCE | 2 | non-statute source; the expected domain is retrieved |
| NOT-INGESTABLE | 2 | consular source; cannot be ingested (ADR-014/016) |

## Rows

| id | juris | ground_truth_source | verdict | detail |
| --- | --- | --- | --- | --- |
| A-02 | federal | BEEG §7(1) | OK +HUMAN | retrieved BEEG §7 |
| A-03 | federal | BEEG §16(1) | OK +HUMAN | retrieved BEEG §16 |
| A-06 | federal | BEEG §1(8) | RETRIEVAL +HUMAN | top: BEEG §2, BEEG §4a, BEEG §10, BEEG §8 |
| A-08 | federal | BEEG §4b BEEG §4c | OK +HUMAN | retrieved BEEG §4b |
| A-09 | federal | EStG §70(1) S.2 | OK +HUMAN | retrieved EStG §70 |
| A-10 | federal | EStG §66(1) | OK +HUMAN | retrieved EStG §66 |
| A-13 | hesse | PStG §18 + Hessen Standesamt guidance | OK | retrieved PStG §18 |
| A-15 | federal | SGB V §24d | OK +HUMAN | retrieved SGB V §24d |
| A-17 | federal | G-BA Kinder-Richtlinie | OK-GUIDANCE | non-statute |
| A-18 | federal | MuSchG §19 SGB V §24i | OK +HUMAN | retrieved MuSchG §19, SGB V §24i |
| A-19 | federal | BGB §1592 BGB §1594 | OK | retrieved BGB §1592, BGB §1594 |
| A-21 | hesse | Hessen Elterngeld guidance | RETRIEVAL | top: BEEG §7, BEEG §12, BEEG §8, BEEG §22 |
| A-22 | berlin | Berlin Elterngeldstelle guidance | OK-GUIDANCE | non-statute |
| A-23 | hesse | ElterngeldDigital guidance | RETRIEVAL | top: BEEG §7, BEEG §8, BEEG §22, BEEG §1 |
| A-24 | consular-india | Citizenship Act 1955 §4(1) proviso | NOT-INGESTABLE | non-statute |
| A-25 | federal | StAG §4(3) | OK | retrieved StAG §4 |
| A-26 | consular-india | Indian mission passport guidance | NOT-INGESTABLE | non-statute |
| A-27 | federal | AufenthG §33 | OK | retrieved AufenthG §33 |
| A-28 | federal | BEEG §3 | OK | retrieved BEEG §3 |
| A-29 | federal | BEEG §1(6) | OK | retrieved BEEG §1 |

## Needs a human (CLAUDE.md rule 13)

These assert an amount, threshold or period. This tool must not adjudicate entitlement.

- **A-02** (BEEG §7(1)) — paid retroactively for at most 3 months before the month the application is received; there is no absolute application deadline but earlier months are forfeited
- **A-03** (BEEG §16(1)) — at least 7 weeks before Elternzeit begins for periods before the child's 3rd birthday; 13 weeks for periods between the 3rd and 8th birthday; written form with 
- **A-06** (BEEG §1(8)) — 175000 EUR joint taxable income for births from 1 April 2025; 150000 EUR for single parents; based on zu versteuerndes Einkommen in the calendar year before the
- **A-08** (BEEG §4b BEEG §4c) — 2 to 4 additional ElterngeldPlus months; both parents work between 24 and 32 hours per week on average in the same months
- **A-09** (EStG §70(1) S.2) — paid retroactively for a maximum of 6 months before the month the application is received at the Familienkasse
- **A-10** (EStG §66(1)) — a fixed monthly amount per child; the amount valid at the time of the answer with its as-of date; same amount for the first child as for the second
- **A-15** (SGB V §24d) — postpartum care covered up to 12 weeks after birth; further visits possible on medical indication; number of home visits is capped by the Hebammenhilfevertrag
- **A-18** (MuSchG §19 SGB V §24i) — paid by the Krankenkasse during the protection periods with an employer top-up to net pay; requires a certificate of the expected date of delivery; that certifi
