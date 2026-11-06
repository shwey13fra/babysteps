# ADR-067 — A swallowed error on a safety path is an instrument defect

Date: 2026-11-06 · Human ruling · Code: `lib/rag/guards.ts`, `scripts/eval/run.ts`

Context: in `2026-11-06-iter13-judge-v6-1`, R-01/R-02/R-03 were unmeasured on `fail_closed` while
M-10 was unmeasured on a judge `Connection error.` All four were one transport window on
`claude-haiku-5-5` — the run is serial (`run.ts:1563`) and the usage ledger closes exactly on four
unrecorded haiku calls (89 recorded = 45 guard + 44 judge; 35 opus = 35 non-deflected rows). But
`classifyMedical`'s `catch {}` discarded the cause, so a transport blip, a 400, an auth failure and
an exhausted balance (ADR-055) all printed one identical line. The window was diagnosable only by
that arithmetic plus an adjacent judge call that happened to record its own error.

Decision: `GuardDecision` carries an optional `error`, set on all four fail-closed paths and absent
otherwise; the harness appends it to `notMeasured`. Mirrors `judge.ts`, which always did this.
Behaviour is unchanged — the deflection, the urgency and the not-measured marking all stand, and
the asymmetric-harm argument for failing closed is untouched.

Alternatives: log and move on — rejected, the report is the artifact, not the console. A typed
error chain per `shared/error-codes.md` — deferred, it decides retry policy too (below).

Consequence: four causes are now distinguishable in a report. **Open item, Phase 7 hardening:**
whether to add a fourth attempt with backoff. The SDK already makes three (`maxRetries: 2` default,
connection errors retried), so this is not whether to retry but whether to retry *more* — and it
lands in the product path at `route.ts:151`, so it is a user-latency decision to be taken with rate
limits and the `ASK_DISABLED` kill switch, not here. No re-run was bought: the REFUSE gate was
already documented as missed and four rows cannot change the ruling.
