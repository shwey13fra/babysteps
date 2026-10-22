# Golden set v1 — annotation drift against ingested text

Date: 2026-10-22 · corpus_version 2026-10 · 675 chunks

Each row's `required_answer_elements` is checked against the **ingested text of the §**
it cites, not against retrieval. Numbers asserted by the annotation are looked for in the
statute. A number the statute does not contain is drift, or an inference the annotation
should not be making from that source.

This report does not adjudicate entitlement (CLAUDE.md rule 13). Rows marked **DECIDE**
assert an amount or threshold and need a human.
| confirmed | drift? | unverifiable |
| --- | --- | --- |
| 14 | 1 | 5 |


### A-02 — BEEG §7(1) — **CONFIRMED**

*How long after birth can we apply for Elterngeld without losing money?*

- annotation: paid retroactively for at most 3 months before the month the application is received; there is no absolute application deadline but earlier months are forfeited; apply as early as possible after birth
- numbers found in the §: 3
- **numbers NOT in the §: none**

### A-03 — BEEG §16(1) — **CONFIRMED**

*How much notice do I have to give my employer for Elternzeit?*

- annotation: at least 7 weeks before Elternzeit begins for periods before the child's 3rd birthday; 13 weeks for periods between the 3rd and 8th birthday; written form with original signature; must declare which periods within the first 2 years
- numbers found in the §: 7, 3, 13, 8, 2
- **numbers NOT in the §: none**

### A-06 — BEEG §1(8) — **DRIFT?**

*Is there an income limit above which we get no Elterngeld?*

- annotation: 175000 EUR joint taxable income for births from 1 April 2025; 150000 EUR for single parents; based on zu versteuerndes Einkommen in the calendar year before the birth; threshold depends on the birth date
- numbers found in the §: 175000, 1
- **numbers NOT in the §: 2025, 150000**

### A-08 — BEEG §4b BEEG §4c — **CONFIRMED**

*What is the Partnerschaftsbonus and who qualifies?*

- annotation: 2 to 4 additional ElterngeldPlus months; both parents work between 24 and 32 hours per week on average in the same months
- numbers found in the §: 2, 4, 24, 32
- **numbers NOT in the §: none**

### A-09 — EStG §70(1) S.2 — **CONFIRMED**

*We forgot to apply for Kindergeld. How far back will they pay?*

- annotation: paid retroactively for a maximum of 6 months before the month the application is received at the Familienkasse
- numbers found in the §: 6
- **numbers NOT in the §: none**

### A-10 — EStG §66(1) — **CONFIRMED**

*How much Kindergeld do we get per month for our first child?*

- annotation: a fixed monthly amount per child; the amount valid at the time of the answer with its as-of date; same amount for the first child as for the second
- numbers found in the §: none
- **numbers NOT in the §: none**

### A-13 — PStG §18 + Hessen Standesamt guidance — **CONFIRMED**

*What do we need to bring to the Standesamt to register the birth?*

- annotation: passports of both parents; residence registration; the Geburtsbescheinigung from the hospital or midwife; marriage certificate if married or Vaterschaftsanerkennung if not; parents' own birth certificates; certified German translations and legalisation for foreign documents
- numbers found in the §: none
- **numbers NOT in the §: none**

### A-15 — SGB V §24d — **CONFIRMED**

*How long after the birth can I still see a midwife at the Krankenkasse's cost?*

- annotation: postpartum care covered up to 12 weeks after birth; further visits possible on medical indication; number of home visits is capped by the Hebammenhilfevertrag
- numbers found in the §: 12
- **numbers NOT in the §: none**

### A-17 — G-BA Kinder-Richtlinie — **CONFIRMED**

*When are the first check-ups for the baby?*

- annotation: U1 immediately after birth; U2 between the 3rd and 10th day of life; U3 in the 4th to 5th week; each has a tolerance window
- numbers found in the §: 1, 2, 3, 10, 4, 5
- **numbers NOT in the §: none**

### A-18 — MuSchG §19 SGB V §24i — **CONFIRMED**

*What is Mutterschaftsgeld and when do I apply for it?*

- annotation: paid by the Krankenkasse during the protection periods with an employer top-up to net pay; requires a certificate of the expected date of delivery; that certificate may be issued at the earliest 7 weeks before the due date
- numbers found in the §: 7
- **numbers NOT in the §: none**

### A-19 — BGB §1592 BGB §1594 — **CONFIRMED**

*We are not married. Is my partner automatically the legal father?*

- annotation: no; without marriage legal fatherhood requires acknowledgement of paternity; the acknowledgement can be made before the birth at the Jugendamt or Standesamt free of charge; the mother must consent
- numbers found in the §: none
- **numbers NOT in the §: none**

### A-21 — Hessen Elterngeld guidance

**UNVERIFIABLE (non-statute source).** Where do we apply for Elterngeld in Frankfurt?

### A-22 — Berlin Elterngeldstelle guidance

**UNVERIFIABLE (non-statute source).** Where do we apply for Elterngeld in Berlin?

### A-23 — ElterngeldDigital guidance

**UNVERIFIABLE (non-statute source).** Can we apply for Elterngeld online?

### A-24 — Citizenship Act 1955 §4(1) proviso

**UNVERIFIABLE (non-statute source).** How long do we have to register our baby's birth with the Indian consulate?

### A-25 — StAG §4(3) — **CONFIRMED**

*Will our baby automatically be German if we are both Indian citizens?*

- annotation: German citizenship by birth in Germany if at least one parent has been habitually resident in Germany for the required period and holds an unlimited right of residence at the time of the birth; otherwise not automatic; India does not permit dual citizenship so consequences differ per family
- numbers found in the §: none
- **numbers NOT in the §: none**

### A-26 — Indian mission passport guidance

**UNVERIFIABLE (non-statute source).** What do we need for an Indian passport for a baby born in Germany?

### A-27 — AufenthG §33 — **CONFIRMED**

*Does our newborn need a residence permit?*

- annotation: a child born in Germany can be granted a residence permit ex officio where a parent holds one; the Ausländerbehörde is the responsible authority; the answer states that requirements depend on the parents' permits
- numbers found in the §: none
- **numbers NOT in the §: none**

### A-28 — BEEG §3 — **CONFIRMED**

*We are getting Mutterschaftsgeld. Does that reduce our Elterngeld?*

- annotation: Mutterschaftsgeld and the employer top-up are counted against Elterngeld in the months in which they are paid; those months are counted as used months of Basiselterngeld for the mother
- numbers found in the §: none
- **numbers NOT in the §: none**

### A-29 — BEEG §1(6) — **CONFIRMED**

*Can I work while receiving Elterngeld?*

- annotation: part-time work is permitted up to the statutory weekly average; income earned during the reference period reduces the payment; the hours limit is stated with its source
- numbers found in the §: none
- **numbers NOT in the §: none**
