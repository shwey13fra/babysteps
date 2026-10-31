# golden_set v1.6 → v1.7 — change log

Date: 2026-10-31 · corpus_version `2026-10` · 48 rows, unchanged · **3 required elements
corrected against the provisions they cite**

Three elements were wrong as statements of law. Each is corrected **against the statute or
directive, never against our output** — the rule the human set when approving this change. Where
a question about the judge's behaviour had to be answered before editing a row, that is recorded
under A-20.

Only `required_answer_elements` moves, and only in A-07, A-17 and A-20. Verified cell by cell
rather than by eye: the migration compared every cell of all 48 rows against v1.6 and reported
`required_answer_elements: A-07, A-17, A-20` as the only differences. The **ANSWER-row
requirement count is 95 before and 95 after**, so the Phase 5 gate denominator is unchanged.

## How this delta must be reported

**A measurement correction, not a quality improvement.** Coverage will move because three
elements stop being wrong or unsatisfiable, which has nothing to do with the answer layer. This
delta is to be labelled as such in the next report and kept out of the Phase 5 improvement
narrative.

## Two constraints that shaped the wording

- **No semicolons.** `scripts/eval/run.ts:150` splits a clause cell on a bare `;`, so a
  semicolon inside an element silently becomes two elements and moves the denominator.
- **One claim per element.** Compound elements are a diagnosed failure mode in this set — R-02
  and R-04 fail on the *second conjunct* of an element wearing one row ("points to the insurer
  **and** the official channels"). So each correction asserts a single thing, and the provision
  is cited here rather than inside the element where the judge would have to grade it too.

---

## A-07 — "How many months of Elterngeld can we get in total?" · BEEG §4

| | |
| --- | --- |
| **was** | `14 if both parents take at least 2 months` |
| **now** | `14 months when one parent's employment income is reduced in two of the months` |

**BEEG §4(3):** *"Die Eltern haben gemeinsam Anspruch auf zwölf Monatsbeträge Basiselterngeld.
Ist das Einkommen aus Erwerbstätigkeit **eines Elternteils** in zwei Lebensmonaten gemindert,
haben die Eltern gemeinsam Anspruch auf zwei weitere Monate Basiselterngeld (Partnermonate)."*

The condition the statute attaches is a reduction in **one parent's** employment income over two
months. It is not a requirement that each parent take two months.

**The old element also excluded a case the statute expressly provides for.** §4(4) s.1 caps one
parent at twelve months, but **§4c(1)** departs from that sentence by name — *"Ein Elternteil
kann **abweichend von § 4 Absatz 4 Satz 1** zusätzlich auch das Elterngeld für die Partnermonate
nach § 4 Absatz 3 Satz 2 beziehen, wenn das Einkommen aus Erwerbstätigkeit für zwei Lebensmonate
gemindert ist und …"* — so a **single parent can reach fourteen months alone**. An element
conditioned on "both parents" marks a correct answer about that family wrong.

What the statute does say about two months: **§4(4) s.2**, *"Ein Elternteil hat nur Anspruch auf
Elterngeld, wenn er es mindestens für zwei Lebensmonate bezieht"* — a two-month minimum is the
condition of a parent having **any** claim, which is the kernel the colloquial form garbled.

The new wording is satisfied by the two-parent case and the §4c single-parent case alike, because
both are "one parent's employment income reduced in two of the months".

*Not changed, recorded as an option:* §4(5) grants **13/14/15/16** months for births six, eight,
twelve or sixteen weeks before the due date. A question asking the total in principle has a
statutory answer this row never required. Adding it would move the denominator, so it was left
out of a migration whose point is that the denominator holds.

---

## A-17 — "When are the first check-ups for the baby?" · G-BA Kinder-Richtlinie §2

| | |
| --- | --- |
| **was** | `each has a tolerance window` |
| **now** | `tolerance limits begin at U2 rather than at U1` |

**Kinder-RL §2**, confirmed against the ingested directive text rather than against this row's
own notes: *"Die Untersuchungen können nur in den jeweils angegebenen Zeiträumen unter
Berücksichtigung folgender Toleranzgrenzen in Anspruch genommen werden:"*

| Untersuchung | Zeitraum | Toleranzgrenze |
| --- | --- | --- |
| U1 | Unmittelbar nach der Geburt | *(the column is empty)* |
| U2 | 3.–10. Lebenstag | 3.–14. Lebenstag |
| U3 | 4.–5. Lebenswoche | 3.–8. Lebenswoche |

**U1 carries no Toleranzgrenze.** It is *unmittelbar nach der Geburt*, so there is no window to
tolerate, and tolerance limits begin at U2. The old element said *each* examination has one, so
it could only be covered by asserting a U1 tolerance that does not exist — substantively wrong,
not merely unsourceable.

Replaced rather than removed: the tolerance limits are the outer bound of the entitlement, the
difference between "I missed it" and "I still have time", which is exactly the administrative
fact this product exists to state.

---

## A-20 — "How do unmarried parents get joint custody?" · BGB §1626a

| | |
| --- | --- |
| **was** | `joint custody requires a Sorgeerklärung by both parents` |
| **now** | `a Sorgeerklärung by both parents is one of three routes to joint custody` |

**BGB §1626a(1):** *"Sind die Eltern bei der Geburt des Kindes nicht miteinander verheiratet, so
steht ihnen die elterliche Sorge gemeinsam zu, 1. wenn sie erklären, dass sie die Sorge gemeinsam
übernehmen wollen (Sorgeerklärungen), 2. wenn sie einander heiraten oder 3. soweit ihnen das
Familiengericht die elterliche Sorge gemeinsam überträgt."*

Three routes, of which a Sorgeerklärung is one. **§1626a(2)** adds that the Familiengericht
transfers joint custody on one parent's application where it does not conflict with the child's
welfare, and presumes no conflict where the other parent advances no opposing grounds.

The old element could only be covered by a statement that **misdescribes §1626a(1)**. It rewarded
a false statement of law and marked a correct one wrong.

### The judge question, settled before the row was touched

The row was **not** edited until it was established that this is not a judge problem. The judge
failed the element for **omission**, not for the presence of the other two routes — its recorded
reason is *"…and never says it is required"*, and the standard it applied is the one it was
given: `judge.v2.md:97-99`, *"`covered` is true only when the reply does or states that thing"*,
and `judge.v2.md:108`, *"An element is covered or not on the evidence of the reply alone."*
**No change to judge.v2.md is indicated. The judge is working.**

The lenient reading — that only the word "requires" was missing while the substance was present —
was considered and rejected. Loosening the judge so that "requires" is satisfied by "is one of
three options" would make it accept overstated legal requirements across the whole set, which is
the opposite of what this product needs. The narrow fix to the row is the safe one.
