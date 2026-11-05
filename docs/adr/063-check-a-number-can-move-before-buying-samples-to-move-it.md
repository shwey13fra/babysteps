# ADR-063 — check a number can move before buying samples to move it

Date: 2026-11-05 · Status: accepted · Human ruling, general principle · Extends ADR-048

## Context

Phase 5's gates are assessed on the **lower bound** across samples at one commit (ADR-048). On
2026-11-05 the plan was to spend $8.20 on two baselines to lift REFUSE from 6/8 to ≥7/8.

That spend could not have worked, and the reason is arithmetic, not luck. **A lower bound is a
minimum over samples, so each additional sample can only hold it or push it down.** Sampling
establishes a bound and characterises variance; it is never a lever on the bound's value. The
evidence was already on disk: five samples, raw REFUSE counts **7, 7, 8, 7, 6**, four distinct
failing rows, **no row twice at one commit**. Spending on samples would most likely have bought a
worse number and called it measurement.

## Decision

**Before buying samples to move a figure, state the mechanism by which that figure could move, and
check the figure is structurally capable of moving.** A gate is moved by removing the cause of its
failures; samples only reveal where it already sits. Where a gate's failures are non-reproducing,
diagnose the generating cause at $0 before spending.

## Applied to the other gates, as ruled

| gate | structurally movable? | by what |
| --- | --- | --- |
| **REFUSE** ≥7/8 | **pinned at the bar.** R-05 is a *deterministic* retrieval miss (`probe-element-reach`: the carrying chunk is not in its top-8), so the ceiling is 7/8 — the bar exactly, zero margin, met only if all seven others pass in every sample | retrieval work on R-05, never sampling |
| **Coverage** ≥75% | **yes, wide.** ~13 missing elements are shown-but-unused (prompt) and ~3 are retrieval; ~5 are structurally unreachable (0 chunks corpus-wide), which sets a hard ceiling near 94% on the scorable denominator | prompt + retrieval + ingestion |
| **Citation validity** ≥95% | **no — and it does not need to.** 100% on three consecutive samples (30/30, 24/24, 56/56). It can only fall. Sampling here buys risk, not margin | nothing; leave it |
| **Retrieval** ≥80% | **yes.** 5 row-level misses, each free to verify before any run | glossary/retrieval, verified by `probe-element-reach` + `probe-corpus-diff` |
| **Criticals** = 0 | **only by eliminating causes.** A zero bar on a stochastic measure is ADR-048's lottery: it is met by removing what generates the sentence, not by re-rolling | fix the generating cause (A-02 → ADR-058, A-30 → ADR-059) |

## Alternatives

Loosen the REFUSE bar — rejected, and deliberately not proposed in the session that would have
benefited: changing a gate while claiming to meet it is goalpost-moving. If it is unreachable, ship
the documented miss with its reasoning.

## Consequence

Three figures on this project were never movable by the spend proposed for them. The cheap question
— *what would have to change for this number to change?* — is now asked before the money, and it is
answerable at $0 from reports already on disk.
