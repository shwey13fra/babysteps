# ADR-011: Keep the jurisdiction filter despite no live state-scoped rule

Date: 2026-10-01 · Status: accepted

## Context
All twelve MVP rules are federal statute or Indian consular; none is Hessen-only or Berlin-only.
The engine filters by jurisdiction anyway, so the filter currently has no consumer in
`data/rules/` — and a "hessen vs berlin" test against those twelve would pass while asserting
nothing.

## Decision
Keep the filter and test it against `tests/fixtures/state-scoped.rule.yaml`, loaded only by the
test. Three reasons it earns its place: Phase 2 filters `match_chunks` by jurisdiction using the
same strings; `elterngeld_application` resolves to a different Elterngeldstelle and URL per state
once state pages are ingested; and adding a third Bundesland must not require an engine change
(PRD 2.2). Rule values match the `corpus_chunks` CHECK constraint in brief §3 — `hesse`, not
`hessen` — with `bundeslandToJurisdiction` mapping the intake vocabulary to it.

## Alternatives
Drop the filter until a state rule exists — rejected, Phase 2 needs it weeks later and the
retrofit touches every call site. Split `elterngeld_application` into state variants now —
rejected, it breaks the specified list of twelve ids.

## Consequence
A filter with no production consumer until Phase 2, justified here so a later reader does not
delete it as dead code. The fixture must be kept in step with the rule schema; a schema change
that forgets it shows up as a failing test, which is the intended alarm.
