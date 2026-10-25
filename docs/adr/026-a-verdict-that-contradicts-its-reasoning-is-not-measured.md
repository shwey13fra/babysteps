# ADR-026: A judge verdict that contradicts its own reasoning is not measured

Date: 2026-10-25 · Status: **accepted**

## Context
Run #2's A-30 critical carried this reasoning, in full, under a boolean set to **true**:

> … The claim that the family court decides on application is supported by BKGG §3(2).
> Re-checking all statements: all legal claims trace to excerpts, so this should be false.
> **Setting to false.**

The flag never followed the argument. The judge had used `_why` as a scratchpad, reasoned its way
to the opposite verdict, and left the boolean where it started — so a run reported 15 criticals
when one of them refuted itself in writing. It was visible only because reasons are now persisted;
in Run #1, with no `_why` at all, the same verdict was indistinguishable from a real finding.

## Decision
`judge.ts` scans the five critical-raising `_why` fields for explicit self-reversal and, on a
match, returns no verdict: the row becomes **not measured**, exactly as a wrong array arity
already does. We cannot tell which half the judge meant, and a run containing any not-measured row
is already declared an invalid baseline. `judge.v1.md` additionally states that `_why` is the final
justification rather than a scratchpad, and that a changed mind must change the flag.

## Alternatives
Trust the boolean and ignore the prose — rejected, it is the prose that a human audits, and the
gate's spot-audit is the only thing standing between a judge's opinion and a number we act on.
Trust the prose and flip the boolean — rejected, it makes the harness guess at intent and would
silently erase real findings. Match a wider set of hedging phrases — rejected, "partly supported"
and "however" are legitimate reasoning for a true flag, and a loose pattern would discard genuine
criticals. The patterns are deliberately narrow: `should be false`, `setting to false` and three
near variants.

## Consequence
The guard is string matching against a model's prose, so it will miss a self-reversal phrased
differently; it is a floor, not a solution. A judge model that narrates its deliberation will now
cost rows rather than corrupt numbers, which is the right direction for the trade but means the
not-measured count becomes partly a property of the judge's writing style. If that count rises,
the fix is a separate deliberation field, not a wider regex.
