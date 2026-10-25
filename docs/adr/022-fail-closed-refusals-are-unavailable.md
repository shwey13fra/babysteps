# ADR-022: A fail-closed refusal says `unavailable`, and only our own code can say it

Date: 2026-10-25 · Status: **accepted**

## Context
Three code paths returned `refused/low_confidence` and only one of them was a judgement about
the question: `app/api/ask/route.ts` when `retrieve()` threw, `lib/rag/generate.ts` when both
generation attempts failed the contract, and the genuine sub-threshold check at ADR-009's 0.43.
The first two are outages. All three produced byte-identical responses, which cost debugging
time on 2026-10-24 — a stale-glossary retrieval bug presented as a generation fault. Phase 4
runs 48 rows against two live APIs and then stops without fixing anything, so a single transient
failure would be scored as a correct refusal on an R row and a miss on an A row, with nothing in
the report able to tell the difference.

## Decision
A fourth reason, `unavailable`, on the `refused` member of the Answer contract, set by the two
fail-closed paths only. It carries its own copy (`REFUSAL_UNAVAILABLE`) which does **not** claim
the official sources were searched and does **not** name an authority — the previous wording sent
users to the Elterngeldstelle for questions we never processed. `Generated` in `lib/rag/generate.ts`
deliberately omits the reason, so the model cannot describe itself as an outage; a test asserts
that rejection with a `low_confidence` control beside it.

## Alternatives
Keep one reason and infer outages from logs — rejected, the eval reads responses, not logs, and
the report is the artefact. A separate `kind: "unavailable"` — rejected, every consumer switches
on `kind` and a fourth arm is a UI change for an internal distinction. HTTP 503 instead of 200
with a refusal body — defensible and probably right, but it changes the response contract the UI
depends on; deferred to Phase 6 rather than smuggled into a pre-flight.

## Consequence
Phase 4's harness must treat `unavailable` as "not measured" rather than as a refusal, and a run
containing any `unavailable` row is not a valid baseline. `Answer` now accepts a reason the model
cannot produce, so `toAnswer` no longer re-narrows what it passes through — the gate is
`zodOutputFormat(Generated)` alone. If that gate is ever bypassed, `unavailable` silently becomes
a model opinion and the outage count stops meaning anything.
