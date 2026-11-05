# ADR-058 — a German term from an excerpt may be used, but not defined

Date: 2026-11-05 · Status: accepted · Human ruling on the class, 2026-11-05

## Context

Four measured instances in three days of one defect class: **a true, materially useful fact with no
source in the corpus.** A-16 (Familienversicherung is free — SGB V §3/§223 not ingested), A-20 (the
Sorgeerklärung is free — SGB X §64 is "nach diesem Gesetzbuch"), A-25 (India bars dual citizenship
— 0 chunks), and iter10's critical on A-02: *"Lebensmonate are counted starting from the date of
birth, not calendar months"* — `Lebensmonat beginnt` returns **0 chunks**.

Each had been ruled on as a row. Asked to rule on the class once, the human ruled: **confirmed
critical; the prompt holds the line.** An unsourced assertion is a defect however true it is,
because it borrows the credibility the cited sentences earned.

The mechanism was not a repetition problem. `expand.ts` matches `en_triggers` against the
**question**, so `glossary` only ever carries question-detected terms; A-02's question supplied
`Elterngeld` alone. The model lifted `Lebensmonate` from the German excerpt — a case `answer.v3`
covered nowhere, having one rule for glossary terms and none for the others.

## Decision

`answer.v4` adds that a German term taken from an excerpt may be used and may be reported *exactly
as an excerpt states it, cited* — but its definition, counting rule, start point or computation may
not be supplied. If the definition is needed and absent, say so and name the authority.

## Alternatives

Add `Lebensmonat` to the glossary — rejected twice over: a question-keyed trigger would not have
fired on A-02 at all, and a gloss carrying "counted from the date of birth" would assert a rule,
which the 2026-11-04 Familienversicherung ruling forbids. A fourth restatement of "answer only from
the excerpts" — rejected: `answer.v3`'s own header records that saying it a third time was not a
hypothesis.

## Consequence

A-02 passed with 0 criticals on the 9-row check — one sample, not yet a claim. Retrieval is
untouched, so the one gate identical across all five samples stays untouched.
