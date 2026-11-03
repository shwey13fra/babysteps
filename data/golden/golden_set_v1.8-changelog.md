# golden_set v1.7 → v1.8 — change log

Date: 2026-11-03 · corpus_version `2026-10` · 48 rows, unchanged · **2 required elements and 1
ground_truth_source corrected**

A **measurement correction, not a quality improvement** — the same label v1.7 carried, for the same
reason. Each change fixes an element the harness could not grade fairly, and the reported numbers
will move without the answer layer having changed at all. Keep this delta out of the Phase 5
improvement narrative.

Verified cell by cell rather than by eye: the migration compared every cell of all 48 rows and
reported exactly **3 differences** — `A-13.ground_truth_source`,
`R-02.required_answer_elements`, `R-03.required_answer_elements`. **Requirement counts are
unchanged: ANSWER 95, DEFLECT 18, REFUSE 16**, so no gate denominator moves.

The two constraints from v1.7 still bind: **no semicolons** (`run.ts` splits clause cells on a
bare `;`, so one would silently become two elements) and **one claim per element**.

---

## R-02 — "I am privately insured with a German insurer. What will they pay for the birth?"

| | |
| --- | --- |
| **was** | `points to the insurer and the official channels` |
| **now** | `points the user to their own insurer` |

**This is the compound element v1.7 diagnosed and did not fix.** That changelog named it directly:
*"Compound elements are a diagnosed failure mode in this set — R-02 and R-04 fail on the second
conjunct of an element wearing one row ('points to the insurer and the official channels')."*
It was described as a known defect and left in place; iter6 then failed R-02 on exactly that
second conjunct, with the judge's reason reading *"points to the insurer, but names no official
channel beyond that."*

**Why the fix narrows rather than splits.** The obvious repair is two elements, one per conjunct.
Rejected, because the second conjunct is **not true of this row**: the question is what a *private*
insurer will pay, and no German public authority answers that. There is no "official channel" to
point at — the insurer *is* the channel. Splitting would have preserved a requirement that asks the
reply to name a body which does not exist, and R-02 would have gone on failing for being right.

**This removes a requirement, and that is stated plainly rather than buried:** the reply no longer
has to name an official channel on R-02. The redirect requirement survives in full on the rows
where an authority genuinely exists.

---

## R-03 — "How do I get a Chinese passport for my baby born in Berlin?"

| | |
| --- | --- |
| **was** | `states that only the India consular track is covered` |
| **now** | `states that the Chinese consular track is not covered` |

The old element could only be covered by producing the **word** "only". iter6's reply listed the
product's three scopes, the Indian consular track among them, and was marked uncovered with the
reason *"The reply says the product covers 'the Indian consular track' as part of a list of three
scopes, but never says the India track is the only consular track covered. The 'only' is not
stated."*

**The same shape as A-20's "requires" in v1.7:** an element demanding a specific quantifier, which
a substantively correct answer fails. And the demand is the wrong way round for a refusal row —
what R-03 must actually do is tell this user that *China* is out of scope. A reply that says
"we cover India only" and a reply that says "we do not cover China" both discharge the duty; the
second is what the user asked about.

Deliberately **not** loosened into "mentions scope". The element still names a specific thing the
reply must state, so it can still fail.

---

## A-13 — "What do we need to bring to the Standesamt to register the birth?"

| | |
| --- | --- |
| **was** | `PStG §18 + Hessen Standesamt guidance` |
| **now** | `PStV §33 + PStG §18 + Hessen Standesamt guidance` |

**The spec named the wrong provision, and `b1017da` proved it.** PStG §18 is the *notification
deadline* — *"Die Geburt eines Kindes ist dem Standesamt … binnen einer Woche anzuzeigen"*. The
documents this row asks about are in **PStV §33, "Nachweise bei Anzeige der Geburt"**, which lists
them: the parents' `Personalausweis` or `Reisepass` (Nr. 3), the doctor's or midwife's
`Bescheinigung über die Geburt` (Nr. 4), the `Eheurkunde` or the `Vaterschaftsanerkennung`
(Nr. 1/2), and the parents' own `Geburtsurkunden` (Nr. 1/2).

In iter6 the reply cited PStV §33 and §34, coverage on the row rose **1 → 4**, and it was
nonetheless scored a **retrieval miss** — because `run.ts:573` tests `groundRefs[0]`, which was
PStG §18. The answer layer found the better source and the spec marked it wrong.

**Order is load-bearing.** PStV §33 goes first so it becomes the primary ref; PStG §18 stays as a
secondary, which means it now shows up in `secondaryMissing` when it falls out of the ranked
top-8. That is the desired behaviour, not a side effect: the statute leaving the window is exactly
what cost A-12 its pass in iter6, and this makes the same event visible on A-13 instead of silent.

**Not changed.** A-13's elements 2 (`residence registration`) and 6 (`certified German
translations and legalisation for foreign documents`) are in **no source the corpus holds** —
`Meldebescheinigung`, `Anmeldung`, `Übersetzung`, `Legalisation` and `Apostille` all occur **0
times** in PStV §33. They stay as uncovered class C elements needing the Hessen Standesamt page,
and they are **not** excluded from the denominator: an ingestable source plausibly exists.
