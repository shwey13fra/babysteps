# ADR-040: Section completion stays on — it buys production parity, not coverage

Date: 2026-11-02 · Status: **accepted** · Measures ADR-032 for the first time

## Context
`scripts/eval/run.ts` held `COMPLETE_SECTIONS = false` from the judge-context repair through
judgefix, iter3 and iter4, while production has always run completion on (`retrieve.ts` defaults
`complete` true; `app/api/ask/route.ts` passes no options). Three baselines therefore measured a
pipeline no user meets, and ADR-032 never appeared in a measured figure.

## Decision
Completion stays **on** in the eval, permanently. The eval measures the product's path.

## Alternatives
- Keep it off for continuity with iter3/iter4 — rejected: comparability to a pipeline we do not
  ship is worth less than knowing what we ship.
- Flip it together with the `source_url` extension — rejected: two variables, unattributable.

## Consequence
Measured in `eval/reports/2026-11-02-iter5-completion-on.md`, 48/48, $3.67:

- **Not a coverage lever.** Required elements 60.0% → **57.9%** (+3 gained, −5 lost), inside the
  noise this run also measured. 100 chunks reached the model across 38 retrieving rows.
- **Citation validity 93.6% → 95.6%** and **REFUSE 6/8 → 7/8**: two gates newly pass. Retrieval
  hit held at 80.0% and DEFLECT at 10/10, both as predicted from code structure — the guard
  short-circuits before retrieval (`run.ts:264`), so DEFLECT cannot move, and siblings carry
  `cosine: 0`, so the refusal floor cannot move.
- **Criticals 3 → 4, and the class changed.** A-16 and A-18 received the Absätze whose absence they
  used to complain about; holding the whole §, the model instead named *who decides*, which the
  whole § still does not contain. Completion converts an incompleteness critical into an
  uncited-authority one. All four criticals (A-06, A-16, A-18, A-29) are now a single conflict:
  CLAUDE.md rule 13 requires naming the deciding authority, `judge.v2.md` scores an unexcerpted
  authority as an uncited legal claim, and the corpus carries no authority mapping.
- **The budget has never bound.** 0 of 48 rows reached `EXCERPT_TOKEN_BUDGET`; `budgetSkipped` is
  empty everywhere. The largest row a model sees is 73% of budget.
- **Chunk order is load-bearing.** On 13 of 100 completions the sibling was already ranked, so
  completion only regrouped existing text into § order — and A-07 lost an element on exactly that,
  with no new content.
