# ADR-033 — the judge reads every retrieved chunk of a cited source, and 11 of 13 criticals were artefacts

Date: 2026-10-29 · Status: accepted

## Context

`scripts/eval/run.ts:507` built its citation→chunk index as
`new Map(hits.map(h => [normalizeUrl(h.source_url), h]))`. That is a reduction, not an index: where
a cited source is stored in several chunks, every chunk but the last was discarded silently.
`run.ts:552` then passed the survivor to the judge as the cited excerpt.

So the judge was asked whether a claim is supported by the cited source while holding one fragment
of it. Measured on 2026-10-29 with `scripts/eval/probe-judge-context.ts`:

| row | model was shown | judge was handed |
| --- | --- | --- |
| A-16 `SGB V §10` | Absätze 1–6 | **(5)(6)** |
| A-18 `SGB V §24i` | Absätze 1–5 | **(5)** |

A-18's critical read *"the only supplied §24i excerpt is subsection (5)"* — a true statement about
the judge's own input and a false statement about the product. **All 13 of iteration 1's criticals
cited at least one multi-chunk source**; on the guidance pages the judge held 1 of 82 `faq` chunks,
1 of 62 `mutterschutz`, 1 of 95 in the Kinder-RL PDF.

This had been live through every baseline and through the four-run noise floor.

## Decision

The judge receives **every retrieved chunk of the cited source, sorted by id** — document order
within a §, because ranked order is rrf order and gave A-16 its §10 as (3)(4) before (1)(2). The
separator is the one `generate.ts` uses, so the judge sees the material laid out as the model did.

The bound is *what the model was shown*, not the whole corpus page: grading against text the model
never received answers a different question than "is this claim supported by what it was given".

`byUrl` is left in place for citation validity, and section completion was gated **off** via
`retrieve({ complete: false })`, so this run moved one variable.

## Alternatives

- **Hand the judge the whole corpus page.** Rejected: 82 chunks of `faq` grades the reply against
  material the model never saw, and inflates judge tokens for a wrong question.
- **Fix `byUrl` for citation validity too.** Rejected *for this run* — a second instrument change
  in one measurement. Still open.
- **Treat the 13 criticals as real and keep iterating on the product.** This is what the project was
  doing, and it cost iteration 1 ($2.61) on a prompt that could not have worked.

## Consequence

Measured, `2026-10-28-iter1` → `2026-10-28-judgefix`, both 48/48 rows, completion off:

| measure | before | after | note |
| --- | --- | --- | --- |
| **criticals** | **13** | **2** | 11 were artefacts |
| retrieval hit | 24/30 | **24/30** | the control, unmoved — run is clean |
| citation validity | 36/38 | 37/39 | unchanged in substance |
| coverage | 54.7% | 56.8% | |
| ANSWER rows passing | 3/30 | 8/30 | |
| REFUSE rows passing | 2/8 | 1/8 | no noise floor exists for the repaired instrument; **not attributed** |

Of ADR-030's 17-row stable set, **only A-16 survives.** Cleared: A-02, A-03, A-05, A-07, A-08,
A-11, A-12, A-17, A-18, A-20, A-21, A-27. A-06 is new.

**This voids the noise floor, the 17-row baseline (ADR-030) and iteration 1's critical counts
(ADR-031).** ADR-031's *conclusion* stands on evidence read directly from the replies — the banned
hedge words survived and A-07 still contradicted its own excerpt — but its counts were measured
through a broken judge and must not be quoted as a baseline again.

Both survivors are the product obeying `answer.v2.md:175`, which tells it to *"say plainly that
only the responsible authority decides, and name that authority"* (CLAUDE.md rule 13).
`judge.v2.md:73-74` already exempts this — *"neither is naming an authority"* — but only for
refusals, so it never applies to an ANSWER row. That gap is the next instrument question, and it is
the same class as ADR-024 and ADR-025. A-06 is not purely a false positive: *"decided only by the
Elterngeldstelle"* omits the Finanzamt's role in determining taxable income.

With the phantom criticals gone, the real Phase 5 blockers are visible and are not measurement
problems: **REFUSE 1/8 against a bar of 7/8**, and **coverage 56.8% against 75%**.
