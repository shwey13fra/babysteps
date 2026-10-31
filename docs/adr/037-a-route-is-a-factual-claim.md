# ADR-037: A route is a factual claim and obeys the citing rules

Date: 2026-10-31 · Status: **accepted** · Supersedes the plain revert proposed on 2026-10-29

## Context
ADR-035's §3 added "name the **route**" to the `individual_case` bullet. It bought REFUSE rows
R-05, R-06 and R-07, and plausibly cost a critical: A-08's critical quotes *"That is also where
the application is submitted"*, asserted with no excerpt support. A-06 is the same class and
predates the change, so the defect is not the route instruction itself — it is that a route was
treated as a helpful addition rather than as a claim needing a source.

The previous session's queue proposed reverting the four added lines and re-measuring for ~$0.28.
That would trade two REFUSE rows back for one critical.

## Decision
Keep the route instruction and bind it to the excerpts. A route is a factual claim: state that a
named body is where the application is submitted **only** if an excerpt says so; otherwise name
the *kind* of office ("the Elterngeldstelle for your district") and say it can give binding
information. Never upgrade "this authority decides" into "this is where you apply".

## Alternatives
Revert §3 — recovers the critical, loses the REFUSE rows, and leaves A-06 (which predates §3)
unexplained. Rejected: the two gates were being traded against each other for no reason.

## Consequence
Targets A-08 and A-06 together without giving back R-05/R-06/R-07. Unmeasured until the
row-targeted run; no claim is made here that it worked.
