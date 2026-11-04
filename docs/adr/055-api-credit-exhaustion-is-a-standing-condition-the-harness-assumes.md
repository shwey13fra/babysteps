# ADR-055 — API-credit exhaustion is a standing condition, not an incident

Date: 2026-11-04 · Human ruling · Code: `scripts/preflight.ts`, `data/eval-budget.yaml`

Context: the Anthropic balance has run out mid-run three times in nine days — 2026-10-27, iter6 on
2026-11-03 (29 of 48 rows), iter9 on 2026-11-04 (9 of 48, $1.08 for no usable result). Each was
journalled as an incident. Three in nine days is an operating condition, and the harness should
assume it rather than discover it.

Decision: a preflight with **two** gates, run before the first paid call of an eval baseline, of
Phase 6's `/api/ask` VERIFY, and of any ingestion step that embeds.

1. **Liveness** — one `max_tokens: 1` call. Costs a fraction of a cent, and catches a dead key.
2. **Coverage** — the run's estimated cost against a declared remaining balance, times a headroom
   multiplier (1.5). **This is the gate that matters**: liveness would not have caught iter9, whose
   key was alive at row 1 and died at row 10.

The estimate is **derived, never hardcoded**: cost-per-row comes from the most recent *valid*
baseline that ran the **same answer prompt**, read from `meta.cost_usd` or, for reports written
before that field existed, from the committed markdown's own total line. The prompt version is
load-bearing — answer.v3 costs ~10% more per row than v2 ($4.07 against $3.62–3.67 for 48 rows) —
so a v2 mean would under-state every v3 run.

**There is no provider endpoint for a remaining balance.** Checked rather than assumed: the Admin
API returns spend-to-date (`GET /v1/organizations/cost_report`) and token usage, raw HTTP only,
under an Admin API key or an `org:admin` token this project does not hold; spend limits are an
early-access preview. So coverage runs against `data/eval-budget.yaml`, which the human sets on
top-up and the harness **decrements from measured cost** after every run — including a partial one,
because a partial run still spent what it spent.

That is a real limitation and it is stated in the file: the ledger tracks our figure, not
Anthropic's. A forgotten top-up makes the harness **over-cautious — refusing a run it could
afford — and never over-confident.** `--ignore-budget` overrides, and prints what it is overriding.

Alternative: liveness only. Rejected by the human — it solves the cheap half. Alternative: an
admin credential plus a Console spend limit. Rejected — it puts a new privileged key in the repo
for a preview feature.

Consequence: the partial-run machinery is **unchanged**. It worked: the guard failed closed, the
rows were marked not-measured rather than scored, and `eval_runs` refused to write a baseline.
This ADR adds a gate in front of it, nothing more. 18 tests cover the refusal arithmetic,
including a run the balance could *almost* cover — the margin is the point.
