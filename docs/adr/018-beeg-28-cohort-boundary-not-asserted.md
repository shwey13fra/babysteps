# ADR-018: The BEEG §28 cohort boundary is asserted by neither the golden set nor an answer

Date: 2026-10-23 · Status: **accepted**

## Context
A-06 asks whether an income ceiling exists for Elterngeld. §1(8) is unambiguous and verbatim in
the ingested statute: 175 000 € zu versteuerndes Einkommen, Satz 1 for a single claimant and
Satz 2 for two claimants combined — the same figure for both. Which *birth cohort* the figure
applies to is not. §28 carries two windows in different sub-provisions:

| provision | window |
| --- | --- |
| §28 (the 200 000 € Maßgabe) | `ab dem 1. April 2024 und vor dem 1. April 2025` |
| §28(1b) | `nach dem 31. März 2024 und vor dem 1. Mai 2025` |

Reconciling them is statutory interpretation. CLAUDE.md rule 13 forbids this project from
asserting an individual's entitlement, and picking the governing commencement date is exactly
that in general form — it decides which ceiling a given family falls under.

## Decision
Ground truth asserts the §1(8) figure and names §28 as the provision governing earlier cohorts,
**without fixing its boundary**. A-06 moves to `verify_priority: verified` on that basis. The
Phase 3 answer prompt must behave the same way: state the figure, name §28 as the cohort rule,
and name the Elterngeldstelle as the authority that decides the individual case.

## Alternatives
Assert 1 April 2025 — rejected, an unsourced reading of a conflict the statute does not resolve
on its face. Assert 1 May 2025 — same. Park A-06 as unverified pending legal advice — rejected,
it makes a correctly-cited answer look like a gap; the uncertainty is in the statute, not in us.

## Consequence
A-06 can never be graded on a cohort date, and an answer that names one fails `must_not_contain`
in spirit even though the string is not listed. If a court or the BMFSFJ settles the conflict,
this ADR is superseded, not edited. Related: the figure is safe to cite; the boundary is not,
and that asymmetry is the reusable shape — cite what the source states, name the authority for
what it leaves open.
