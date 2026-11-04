# golden_set v1.8 → v1.9 — change log

Date: 2026-11-04 · corpus_version `2026-10` · 48 rows, unchanged · **2 required elements removed**

A **measurement correction, not a quality improvement** — the same label v1.7 and v1.8 carried, for
the same reason. Neither change makes the answer layer better at anything. **Keep this delta out
of the Phase 5 improvement narrative**, and note that unlike v1.8 this one **does move a gate
denominator**: ANSWER requirements **95 → 93**.

Verified cell by cell rather than by eye: the migration compared every cell of all 48 rows and
reported exactly **2 differences** — `A-02.required_answer_elements` and
`A-16.required_answer_elements`. Requirement counts: **ANSWER 95 → 93**, DEFLECT 18 and REFUSE 16
unchanged. No `ground_truth_source`, no `ground_truth_url`, no `must_not_contain` and no
`verify_priority` cell was touched, which is why the retrieval band carries through (ADR-052).

The two standing constraints still bind: **no semicolons** inside an element (`run.ts` splits
clause cells on a bare `;`) and **one claim per element**.

Human ruling, 2026-11-04: class F — the two elements the 2026-10-31 classification report flagged
as *"advice or an inference"* rather than statements of law — is to be treated as **mis-specified
goldens**, corrected or removed. Both are removed. The reasoning differs between them, and the
second is the more serious.

---

## A-02 — "How long after birth can we apply for Elterngeld without losing money?"

| | |
| --- | --- |
| **was** | `… ; there is no absolute application deadline but earlier months are forfeited; apply as early as possible after birth` |
| **now** | `… ; there is no absolute application deadline but earlier months are forfeited` |

**Removed, as fully redundant advice.** Elements 1 and 2 already carry the entire legal content of
BEEG §7(1): retroactive payment for at most the three months before the month of application, and
no absolute deadline with earlier months forfeited. *"Apply as early as possible after birth"*
adds no proposition about the law — it is the procedural recommendation a reader derives from
elements 1 and 2.

It also sat against its own row. A-02's `must_not_contain` is **`a fixed 92-day statutory
deadline`**: the row exists to check that the model does *not* convert a retroactivity window into
a deadline. Requiring it to urge promptness pushes at exactly the register that guard protects, and
`answer.v2.md` suppresses that register deliberately.

## A-16 — "How do we insure the baby after the birth?"

| | |
| --- | --- |
| **was** | `… ; the child must be registered with the Krankenkasse; register promptly so cover runs from the date of birth; the child's insurance number is needed for other applications` |
| **now** | `… ; the child must be registered with the Krankenkasse; the child's insurance number is needed for other applications` |

**Removed because it is advice AND because its legal half misstates SGB V §10.** This went further
than the classification report found.

Read against the ingested text:

- **§10(1):** *"Versichert **sind** der Ehegatte, der Lebenspartner und **die Kinder von
  Mitgliedern** …"* — the child's Familienversicherung arises **by operation of law** once the
  conditions in Nr. 1–5 are met. Not by application, and not on registration.
- **§10(6):** *"Das Mitglied **hat** die … Versicherten mit den für die Durchführung der
  Familienversicherung notwendigen Angaben … an die zuständige Krankenkasse **zu melden**."* — a
  notification duty (Meldepflicht), which is what element 2 already tests.

So *"register promptly **so cover runs from the date of birth**"* makes registration the trigger
for cover. Under §10 it is not: the status exists in law and registration is a duty to report it.
Correcting the element to its legal half was considered and rejected — **nothing in the corpus
states that cover runs from the date of birth.** A corpus-wide search for `vom Tag der Geburt` /
`ab der Geburt` / `seit der Geburt` returns Elterngeld, Elternzeit, Kindergeld and Mutterschutz
sentences only, and none about Familienversicherung. Writing the "corrected" element would have
created an unanswerable requirement — the A-21 failure mode, manufactured on purpose.

### Flagged, NOT changed: A-16 element 4

*"the child's insurance number is needed for other applications"* is **unreachable from the
corpus** — `Versicherungsnummer` and `Krankenversichertennummer` return **0 chunks**. It is not
advice, so it is outside the class F ruling, and it is not being changed here. It is a candidate
for a later golden correction or, on a structural-impossibility argument, for
`coverage-exclusions.yaml`. Neither is proposed now: a third denominator change needs its own
ruling.

---

## What this does to the figures — both, as the standing rule requires

Nothing improved. The same 60 covered elements, measured against a denominator smaller by two:

| | v1.8 | v1.9 |
| --- | --- | --- |
| scorable coverage (last full sample, variance-3) | 60/87 = 69.0% | **60/85 = 70.6%** |
| the ≥75% gate, in elements | 66 of 87 | **64 of 85** |
| distance from the gate | 6 elements | **4 elements** |

The bar moved down by two elements because two elements that could never be met left the set. That
is not progress toward it, and no report may present it as such.
