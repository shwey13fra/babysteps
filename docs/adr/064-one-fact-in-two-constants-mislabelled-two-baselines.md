# ADR-064 — one fact in two constants mislabelled two baselines

Date: 2026-11-05 · Status: accepted · Code: `scripts/eval/run.ts`

## Context

`run.ts` held the golden set in two constants:

```ts
const CSV = "data/golden/golden_set_v1.11.csv";
const GOLDEN_VERSION = "v1.10";
```

Bumping the golden set to v1.11 updated the path and left the version string. Both `iter12`
baselines — the two samples bought for Phase 5's exit assessment — therefore report **golden v1.10**
in the report header, the JSON `meta`, and the `eval_runs` note, while having loaded **v1.11**.

Proved from the artefacts rather than argued: R-06's `requirements` in both sidecars read *"names
where to ask about their own case"*, which is v1.11's corrected wording and appears in no earlier
version. So the measurement is sound and n=2 holds; only the label is wrong.

**That is the harder defect to catch, because every figure reconciles.** A wrong number is
contradicted by its neighbours. A wrong label is consistent with everything, and it travels: the
`eval_runs` table is append-only, so two rows there now attribute these results to the wrong ground
truth, permanently.

Found while checking the two runs were the same configuration — which is the check ADR-048 requires
and the only reason this surfaced at all.

## Decision

`GOLDEN_VERSION` is **derived** from `CSV` by pattern, and **throws** if the filename does not carry
a version. A version string that silently degrades to a default is the same defect one step quieter.
The two committed reports are **not** hand-edited: they are measurement artefacts, and this session
has already demonstrated what hand-writing a figure into an audit trail costs. The correction is
recorded here, in `variance-band-v5.yaml` and in the combined report.

## Alternatives

Edit the two reports' `golden_version` field — rejected; see above. Assert the pair match in a test
— weaker than removing the pair.

## Consequence

Third instance this session of one fact held in two places: the golden CSV path across ten scripts
(fixed by `readCsv`'s shared module earlier), `valid_baseline` meaning two different things
(ADR-061), and now this. **Grep for the fact, not the constant, when bumping a version.** The
`eval_runs` rows stand uncorrected and are noted here as the known discrepancy.
