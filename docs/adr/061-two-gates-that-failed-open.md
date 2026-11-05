# ADR-061 — two gates that failed open

Date: 2026-11-05 · Status: accepted · Human ruling: fix both before buying baselines
Code: `scripts/preflight.ts`, `scripts/eval/csv.ts`, `data/golden/golden_set_v1.11.csv`

## Context

Both were found by reading output, not by a failure. Neither had ever produced a wrong number that
anyone noticed, which is the point: a gate that fails open is worse than no gate, because it is
trusted.

**1. The budget gate went dark whenever the configuration changed.** `assertBudget(null, …)` printed
`coverage NOT checked` and **returned**. A new answer prompt has no prior baseline *by definition*,
so the first run on every new prompt version started unprotected — and credit exhaustion has killed
three runs in nine days (2026-10-27, iter6, iter9). The line scrolls past looking like a check that
ran.

It then priced iter11 from `2026-11-05-partial.json`: 9 rows, $0.12/row against a true $0.0955. That
file passed the `valid_baseline` filter because `valid_baseline` is written as
`notMeasured.length === 0` — it means "every row this run **attempted** was measured", not "this was
a full baseline". `preflight.ts`'s own comment claimed partials were excluded. They were not.

**2. The golden loader repaired ground truth silently.** `readCsv` mapped `[h, r[i] ?? ""]`, so a
long row lost its tail and a short row's missing cells became `""`. `A-24` and `A-26` carried an
**unquoted** `notes` cell containing a comma, parsed as 12 fields against an 11-field header, and had
their notes truncated in every script that read the set — in **golden v1.1 through v1.10**. `notes`
is never scored, which is the only reason eleven versions cost nothing. One column to the left it
would have been a wrong figure in a published report, undetectable afterwards.

## Decision

`assertBudget` **refuses** an unpriceable run, naming the declared balance and the three deliberate
ways forward; `--ignore-budget` still overrides, loudly. `meanCostPerRow`/`estimateRun` take
`fullSetRows` and accept a baseline only when `rows_total === fullSetRows && rows_measured ===
rows_total`, so neither a subset nor a run that lost rows mid-flight can price anything. `readCsv`
**throws** on any field-count mismatch, naming the row's id. `golden_set_v1.11.csv` quotes the two
cells; the historical files are **not** repaired, because they are the committed record of what each
past run measured.

## Alternatives

Default `fullSetRows` to the run's own row count — rejected, it re-opens the hole from the other
side. Pad/truncate with a warning — rejected: a warning in a 48-row run is a line nobody reads.

## Consequence

320 tests pass, 10 new. One existing test asserted the budget hole — *"does not block when no
comparable baseline exists"* — and had to be reversed: **the defect was tested in, which is why it
survived.** Worth looking for elsewhere. `answer.v4` is now unpriceable on purpose (its only runs
were a partial and a 47/48), so the next baseline must be priced by hand and started with
`--ignore-budget`, deliberately.
