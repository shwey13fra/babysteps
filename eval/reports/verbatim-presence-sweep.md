# Verbatim-presence sweep — can the instrument read?

Deterministic. No model calls, nothing spent. `npx tsx scripts/eval/verbatim-presence.ts`.

For every element any stored sample marked **NOT COVERED**, the distinctive literals in the
element's own text are grepped against that sample's stored reply. A flag means **text
present, judged absent** — the A-21 element 1 defect class (ADR-068).

**A flag is a candidate, not a correction.** An element can name an authority the reply also
names while still asking for a claim the reply never makes. Each flag carries the literal
that matched so it can be upheld or dismissed by reading. This script rescores nothing.

**Strong vs weak.** STRONG = a multi-word proper name matched, which is near-conclusive
because such a name appears only where that authority is actually named. WEAK = only a
number, a § reference or a glossary term matched: `Elterngeld` appears in almost every
reply, and a § reference is normalised to the paragraph (`citations.ts:60`), so an element
asking for §12(1) matches a reply citing §12(3).

## Headline

| | count |
| --- | --- |
| Files in `eval/reports/` | 37 |
| Of those, scored runs with rows and verdicts | 34 |
| NOT COVERED element verdicts examined | **833** |
| Flagged element verdicts | **107** |
| Flagged verdicts where a named authority matched (**STRONG**) | **8** |
| Distinct (row, element) pairs with at least one STRONG flag | **2** |
| Distinct (row, element) pairs with WEAK flags only | 16 |

## STRONG flags

A multi-word authority name from the element appears verbatim in the reply the judge said lacked it.

| row | cat | element | literal present in the reply | samples |
| --- | --- | --- | --- | --- |
| A-21 | ANSWER | the Fachaufsicht for Elterngeld sits at the Regierungspräsidium Gießen | authority: `Regierungspräsidium Gießen`; term: `Elterngeld`; term: `Regierungspräsidium` | 4 |
| A-21 | ANSWER | Elterngeld in Hessen is handled by one of the sechs hessischen Ämter für Versorgung und Soziales (HÄVS), the one responsible for the place of residence | authority: `Ämter für Versorgung und Soziales`; term: `Elterngeld` | 4 |

### A-21 — ANSWER

**Element:** the Fachaufsicht for Elterngeld sits at the Regierungspräsidium Gießen

**Present in the reply:** authority: `Regierungspräsidium Gießen`; term: `Elterngeld`; term: `Regierungspräsidium`

**Each flagged sample, with that sample's OWN reason.** Adjudicate per sample, not per
element: the same verdict is worded differently run to run, and a reason that explains
why the literal is not enough is a sound verdict, not a misread.

- **2026-10-31-iter4** — authority: `Regierungspräsidium Gießen`; term: `Elterngeld`; term: `Regierungspräsidium`
  - judge: The reply says the RP Gießen page lists 'the body that supervises Elterngeld' but does not state that the supervising body is the Regierungspräsidium Gießen.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-02-iter5-completion-on** — authority: `Regierungspräsidium Gießen`; term: `Elterngeld`; term: `Regierungspräsidium`
  - judge: The reply says the RP Gießen page lists 'the state's supervisory office for Elterngeld'. It does not state that the Fachaufsicht sits at RP Gießen.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-03-iter7-instrument-fixed** — authority: `Regierungspräsidium Gießen`; term: `Elterngeld`; term: `Regierungspräsidium`
  - judge: Reply says Regierungspräsidium Gießen publishes the contact details of the six offices, but never states it is the Fachaufsicht (supervisory authority) for Elterngeld.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-03-variance-3** — authority: `Regierungspräsidium Gießen`; term: `Elterngeld`; term: `Regierungspräsidium`
  - judge: The reply names the Regierungspräsidium Gießen as the page's publisher and says its Elterngeld page lists contacts for the six offices, but never states that the Regierungspräsidium Gießen holds the Fachaufsicht for Elterngeld.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`

### A-21 — ANSWER

**Element:** Elterngeld in Hessen is handled by one of the sechs hessischen Ämter für Versorgung und Soziales (HÄVS), the one responsible for the place of residence

**Present in the reply:** authority: `Ämter für Versorgung und Soziales`; term: `Elterngeld`

**Each flagged sample, with that sample's OWN reason.** Adjudicate per sample, not per
element: the same verdict is worded differently run to run, and a reason that explains
why the literal is not enough is a sound verdict, not a misread.

- **2026-11-02-iter5-completion-on** — authority: `Ämter für Versorgung und Soziales`; term: `Elterngeld`
  - judge: The reply mentions 'the six Hessian offices for welfare and social affairs' only as contacts on a page. It never states that Hessen's Elterngeld is handled by one of them, and it says the excerpts do not show which office covers Frankfurt.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-03-iter6-four-sources** — authority: `Ämter für Versorgung und Soziales`; term: `Elterngeld`
  - judge: The reply says the office covering Frankfurt must be found on the Regierungspräsidium Gießen page and states 'The excerpts do not say which of the six offices covers Frankfurt'. It mentions the six offices only in passing and never states that Hessen's Elterngeld is handled by one of them as the responsible office for the place of residence; the Hessen-specific routing is deferred to a page the user must consult.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-05-iter12-v5-2** — authority: `Ämter für Versorgung und Soziales`; term: `Elterngeld`
  - judge: The reply says the six Hessian Ämter exist and that the user should use the contact list to find the office for their district, and says the excerpts do not say which covers Frankfurt. It does not state that the Hessen office is one of the HÄVS as a responsible-for-residence rule beyond pointing to the list; the reply names 'the six Hessian Ämter für Versorgung und Soziales' only as quoted from the Regierungspräsidium page, and the responsibility rule it gives is the generic BEEG district rule, not the HÄVS mapping.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-06-iter13-judge-v6-1** — authority: `Ämter für Versorgung und Soziales`; term: `Elterngeld`
  - judge: The reply says the authority Hessen designated for Frankfurt's district applies, and that the excerpts do not say which of the six offices covers Frankfurt. It never names the HÄVS or states that Hessen has six such offices; it only points to the contact list on the Gießen page.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`

## WEAK flags

Listed for completeness. A single glossary term or a paragraph-level § match is not by itself evidence of a misread — most of these are expected and should be dismissed.

| row | cat | element | literal present in the reply | samples |
| --- | --- | --- | --- | --- |
| A-23 | ANSWER | Hessen has its own online Elterngeld application via the HÄVS portal | term: `Elterngeld` | 21 |
| A-06 | ANSWER | based on zu versteuerndes Einkommen under EStG §2(5) in the last completed Veranlagungszeitraum before the birth | term: `zu versteuerndes Einkommen`; term: `Veranlagungszeitraum` | 16 |
| A-21 | ANSWER | Elterngeld in Hessen is handled by one of the sechs hessischen Ämter für Versorgung und Soziales (HÄVS), the one responsible for the place of residence | term: `Elterngeld` | 12 |
| A-07 | ANSWER | 14 if both parents take at least 2 months | number: `14` | 8 |
| A-20 | ANSWER | free at the Jugendamt | term: `Jugendamt` | 8 |
| A-21 | ANSWER | the Fachaufsicht for Elterngeld sits at the Regierungspräsidium Gießen | term: `Elterngeld` | 8 |
| A-19 | ANSWER | the acknowledgement can be made before the birth at the Jugendamt or Standesamt free of charge | term: `Standesamt`; term: `Jugendamt` | 5 |
| A-20 | ANSWER | joint custody requires a Sorgeerklärung by both parents | term: `Sorgeerklärung` | 4 |
| A-23 | ANSWER | ElterngeldDigital covers Berlin, Brandenburg, Bremen, Hamburg, Mecklenburg-Vorpommern, Niedersachsen, Rheinland-Pfalz, Sachsen-Anhalt, Schleswig-Holstein and Thüringen — NOT Hessen | term: `ElterngeldDigital` | 4 |
| A-07 | ANSWER | 14 months when one parent's employment income is reduced in two of the months | number: `14` | 3 |
| A-07 | ANSWER | ElterngeldPlus converts one month into two at roughly half the rate | term: `ElterngeldPlus` | 3 |
| A-16 | ANSWER | the child must be registered with the Krankenkasse | term: `Krankenkasse` | 2 |
| A-16 | ANSWER | Familienversicherung is free of charge for the child under statutory insurance | term: `Familienversicherung` | 2 |
| A-16 | ANSWER | the child is covered by Familienversicherung under a parent's statutory insurance | term: `Familienversicherung` | 1 |
| A-20 | ANSWER | can be declared at the Jugendamt or notary | term: `Jugendamt` | 1 |
| M-03 | DEFLECT | redirect to Frauenarzt or Hebamme or the hospital now | term: `Frauenarzt`; term: `Hebamme` | 1 |

### A-23 — ANSWER

**Element:** Hessen has its own online Elterngeld application via the HÄVS portal

**Present in the reply:** term: `Elterngeld`

**Each flagged sample, with that sample's OWN reason.** Adjudicate per sample, not per
element: the same verdict is worded differently run to run, and a reason that explains
why the literal is not enough is a sound verdict, not a misread.

- **2026-10-25-run2** — term: `Elterngeld`
  - judge: The reply does not mention Hessen, HÄVS or any portal.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-10-25-run3** — term: `Elterngeld`
  - judge: The reply does not mention Hessen, HÄVS or any portal.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-10-27-noise1** — term: `Elterngeld`
  - judge: The reply never names the HÄVS portal or any Hessen online application. It only says to ask the office or check the state's official pages.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-10-27-noise2** — term: `Elterngeld`
  - judge: HÄVS and Hessen's online application are not mentioned in the reply.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-10-27-noise3** — term: `Elterngeld`
  - judge: The reply does not name the HÄVS portal or any Hessen online application. It only says the Hessen office can say whether it accepts online applications.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-10-28-iter1** — term: `Elterngeld`
  - judge: HÄVS and Hessen's online application are not mentioned in the reply.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-10-28-judgefix** — term: `Elterngeld`
  - judge: The reply mentions Hessen only as 'In Hessen, that is the authority Hessen has designated for your district' and never names an online application or the HÄVS portal.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-10-29-iter3** — term: `Elterngeld`
  - judge: The HÄVS portal is not mentioned; the reply only says the Hessen office can say whether an online route is available.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-10-31-iter4** — term: `Elterngeld`
  - judge: The reply says Hessen offers its own online route but explicitly states the excerpts do not name the Hessen service. HÄVS is not mentioned.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-02-iter5-completion-on** — term: `Elterngeld`
  - judge: The reply says Hessen can apply online independently of ElterngeldDigital, but it never names the HÄVS portal or any named portal for Hessen.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-03-iter6-four-sources-2** — term: `Elterngeld`
  - judge: The reply says Elterngeld can be applied for online in Hessen independently of ElterngeldDigital, but never names the HÄVS portal or any specific Hessian system.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-03-iter6-four-sources** — term: `Elterngeld`
  - judge: The reply says Hessen can apply online independently of ElterngeldDigital, but it never names the HÄVS portal or any Hessen-specific portal.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-03-iter7-instrument-fixed** — term: `Elterngeld`
  - judge: The reply says Hessen allows online application independently of ElterngeldDigital, but it does not name the HÄVS portal.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-03-variance-2** — term: `Elterngeld`
  - judge: The reply says Hessen allows online application separate from ElterngeldDigital, but never names HÄVS or any portal for it.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-03-variance-3** — term: `Elterngeld`
  - judge: The reply says Hessen is listed as an online-capable state independent of ElterngeldDigital, but it explicitly says the excerpts do not name the Hessen service and does not mention HÄVS.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-04-iter10-confirm-1** — term: `Elterngeld`
  - judge: The reply says Hessen can be applied for online separately, but never names HÄVS. It says the excerpts do not describe the Hessen service and tells the user to check Hessen's official portal.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-04-iter8-completeness** — term: `Elterngeld`
  - judge: The reply says Hessen can apply online independently of ElterngeldDigital, but never names the HÄVS portal or any specific portal for Hessen.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-05-iter11-v4-1** — term: `Elterngeld`
  - judge: The reply says Hessen has its own online service but never names HÄVS or any portal; it says 'The excerpts do not name the Hessen online service'.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-05-iter12-v5-1** — term: `Elterngeld`
  - judge: Reply says the excerpts do not describe how the Hessen online service works and sends the user to the Elterngeldstelle; it does not name HÄVS or state Hessen has its own online application.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-05-iter12-v5-2** — term: `Elterngeld`
  - judge: The reply says Hessen has independent online application but explicitly says the excerpts do not describe how it works, and it never names HÄVS.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-06-iter13-judge-v6-1** — term: `Elterngeld`
  - judge: The reply says Hessen has its own online application, but never names the HÄVS portal. It says 'The excerpts do not describe how the Hessen online procedure works.'
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`

### A-06 — ANSWER

**Element:** based on zu versteuerndes Einkommen under EStG §2(5) in the last completed Veranlagungszeitraum before the birth

**Present in the reply:** term: `zu versteuerndes Einkommen`; term: `Veranlagungszeitraum`

**Each flagged sample, with that sample's OWN reason.** Adjudicate per sample, not per
element: the same verdict is worded differently run to run, and a reason that explains
why the literal is not enough is a sound verdict, not a misread.

- **2026-10-27-noise2** — term: `zu versteuerndes Einkommen`
  - judge: The reply refers to zu versteuerndes Einkommen and to the last completed tax assessment period before the birth, but never names EStG §2(5) or the EStG as the basis of the definition.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-10-27-noise3** — term: `zu versteuerndes Einkommen`
  - judge: Reply says taxable income and refers to the tax assessment notice for the calendar year before the birth, but never names EStG §2(5) or the term Veranlagungszeitraum; the 'calendar year before the birth' wording is a paraphrase, not the statutory reference.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-10-28-iter1** — term: `zu versteuerndes Einkommen`
  - judge: The reply says 'the last completed tax assessment period before the birth' and uses zu versteuerndes Einkommen, but never names EStG §2(5). The EStG reference is absent from the reply, so the element is not fully covered.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-10-28-judgefix** — term: `zu versteuerndes Einkommen`
  - judge: The reply says the limit is based on zu versteuerndes Einkommen and refers to the last completed tax assessment period before the birth, but it never mentions EStG §2(5).
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-10-29-iter3** — term: `zu versteuerndes Einkommen`
  - judge: The reply says the figure is zu versteuerndes Einkommen in the last completed tax assessment period before the birth, but never names EStG §2(5) or the EStG as the source of that definition.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-10-31-iter4** — term: `zu versteuerndes Einkommen`; term: `Veranlagungszeitraum`
  - judge: The reply names zu versteuerndes Einkommen and the last completed tax assessment period before the birth, but never cites EStG §2(5) or the Einkommensteuergesetz.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-10-31-partial** — term: `zu versteuerndes Einkommen`; term: `Veranlagungszeitraum`
  - judge: Reply says "last completed tax assessment period before the birth" and refers to zu versteuerndes Einkommen, but never names EStG §2(5) as the basis.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-02-iter5-completion-on** — term: `zu versteuerndes Einkommen`; term: `Veranlagungszeitraum`
  - judge: The reply refers to taxable income and to 'im letzten abgeschlossenen Veranlagungszeitraum vor der Geburt', but never names EStG §2(5) or the EStG basis, so the element is only partly met.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-02-partial** — term: `zu versteuerndes Einkommen`; term: `Veranlagungszeitraum`
  - judge: The reply refers to taxable income in the last completed tax assessment period before the birth, but never names EStG §2(5) or the EStG as the source of the definition, so the specific reference is not stated.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-03-iter6-four-sources-2** — term: `zu versteuerndes Einkommen`; term: `Veranlagungszeitraum`
  - judge: The reply does name the last completed Veranlagungszeitraum before the birth and taxable income, but it never mentions EStG §2(5) or the EStG at all. The required statutory basis is absent from the reply.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-03-iter6-four-sources** — term: `zu versteuerndes Einkommen`
  - judge: Reply refers to "the last completed tax assessment period before the birth" and to taxable income, but never mentions EStG §2(5) or the term zu versteuerndes Einkommen as defined there. The EStG reference is absent.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-03-variance-2** — term: `zu versteuerndes Einkommen`
  - judge: The reply says the limit is based on zu versteuerndes Einkommen in the last completed tax assessment period before the birth, but it never names EStG §2(5), which the element requires.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-03-variance-3** — term: `zu versteuerndes Einkommen`
  - judge: The reply refers to zu versteuerndes Einkommen and the last completed tax assessment period before the birth, but never states that the measure is under EStG §2(5). The EStG reference is absent, so the element is not fully covered.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-04-iter10-confirm-1** — term: `zu versteuerndes Einkommen`; term: `Veranlagungszeitraum`
  - judge: The reply gives the last completed tax assessment period before the birth and the zu versteuerndes Einkommen concept, but never mentions EStG §2(5) or the Einkommensteuergesetz as the source of the definition. The EStG §2(5) basis is absent from the reply text.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-04-iter9-confirm** — term: `zu versteuerndes Einkommen`
  - judge: The reply refers to 'zu versteuerndes Einkommen' and to 'the last completed tax assessment period before the birth', but never cites EStG §2(5), so the required statutory basis is not stated.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-05-iter12-v5-2** — term: `zu versteuerndes Einkommen`; term: `Veranlagungszeitraum`
  - judge: The reply refers to zu versteuerndes Einkommen in the last completed tax assessment period before the birth, but never cites EStG §2(5) or the EStG as the source of that definition, so the EStG reference is missing.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`

### A-21 — ANSWER

**Element:** Elterngeld in Hessen is handled by one of the sechs hessischen Ämter für Versorgung und Soziales (HÄVS), the one responsible for the place of residence

**Present in the reply:** term: `Elterngeld`

**Each flagged sample, with that sample's OWN reason.** Adjudicate per sample, not per
element: the same verdict is worded differently run to run, and a reason that explains
why the literal is not enough is a sound verdict, not a misread.

- **2026-10-25-run2** — term: `Elterngeld`
  - judge: The reply says only that 'it is the office Hessen has designated for that district' and never names the HÄVS or any Hessen office; it explicitly says the excerpts do not name the Frankfurt office.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-10-25-run3** — term: `Elterngeld`
  - judge: The reply says the responsible office is the Elterngeldstelle for Frankfurt 'as designated by Hessen' but never names HÄVS or any Hessen office type, so the required fact is absent.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-10-27-noise1** — term: `Elterngeld`
  - judge: The reply never names the HÄVS or the sechs hessischen Ämter; it says the sources do not name the office and points to Familienportal's search tool.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-10-27-noise2** — term: `Elterngeld`
  - judge: The reply says the responsible office is 'the office Hessen has designated for Frankfurt' and states that the excerpts do not name it. It never names HÄVS or any Hessen office.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-10-27-noise3** — term: `Elterngeld`
  - judge: The reply says the office is 'the office Hessen has designated for Frankfurt' and never names HÄVS or the number of offices.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-10-28-iter1** — term: `Elterngeld`
  - judge: The reply refers only to the generic Elterngeldstelle that Hessen has designated for Frankfurt. It never names the HÄVS or the sechs-Ämter structure.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-10-28-judgefix** — term: `Elterngeld`
  - judge: The reply says the competent office is the Elterngeldstelle Hessen has designated for Frankfurt but never names HÄVS or the number of offices; it explicitly says the excerpts do not name the office.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-10-29-iter3** — term: `Elterngeld`
  - judge: The reply says only 'the office Hessen has designated for Frankfurt' and states it could not name that office. No HÄVS is named.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-10-31-iter4** — term: `Elterngeld`
  - judge: The reply says 'the six Hessian offices for this area' and that the responsible office is the one for the child's residence, but never names them as Ämter für Versorgung und Soziales (HÄVS).
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-03-iter6-four-sources-2** — term: `Elterngeld`
  - judge: The reply lists the six Hessian offices and says to use the contact list to find the office for the child's district, but it never states that these offices handle Elterngeld. The residence rule comes from the federal BEEG §12 text, not from a Hessen-specific statement, so the Hessen link is only implied.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-03-variance-2** — term: `Elterngeld`
  - judge: The reply mentions 'the six Hessian state offices' and says the Frankfurt office is unknown, but never names them as Ämter für Versorgung und Soziales and never states that the responsible one is determined by residence in Hessen.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-03-variance-3** — term: `Elterngeld`
  - judge: The reply says the Frankfurt office is among 'the six Hessian state offices' but never names them as Ämter für Versorgung und Soziales (HÄVS); it only says the excerpts do not identify which office covers Frankfurt and points to a page. Partial at best, so not covered.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`

### A-07 — ANSWER

**Element:** 14 if both parents take at least 2 months

**Present in the reply:** number: `14`

**Each flagged sample, with that sample's OWN reason.** Adjudicate per sample, not per
element: the same verdict is worded differently run to run, and a reason that explains
why the literal is not enough is a sound verdict, not a misread.

- **2026-10-25-run2** — number: `14`
  - judge: Reply never states a total of 14. It says "They get 2 further months, called partner months, if one parent's earnings are reduced in two months of the child's life", which is a different condition, and it separately says "A parent only has a claim if they receive Elterngeld for at least two months".
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-10-25-run3** — number: `14`
  - judge: Reply gives a different condition: "Two further months, called partner months, are added if one parent's earned income is reduced in two of the child's months of life." It does not state the both-parents-take-at-least-2-months condition.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-10-27-noise1** — number: `14`
  - judge: Reply gives 2 partner months "if one parent has reduced earned income in two months" and a premature-birth route to 13-16. It never states the 14-month figure or the condition that both parents take at least 2 months.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-10-27-noise2** — number: `14`
  - judge: Reply gives 12 basic months plus 2 partner months, and a maximum of 12 plus 4 partnership bonus months. It never states a 14-month total conditional on both parents taking at least 2 months.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-10-27-noise3** — number: `14`
  - judge: The reply never states a 14-month total. It says 2 further partner months apply 'if one parent's earned income is reduced in two months', which is a different condition from both parents taking at least 2 months.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-10-28-iter1** — number: `14`
  - judge: Reply mentions 12 joint months plus "2 further months (Partnermonate)" conditional on one parent's income reduction, and separately says each parent must take at least two months. It never states a total of 14 under the both-parents-take-at-least-2-months condition.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-10-28-judgefix** — number: `14`
  - judge: The reply gives 14 months only when one parent's earned income is reduced in two months ("They get 2 more months (partner months) if one parent's earned income is reduced in two months of the child's life. That makes 14 months to share."). It does not tie the 14 to both parents each taking at least 2 months, so the required condition is not stated.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-10-29-iter3** — number: `14`
  - judge: The reply reaches 14 only through the income-reduction condition ("if one parent's income from work is reduced in two months"). It never states the required condition that both parents each take at least 2 months, so the element is not covered.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`

### A-20 — ANSWER

**Element:** free at the Jugendamt

**Present in the reply:** term: `Jugendamt`

**Each flagged sample, with that sample's OWN reason.** Adjudicate per sample, not per
element: the same verdict is worded differently run to run, and a reason that explains
why the literal is not enough is a sound verdict, not a misread.

- **2026-11-02-iter5-completion-on** — term: `Jugendamt`
  - judge: The reply never states that the Jugendamt service or the declaration is free of charge.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-03-variance-2** — term: `Jugendamt`
  - judge: The reply never mentions cost, so it does not state that the Jugendamt route is free.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-04-iter10-confirm-1** — term: `Jugendamt`
  - judge: The reply says nothing about cost or whether the declaration is free at the Jugendamt.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-04-iter8-completeness** — term: `Jugendamt`
  - judge: The reply never says the declarations or the Jugendamt advice cost nothing. No cited excerpt mentions cost either.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-05-iter11-v4-1** — term: `Jugendamt`
  - judge: The reply never says the declaration or the Jugendamt service is free of charge. The word free does not appear, and no cost is stated for either route.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-05-iter12-v5-1** — term: `Jugendamt`
  - judge: The reply never says that Sorgeerklärungen or Jugendamt advice are free of charge.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-05-iter12-v5-2** — term: `Jugendamt`
  - judge: The reply never says the declaration or any Jugendamt service is free of charge.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-06-iter13-judge-v6-1** — term: `Jugendamt`
  - judge: The reply never says the Sorgeerklärung or the Jugendamt service costs nothing.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`

### A-21 — ANSWER

**Element:** the Fachaufsicht for Elterngeld sits at the Regierungspräsidium Gießen

**Present in the reply:** term: `Elterngeld`

**Each flagged sample, with that sample's OWN reason.** Adjudicate per sample, not per
element: the same verdict is worded differently run to run, and a reason that explains
why the literal is not enough is a sound verdict, not a misread.

- **2026-10-25-run2** — term: `Elterngeld`
  - judge: The reply never mentions the Regierungspräsidium Gießen or any Fachaufsicht.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-10-25-run3** — term: `Elterngeld`
  - judge: The reply does not mention the Regierungspräsidium Gießen or any Fachaufsicht.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-10-27-noise1** — term: `Elterngeld`
  - judge: The reply does not mention the Regierungspräsidium Gießen or any Fachaufsicht.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-10-27-noise2** — term: `Elterngeld`
  - judge: Regierungspräsidium Gießen and any Fachaufsicht are absent from the reply.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-10-27-noise3** — term: `Elterngeld`
  - judge: The reply never mentions the Regierungspräsidium Gießen or any Fachaufsicht.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-10-28-iter1** — term: `Elterngeld`
  - judge: The reply does not mention the Regierungspräsidium Gießen or any supervisory authority.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-10-28-judgefix** — term: `Elterngeld`
  - judge: The reply does not mention the Regierungspräsidium Gießen or any Fachaufsicht.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-10-29-iter3** — term: `Elterngeld`
  - judge: The reply never mentions the Regierungspräsidium Gießen or any supervisory authority.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`

### A-19 — ANSWER

**Element:** the acknowledgement can be made before the birth at the Jugendamt or Standesamt free of charge

**Present in the reply:** term: `Standesamt`; term: `Jugendamt`

**Each flagged sample, with that sample's OWN reason.** Adjudicate per sample, not per
element: the same verdict is worded differently run to run, and a reason that explains
why the literal is not enough is a sound verdict, not a misread.

- **2026-10-31-iter4** — term: `Standesamt`; term: `Jugendamt`
  - judge: The reply says it can be made before birth and names the Jugendamt and Standesamt, but it does not say the acknowledgement is free of charge. It says the opposite: "Depending on the federal state, a notary or Amtsgericht may charge a fee."
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-05-iter11-v4-1** — term: `Standesamt`; term: `Jugendamt`
  - judge: The reply says the acknowledgement can be made before birth and lists Jugendamt and Standesamt as offices. It never says the acknowledgement is free of charge there. It says only that the notary or Amtsgericht may charge a fee, which is a partial match and does not satisfy the free-of-charge requirement.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-05-iter12-v5-1** — term: `Standesamt`; term: `Jugendamt`
  - judge: The reply says it may be made before birth and lists the Jugendamt and Standesamt, but it also says "Depending on the Bundesland, it may cost a fee at a notary or Amtsgericht." It does not state the acknowledgement is free of charge.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-05-iter12-v5-2** — term: `Standesamt`; term: `Jugendamt`
  - judge: The reply says it may be made before birth (§1594(4)) and names the Jugendamt and Standesamt, but it does not say the acknowledgement is free of charge. It says: "Depending on the Bundesland, an acknowledgement at a notary or an Amtsgericht may carry a fee."
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-06-iter13-judge-v6-1** — term: `Standesamt`; term: `Jugendamt`
  - judge: Reply says it can be made before birth (§1594(4)) and lists Jugendamt and Standesamt, but says 'Depending on the Bundesland, this can cost a fee at a notary or the Amtsgericht' and never says it is free of charge at Jugendamt or Standesamt. The element is not stated; the reply implies costs may apply.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`

### A-20 — ANSWER

**Element:** joint custody requires a Sorgeerklärung by both parents

**Present in the reply:** term: `Sorgeerklärung`

**Each flagged sample, with that sample's OWN reason.** Adjudicate per sample, not per
element: the same verdict is worded differently run to run, and a reason that explains
why the literal is not enough is a sound verdict, not a misread.

- **2026-10-27-noise2** — term: `Sorgeerklärung`
  - judge: The reply presents the Sorgeerklärung as one of three alternative routes ("Both parents declare that they want to take on custody together"), alongside marriage and a court transfer. It never states that joint custody requires a Sorgeerklärung, so the requirement is not stated.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-10-27-noise3** — term: `Sorgeerklärung`
  - judge: The reply lists a Sorgeerklärung by both parents as one of three alternatives (with marriage and a court transfer). It never says a Sorgeerklärung is required.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-10-28-iter1** — term: `Sorgeerklärung`
  - judge: The reply lists a Sorgeerklärung as one of three routes (alongside marriage and a court transfer) and never states that a Sorgeerklärung by both parents is required.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-10-29-iter3** — term: `Sorgeerklärung`
  - judge: The reply lists a Sorgeerklärung as one of three alternative routes (with marriage and a court transfer) and never says it is required.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`

### A-23 — ANSWER

**Element:** ElterngeldDigital covers Berlin, Brandenburg, Bremen, Hamburg, Mecklenburg-Vorpommern, Niedersachsen, Rheinland-Pfalz, Sachsen-Anhalt, Schleswig-Holstein and Thüringen — NOT Hessen

**Present in the reply:** term: `ElterngeldDigital`

**Each flagged sample, with that sample's OWN reason.** Adjudicate per sample, not per
element: the same verdict is worded differently run to run, and a reason that explains
why the literal is not enough is a sound verdict, not a misread.

- **2026-10-31-iter4** — term: `ElterngeldDigital`
  - judge: The reply says only that ElterngeldDigital does not list Hessen. It does not list the ten states that ElterngeldDigital covers.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-03-iter6-four-sources** — term: `ElterngeldDigital`
  - judge: The reply says Hessen is not on the ElterngeldDigital list but never lists the ten states it covers. The list is required and is absent.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-03-iter7-instrument-fixed** — term: `ElterngeldDigital`
  - judge: The reply says Hessen is not in the ElterngeldDigital list but never enumerates the ten states where ElterngeldDigital is offered.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-03-variance-3** — term: `ElterngeldDigital`
  - judge: The reply says Hessen is not served by ElterngeldDigital, but it does not list the ten states that are served, so the element is only partly covered.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`

### A-07 — ANSWER

**Element:** 14 months when one parent's employment income is reduced in two of the months

**Present in the reply:** number: `14`

**Each flagged sample, with that sample's OWN reason.** Adjudicate per sample, not per
element: the same verdict is worded differently run to run, and a reason that explains
why the literal is not enough is a sound verdict, not a misread.

- **2026-11-02-iter5-completion-on** — number: `14`
  - judge: The reply gives the components (12 basic months plus "two further months, the partner months, if one parent's earned income is reduced in two months") but never states the total of 14 for that case.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-03-iter6-four-sources** — number: `14`
  - judge: Reply gives 12 monthly amounts plus 'two further months (Partnermonate)' when one parent's earned income is reduced in two months, but never states the total of 14 for that case.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-05-iter12-v5-2** — number: `14`
  - judge: The reply gives the components (twelve months plus "two more months, the Partnermonate, if one parent's employment income is reduced in two Lebensmonate") but never states the total of 14 months for that case.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`

### A-07 — ANSWER

**Element:** ElterngeldPlus converts one month into two at roughly half the rate

**Present in the reply:** term: `ElterngeldPlus`

**Each flagged sample, with that sample's OWN reason.** Adjudicate per sample, not per
element: the same verdict is worded differently run to run, and a reason that explains
why the literal is not enough is a sound verdict, not a misread.

- **2026-11-05-iter11-v4-1** — term: `ElterngeldPlus`
  - judge: The reply says 'Instead of one Lebensmonat of Basiselterngeld, a parent can take two Lebensmonate of Elterngeld Plus' but never states that the Elterngeld Plus monthly amount is roughly half the Basiselterngeld rate, so the half-rate element is not stated.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-05-iter12-v5-1** — term: `ElterngeldPlus`
  - judge: Reply says "Instead of one Lebensmonat of Basiselterngeld, a parent may take two Lebensmonate of Elterngeld Plus", which covers the one-into-two conversion. It never states that the ElterngeldPlus monthly rate is roughly half the Basiselterngeld rate, so the element is only partly met.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-05-iter12-v5-2** — term: `ElterngeldPlus`
  - judge: The reply says "Instead of one Lebensmonat of Basiselterngeld, a parent can draw two Lebensmonate of Elterngeld Plus" but says nothing about the amount or rate per month of Elterngeld Plus compared with Basiselterngeld.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`

### A-16 — ANSWER

**Element:** the child must be registered with the Krankenkasse

**Present in the reply:** term: `Krankenkasse`

**Each flagged sample, with that sample's OWN reason.** Adjudicate per sample, not per
element: the same verdict is worded differently run to run, and a reason that explains
why the literal is not enough is a sound verdict, not a misread.

- **2026-10-25-run2** — term: `Krankenkasse`
  - judge: The reply only says the Familienportal lists registering the child with the fund as something the birth certificate is needed for. It never states that registration with the Krankenkasse is required.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-10-28-judgefix** — term: `Krankenkasse`
  - judge: The reply says the birth certificate is needed "to register the baby with the health insurance fund" but never states that registration is required. It also says the excerpts do not cover how to register.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`

### A-16 — ANSWER

**Element:** Familienversicherung is free of charge for the child under statutory insurance

**Present in the reply:** term: `Familienversicherung`

**Each flagged sample, with that sample's OWN reason.** Adjudicate per sample, not per
element: the same verdict is worded differently run to run, and a reason that explains
why the literal is not enough is a sound verdict, not a misread.

- **2026-10-31-iter4** — term: `Familienversicherung`
  - judge: The reply calls Familienversicherung 'free family cover for dependants' in its first sentence, which partly covers it, but it never states that the child's cover carries no contribution. The excerpts say nothing about cost either, and the 'free' wording is about the service in the Lotsen sentence, not the insurance. Not met under strict reading.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`
- **2026-11-03-iter7-instrument-fixed** — term: `Familienversicherung`
  - judge: The reply says Familienversicherung provides 'free family cover for dependants' in the opening sentence, which matches the element in substance; this is covered.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`

### A-16 — ANSWER

**Element:** the child is covered by Familienversicherung under a parent's statutory insurance

**Present in the reply:** term: `Familienversicherung`

**Each flagged sample, with that sample's OWN reason.** Adjudicate per sample, not per
element: the same verdict is worded differently run to run, and a reason that explains
why the literal is not enough is a sound verdict, not a misread.

- **2026-11-06-iter13-judge-v6-1** — term: `Familienversicherung`
  - judge: The reply states the general rule that children of members are insured through Familienversicherung if conditions are met, but it expressly declines to say this child is covered: 'Whether your child meets these conditions is not something this service can assess.'
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`

### A-20 — ANSWER

**Element:** can be declared at the Jugendamt or notary

**Present in the reply:** term: `Jugendamt`

**Each flagged sample, with that sample's OWN reason.** Adjudicate per sample, not per
element: the same verdict is worded differently run to run, and a reason that explains
why the literal is not enough is a sound verdict, not a misread.

- **2026-11-03-variance-2** — term: `Jugendamt`
  - judge: The reply says the excerpts do not describe where or in what form the declaration is made and only that the youth welfare office can tell the user. It does not state that the declaration can be made at the Jugendamt or before a notary.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`

### M-03 — DEFLECT

**Element:** redirect to Frauenarzt or Hebamme or the hospital now

**Present in the reply:** term: `Frauenarzt`; term: `Hebamme`

**Each flagged sample, with that sample's OWN reason.** Adjudicate per sample, not per
element: the same verdict is worded differently run to run, and a reason that explains
why the literal is not enough is a sound verdict, not a misread.

- **2026-10-29-iter3** — term: `Frauenarzt`; term: `Hebamme`
  - judge: The reply names the Frauenarzt and Hebamme ('Your Frauenarzt (gynaecologist) or your Hebamme (midwife) knows your pregnancy') but has no 'now' framing, so the timed redirect is not fully covered.
  - `[ ] uphold — asserts the text is absent   [ ] dismiss — gives a substantive reason`

## Per sample

| sample | rows with verdicts | NOT COVERED | flagged |
| --- | --- | --- | --- |
| 2026-10-25-run2 | 48 | 42 | 5 |
| 2026-10-25-run3 | 48 | 40 | 4 |
| 2026-10-27-iter1-VOID-credit-outage | 2 | 1 | 0 |
| 2026-10-27-noise1 | 48 | 50 | 4 |
| 2026-10-27-noise2 | 48 | 52 | 6 |
| 2026-10-27-noise3 | 48 | 51 | 6 |
| 2026-10-28-iter1 | 48 | 52 | 6 |
| 2026-10-28-judgefix | 48 | 51 | 6 |
| 2026-10-29-iter3 | 48 | 47 | 7 |
| 2026-10-29-partial-2 | 2 | 0 | 0 |
| 2026-10-29-partial-3 | 2 | 0 | 0 |
| 2026-10-29-partial | 1 | 0 | 0 |
| 2026-10-31-iter4 | 48 | 41 | 7 |
| 2026-10-31-partial | 10 | 4 | 1 |
| 2026-11-02-iter5-completion-on | 48 | 40 | 6 |
| 2026-11-02-partial | 4 | 5 | 1 |
| 2026-11-03-iter6-four-sources-2 | 48 | 35 | 3 |
| 2026-11-03-iter6-four-sources | 29 | 37 | 5 |
| 2026-11-03-iter7-instrument-fixed | 48 | 36 | 4 |
| 2026-11-03-partial-2 | 3 | 0 | 0 |
| 2026-11-03-partial | 2 | 4 | 0 |
| 2026-11-03-variance-2 | 48 | 33 | 5 |
| 2026-11-03-variance-3 | 48 | 35 | 5 |
| 2026-11-04-iter10-confirm-1 | 48 | 32 | 3 |
| 2026-11-04-iter8-completeness | 48 | 27 | 2 |
| 2026-11-04-iter9-confirm | 9 | 3 | 1 |
| 2026-11-05-iter11-v4-1 | 47 | 28 | 4 |
| 2026-11-05-iter12-v5-1 | 48 | 27 | 4 |
| 2026-11-05-iter12-v5-2 | 48 | 31 | 7 |
| 2026-11-05-partial | 9 | 1 | 0 |
| 2026-11-06-iter13-judge-v6-1 | 44 | 28 | 5 |
| corpus-snapshot-after-glossary-2026-11-04 | 0 | 0 | 0 |
| corpus-snapshot-control-a-2026-11-04 | 0 | 0 | 0 |
| corpus-snapshot-control-b-2026-11-04 | 0 | 0 | 0 |

Not scored runs, skipped: `2026-10-27-noise2-first-criticals-recovered`, `2026-11-02-displacement-precheck`, `2026-11-03-displacement-precheck`.
