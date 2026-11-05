# golden_set v1.11 → v1.12 — change log

Date: 2026-11-05 · corpus_version `2026-10` · 48 rows, unchanged · **1 required element corrected**

A **specification correction**, found by a human judge audit. Nothing in the answer layer changed
by this file. Keep it out of any improvement narrative.

**This does NOT move a gate denominator.** One textual replacement of a unique substring: exactly
**1 of 49 lines differs**, all 49 rows parse at 11 fields, A-01's element count stays at **3**, and
the ANSWER scorable denominator stays at **85**.

Both standing constraints hold: **no semicolons** inside an element (`run.ts` splits clause cells
on a bare `;`) and **one claim per element**.

---

## A-01 — "When does my maternity leave start if my due date is 15 November 2026?"

| | |
| --- | --- |
| before | `date computed from the due date` |
| after | `the period is counted from the expected date of delivery given on the certificate` |

### Why

**The element asked the answer layer to do the one thing this project forbids it to do.**

- A-01's **own `notes` cell** reads: *"Engine computes the date; RAG explains the rule only."*
- **CLAUDE.md rule 4**: *"THE LLM NEVER COMPUTES DATES. All timeline dates come from lib/timeline
  (pure TypeScript)."*
- `lib/timeline/mutterschutz.ts` already owns the computation — `PRE_BIRTH_DAYS = 42`.

So the element's wording contradicted its own row's note. The reply behaved correctly:

> *"The period is counted from the expected date of delivery shown on the certificate from a
> doctor, a midwife or an Entbindungspfleger ... The excerpts set the period in weeks. They do not
> give a rule for counting it to an exact calendar day, so the starting day is not stated here."*

The human audit marked the judge's `COVERED` call a false pass, and **on the element's literal
words that is right** — the reply explicitly declined to give the date. But the remedy is not to
make the model emit *"4 October 2026"*: that would be a rule-4 violation produced by the component
least able to be checked, and a date the engine already computes deterministically.

The judge was therefore **literally wrong and behaviourally right** — it credited the reply for
explaining the counting rule, which is exactly what the row's note says the RAG layer should do.
Correcting the element makes the literal reading and the behavioural one agree.

**What is kept.** The element is not a freebie. A reply that said only "six weeks before the birth"
still misses it: the anchor is the *expected date on the certificate*, which is what makes the rule
checkable and what the engine keys on.

### Third instance of one class, so the rule is settled

A-16 (ADR-056), R-06 (ADR-060) and now A-01: **a required element whose wording asks for more than
the system is permitted to do is a golden-set defect, and is corrected to its permitted half rather
than deleted.** The denominator holds in all three.

A-01 adds a wrinkle the first two did not have: the prohibition is a **project rule** (rule 4),
not a sourcing limit. An element can be unsourceable, and it can also be forbidden. Both are
specification defects; neither is a product defect.

---

## Not changed, and why

The audit also disagreed with **R-05**'s `invented_claim` flag. That is an **instrument** defect,
not a specification one — the judge was never sent `profile_bundesland` and read a correctly
Hessen-scoped sentence as an invention. Fixed in `judge.v6.md` and `scripts/eval/judge.ts`
(ADR-066). No golden row needed to change for it, and none did.
