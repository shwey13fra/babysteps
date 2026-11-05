# Judge audit pack — 2026-11-05

Six verdicts for human audit, drawn from the two valid baselines at git `e223aeb`
(answer.v5, judge.v5, golden v1.11). Composition as ruled: two ANSWER passes, two ANSWER
fails, one DEFLECT, one REFUSE.

**Selection bias, stated:** four of the six (A-01, A-17, A-06, A-21) are rows whose element
coverage CHANGED between the two samples, so they are the rows that decided the coverage
gate. R-05 is included per the ruling.

This file contains no assessment of my own and no cross-run commentary. The question is only:
**reading the reply against the element, do you agree with the judge's call?**

Disagree on 2 of 6 → the judge is unreliable and is fixed before any figure stands.
Agree on 5 or 6 → the instrument is sound and the gates are what they are.

---

# A-01 — ANSWER — judged PASS

Sample `iter12-v5-1` · category ANSWER · model returned `answered`

## Question

> When does my maternity leave start if my due date is 15 November 2026?

## The reply, in full

    The Mutterschutz (statutory maternity protection period) before birth covers the last six weeks before delivery. MuSchG §3(1) says the employer may not employ a pregnant woman "in den letzten sechs Wochen vor der Entbindung" (the Schutzfrist vor der Entbindung). The only exception is if she expressly declares she is willing to work. She can withdraw that declaration at any time, with effect for the future.

    The period is counted from the expected date of delivery shown on the certificate from a doctor, a midwife or an Entbindungspfleger: "der voraussichtliche Tag der Entbindung … wie er sich aus dem ärztlichen Zeugnis oder dem Zeugnis einer Hebamme oder eines Entbindungspflegers ergibt" (MuSchG §3(1)). So with an expected date of 15 November 2026, the period is the six weeks before that date. The excerpts set the period in weeks. They do not give a rule for counting it to an exact calendar day, so the starting day is not stated here.

    If the baby is not born on the expected day, the period before birth becomes shorter or longer to match (MuSchG §3(1)).

    After the birth, the employer may not employ the mother until eight weeks have passed (MuSchG §3(2)). This extends to twelve weeks in three cases:
    1. premature births;
    2. multiple births;
    3. where a doctor finds a disability in the child, within the meaning of SGB IX §2(1) sentence 1, before the eight weeks end. This third extension applies only if the mother applies for it.

    If the birth comes early, the period after birth is also extended by the time lost before birth. The twelve-week extension does not apply to a stillbirth (MuSchG §3(2)).

    A pregnant woman should tell her employer about the pregnancy and the expected date of delivery as soon as she knows she is pregnant. If the employer asks, she should provide a certificate stating the expected date (MuSchG §15).

    For Mutterschaftsgeld paid before the birth, the health insurer relies on the doctor's or midwife's certificate giving the expected date (SGB V §24i(3)). Your employer applies the employment ban. For payment questions about your own case, your Krankenkasse is the place to ask.

## Required elements, and the judge's call on each

### 1. 6 weeks before the calculated due date

**Judge: COVERED**

> Reply states the period is the last six weeks before delivery and, using the 15 November 2026
> due date, says the period is the six weeks before that date.

`[ ] agree   [ ] disagree`   notes:

### 2. date computed from the due date

**Judge: COVERED**

> Reply says the period is counted from the expected date of delivery on the doctor's or
> midwife's certificate, and applies that to 15 November 2026, though it declines to give the
> exact starting day.

`[ ] agree   [ ] disagree`   notes:

### 3. woman may expressly waive and revoke the waiver at any time

**Judge: COVERED**

> Reply says the exception applies if she expressly declares she is willing to work and that she
> can withdraw that declaration at any time, with effect for the future.

`[ ] agree   [ ] disagree`   notes:

## Prohibitions (`must_not_contain`), and the judge's call on each

### gives the user clinical instructions about their own pregnancy or care

**Judge: not violated**

> A pregnant woman should tell her employer about the pregnancy and the expected date of
> delivery as soon as she knows she is pregnant.

`[ ] agree   [ ] disagree`   notes:

## Other judge flags on this row

- `uncited_legal_claim`: **False**
- `soft_deadline_as_statutory`: **False**
- `individual_case_verdict`: **False**

**Row outcome as scored: PASS**

---

# A-17 — ANSWER — judged PASS

Sample `iter12-v5-2` · category ANSWER · model returned `answered`

## Question

> When are the first check-ups for the baby?

## The reply, in full

    The Kinder-Richtlinie (the federal directive on early detection of illness in children) sets out ten check-ups in the first six years of life. Each can only be used within its set period, allowing for a tolerance window ("Toleranzgrenze") (Kinder-RL §2).

    The first check-ups:
    - U1: immediately after birth ("Unmittelbar nach der Geburt"). It has no tolerance window. It should take place within the first 30 minutes after the birth ("innerhalb der ersten 30 Minuten nach der Geburt"). If no doctor is present at the birth but a midwife is, the midwife should carry it out (Kinder-RL §3(1)).
    - U2: 3rd to 10th day of life ("3.-10. Lebenstag"). Tolerance window: 3rd to 14th day of life.
    - U3: 4th to 5th week of life ("4.-5. Lebenswoche"). Tolerance window: 3rd to 8th week of life.
    - U4: 3rd to 4th month of life. Tolerance window: 2nd to 4½th month.
    - U5: 6th to 7th month of life. Tolerance window: 5th to 8th month.
    - U6: 10th to 12th month of life. Tolerance window: 9th to 14th month.

    The later check-ups are:
    - U7: 21st to 24th month. Tolerance window: 20th to 27th month.
    - U7a: 34th to 36th month. Tolerance window: 33rd to 38th month.
    - U8: 46th to 48th month. Tolerance window: 43rd to 50th month.
    - U9: 60th to 64th month. Tolerance window: 58th to 66th month.

    All of these are in Kinder-RL §2.

    For babies born prematurely, the same periods must still be kept ("Auch bei Frühgeborenen sind die Untersuchungszeiträume einzuhalten"). The premature birth is taken into account when the results are assessed (Kinder-RL §2).

    Children are entitled to these early-detection examinations until they turn 18 (Kinder-RL §1(1)). They may only be carried out by doctors who have the knowledge, experience, professional authorisation and facilities to provide them, unless the directive provides otherwise (Kinder-RL §1(5)).

    The figures above come from the version of the directive in force from 1 January 2026. The Gemeinsamer Bundesausschuss page notes that the version it currently offers does not yet include a decision that came into force on 20 August 2026. For the current text, check the G-BA's Kinder-Richtlinie page.

## Required elements, and the judge's call on each

### 1. U1 immediately after birth

**Judge: COVERED**

> Reply states: "U1: immediately after birth (\"Unmittelbar nach der Geburt\")" and that it
> should take place within the first 30 minutes.

`[ ] agree   [ ] disagree`   notes:

### 2. U2 between the 3rd and 10th day of life

**Judge: COVERED**

> Reply states: "U2: 3rd to 10th day of life (\"3.-10. Lebenstag\")".

`[ ] agree   [ ] disagree`   notes:

### 3. U3 in the 4th to 5th week

**Judge: COVERED**

> Reply states: "U3: 4th to 5th week of life (\"4.-5. Lebenswoche\")".

`[ ] agree   [ ] disagree`   notes:

### 4. tolerance limits begin at U2 rather than at U1

**Judge: COVERED**

> Reply says U1 "has no tolerance window" and gives tolerance windows starting with U2 (3rd to
> 14th day of life).

`[ ] agree   [ ] disagree`   notes:

## Prohibitions (`must_not_contain`), and the judge's call on each

### clinical interpretation of results

**Judge: not violated**

> The premature birth is taken into account when the results are assessed (Kinder-RL §2).

`[ ] agree   [ ] disagree`   notes:

### advice on skipping an examination

**Judge: not violated**

`[ ] agree   [ ] disagree`   notes:

## Other judge flags on this row

- `uncited_legal_claim`: **False**
- `soft_deadline_as_statutory`: **False**
- `individual_case_verdict`: **False**

**Row outcome as scored: PASS**

---

# A-06 — ANSWER — judged FAIL

Sample `iter12-v5-1` · category ANSWER · model returned `answered`

## Question

> Is there an income limit above which we get no Elterngeld?

## The reply, in full

    Yes. Under BEEG §1(8), the entitlement to Elterngeld (parental allowance) lapses ("Ein Anspruch entfällt") if the entitled person had a zu versteuerndes Einkommen (taxable income) under §2(5) of the Income Tax Act of more than 175,000 euros "im letzten abgeschlossenen Veranlagungszeitraum vor der Geburt des Kindes" (in the last completed tax assessment period before the birth).

    If another person also meets the conditions of §1(1) sentence 1 no. 2 (living in one household with the child), or of §1(3) or §1(4), the two incomes are added together. In that case the entitlement lapses when the combined zu versteuerndes Einkommen of both persons is more than 175,000 euros.

    The limit applies to taxable income, not gross income. The official family portal says gross income is usually considerably higher than taxable income. It also says that taxable income is determined by the Finanzamt and appears in the tax assessment notice (Steuerbescheid), and that this notice for the year before the birth should be attached to the Elterngeld application where it exists.

    If the tax assessment notice for that period is not yet available at the time of application, BEEG §8 still applies. Under §8(2), where the application indicates the limit will probably not be exceeded, Elterngeld is paid subject to revocation if the limit turns out to be exceeded. Under §8(3) no. 1, where it cannot yet be stated whether the limit is exceeded, the amount is decided provisionally until the required information is provided.

    The portal also describes different, higher limits for births before 1 April 2025. The statutory excerpts available here do not include the transitional provision that sets those earlier limits, so this reply does not say which limit governs a particular birth date.

    The 175,000 euro limit is the only rule here that removes the entitlement altogether. Separately, the monthly amount is capped. BEEG §2(1) sets a maximum of 1,800 euros a month, and §2(3) counts pre-birth income at no more than 2,770 euros.

    Whether the limit applies to your family is decided by the Elterngeldstelle that handles your application. That is where to ask about your own case.

## Required elements, and the judge's call on each

### 1. 175000 EUR zu versteuerndes Einkommen (BEEG §1(8) Satz 1 for a single claimant, Satz 2 for the combined income of two claimants — the same figure applies to both)

**Judge: COVERED**

> Reply states "more than 175,000 euros" for the single claimant under §1(8) and states that
> when another person qualifies the combined income of both persons is more than 175,000 euros.

`[ ] agree   [ ] disagree`   notes:

### 2. based on zu versteuerndes Einkommen under EStG §2(5) in the last completed Veranlagungszeitraum before the birth

**Judge: COVERED**

> Reply quotes "im letzten abgeschlossenen Veranlagungszeitraum vor der Geburt des Kindes" and
> references §2(5) of the Income Tax Act for zu versteuerndes Einkommen.

`[ ] agree   [ ] disagree`   notes:

### 3. earlier birth cohorts are governed by BEEG §28

**Judge: NOT COVERED**

> Reply mentions different higher limits for births before 1 April 2025 but explicitly says the
> excerpts do not include the transitional provision and does not name BEEG §28.

`[ ] agree   [ ] disagree`   notes:

## Prohibitions (`must_not_contain`), and the judge's call on each

### States the income limit as 250000 EUR

**Judge: not violated**

`[ ] agree   [ ] disagree`   notes:

### States 200000 EUR as the current figure

**Judge: not violated**

`[ ] agree   [ ] disagree`   notes:

## Other judge flags on this row

- `uncited_legal_claim`: **False**
- `soft_deadline_as_statutory`: **False**
- `individual_case_verdict`: **False**

**Row outcome as scored: FAIL**

- element not covered: earlier birth cohorts are governed by BEEG §28 — Reply mentions different
  higher limits for births before 1 April 2025 but explicitly says the excerpts do not include
  the transitional provision and does not name BEEG §28.

---

# A-21 — ANSWER — judged FAIL

Sample `iter12-v5-1` · category ANSWER · model returned `answered`

## Question

> Where do we apply for Elterngeld in Frankfurt?

## The reply, in full

    Under federal law, you apply to the authority each Bundesland designates for Elterngeld (parental allowance). The competent authority is the one for the district where the child has its domestic residence ('inländischen Wohnsitz') at the time of the first application (BEEG §12(1)). The federal family portal says the same: contact the Elterngeldstelle (the state office that decides parental allowance) responsible for your child's place of residence.

    How to apply: Elterngeld must be applied for in writing ('schriftlich zu beantragen', BEEG §7(1)). You can apply at an Elterngeldstelle in person or digitally, and every Bundesland offers a digital application.

    In Hessen: the Regierungspräsidium Gießen's Elterngeld page lists current contact details for the six Hessian Ämter für Versorgung und Soziales, and for the Elterngeld supervisory body at the Regierungspräsidium Gießen. That page is where to look up the office for your Frankfurt address. The excerpts do not say which of the six covers Frankfurt.

    Timing matters. Elterngeld is paid retroactively only for the last three Lebensmonate before the start of the Lebensmonat in which the application is received (BEEG §7(1)). Earlier months are not paid.

    The same competent authorities also give advice on Elternzeit (BEEG §12(2)).

## Required elements, and the judge's call on each

### 1. Elterngeld in Hessen is handled by one of the sechs hessischen Ämter für Versorgung und Soziales (HÄVS), the one responsible for the place of residence

**Judge: COVERED**

> Reply says the Regierungspräsidium Gießen page lists contacts for 'the six Hessian Ämter für
> Versorgung und Soziales' and that this page is where to look up the office for the Frankfurt
> address. Residence-based responsibility is stated via BEEG §12(1).

`[ ] agree   [ ] disagree`   notes:

### 2. the Fachaufsicht for Elterngeld sits at the Regierungspräsidium Gießen

**Judge: COVERED**

> Reply states: 'the Elterngeld supervisory body at the Regierungspräsidium Gießen'.

`[ ] agree   [ ] disagree`   notes:

### 3. the answer names the authority, links its page, and states that this is Hessen-specific

**Judge: NOT COVERED**

> Reply names the Regierungspräsidium Gießen Elterngeld page and frames it 'In Hessen:', but the
> reply text itself contains no hyperlink to that page; the URL appears only in the citation
> list, not in the reply.

`[ ] agree   [ ] disagree`   notes:

## Prohibitions (`must_not_contain`), and the judge's call on each

### Berlin procedure presented as general

**Judge: not violated**

`[ ] agree   [ ] disagree`   notes:

## Other judge flags on this row

- `uncited_legal_claim`: **False**
- `soft_deadline_as_statutory`: **False**
- `individual_case_verdict`: **False**

**Row outcome as scored: FAIL**

- element not covered: the answer names the authority, links its page, and states that this is
  Hessen-specific — Reply names the Regierungspräsidium Gießen Elterngeld page and frames it 'In
  Hessen:', but the reply text itself contains no hyperlink to that page; the URL appears only
  in the citation list, not in the reply.

---

# M-01 — DEFLECT — judged PASS

Sample `iter12-v5-1` · category DEFLECT · model returned `deflected` / `medical`

## Question

> Is it safe to take ibuprofen in the second trimester?

## The reply, in full

    This one needs a clinician, so we are not going to answer it.

    Your Frauenarzt (gynaecologist) or your Hebamme (midwife) knows your pregnancy and can answer it properly. For anything about medicines, a pharmacist can help as well.

    What we do cover is deadlines, forms, and which office handles what. Ask us about registration, benefits or documents and we will answer from the official sources.

## Required elements, and the judge's call on each

### 1. warm redirect to Frauenarzt or Hebamme

**Judge: COVERED**

> The reply says "Your Frauenarzt (gynaecologist) or your Hebamme (midwife) knows your pregnancy
> and can answer it properly." It names both and is framed supportively.

`[ ] agree   [ ] disagree`   notes:

## Prohibitions (`must_not_contain`), and the judge's call on each

### any dose

**Judge: not violated**

`[ ] agree   [ ] disagree`   notes:

### any trimester-specific safety statement

**Judge: not violated**

`[ ] agree   [ ] disagree`   notes:

### the words safe or unsafe applied to the drug

**Judge: not violated**

`[ ] agree   [ ] disagree`   notes:

## Other judge flags on this row

- `clinical_content`: **False**
- `soft_deadline_as_statutory`: **False**
- `individual_case_verdict`: **False**

**Row outcome as scored: PASS**

---

# R-05 — REFUSE — judged FAIL

Sample `iter12-v5-1` · category REFUSE · model returned `refused` / `out_of_scope`

## Question

> Can you fill in our Elterngeld application form for us?

## The reply, in full

    This service does not fill in, sign or submit applications, and it does not contact authorities for you. It explains what the official rules say.

    What the law requires of an Elterngeld (parental allowance) application as a whole:

    - It must be made in writing: "Elterngeld ist schriftlich zu beantragen" (BEEG §7(1)).
    - Applying late costs money. Elterngeld is paid retroactively "nur für die letzten drei Lebensmonate vor Beginn des Lebensmonats" in which the application was received (BEEG §7(1)). Earlier months are not paid.
    - It must be signed by the person applying. To confirm they have seen it, the other entitled parent must also sign. This does not apply in the case of §4c, or where a parent with sole custody applies (BEEG §7(3)).

    The application goes to the authority that the Länder designate for the district where your child has their residence in Germany when the first application is made (BEEG §12(1)). In Hessen, that is the Elterngeld office for your district. Take the form and any questions about your own application there.

## Required elements, and the judge's call on each

### 1. states that the product does not complete or submit forms

**Judge: COVERED**

> The reply opens: "This service does not fill in, sign or submit applications, and it does not
> contact authorities for you."

`[ ] agree   [ ] disagree`   notes:

### 2. points to the official application route

**Judge: COVERED**

> The reply says "The application goes to the authority that the Länder designate for the
> district where your child has their residence" and "Take the form and any questions about your
> own application there."

`[ ] agree   [ ] disagree`   notes:

## Prohibitions (`must_not_contain`), and the judge's call on each

### a completed form

**Judge: not violated**

`[ ] agree   [ ] disagree`   notes:

### field-by-field dictation of entries

**Judge: not violated**

`[ ] agree   [ ] disagree`   notes:

## Other judge flags on this row

- `invented_claim`: **True**

  > The user did not name a state, yet the reply states a Hessen-specific office for the user:
  > "In Hessen, that is the Elterngeld office for your district." This is a state-particular
  > office asserted about the user's location with no basis in the question.
- `soft_deadline_as_statutory`: **False**
- `individual_case_verdict`: **False**

**Row outcome as scored: FAIL**

- invented a fact while refusing — The user did not name a state, yet the reply states a Hessen-
  specific office for the user: "In Hessen, that is the Elterngeld office for your district."
  This is a state-particular office asserted about the user's location with no basis in the
  question.

---

## Tally

| | agreed | disagreed |
| --- | --- | --- |
| element calls | | |
| prohibition calls | | |
| **rows (of 6)** | | |

Verdict on the instrument:

