# ADR-054 — The excerpts bound the answer in both directions

Date: 2026-11-04 · Prompt: `answer.v3.md` · Instrument: `scripts/eval/probe-element-reach.ts`

Context: v2 closed the criticals — 0 adjudicated across three samples — and did not move coverage,
which sat at 60 of 87 against a gate of 66. ADR-045 attributed 13 missing elements to prompting,
but the 2026-10-31 classification had already split them three ways (4 prompt, 2 spec, 7
retrieval), and the retrieval share looked like the larger pool.

**That attribution was wrong, and the new instrument is why.** `probe-element-reach` asks, per
uncovered element, whether the chunk **carrying** it was in the ranked top-8 and shown to the
model. Of 8 probed, **5 were already in front of it**: A-13 residence registration at rank 1,
A-21's HÄVS and Fachaufsicht at rank 5, A-23's ten-state list at rank 2, A-30's tax ID at rank 2.
Row-level `retrievalHit` is keyed on the row's primary ground-truth §, so a row can miss that §
and still be shown the text for every element it failed — the two measures had been read as one.
The judge had said it in words all along: *"the reply says the Frankfurt office is among 'the six
Hessian state offices' but never names them as Ämter für Versorgung und Soziales."*

So the defect is neither invention nor retrieval. It is **under-use of text the model was given**,
and it has a cause: every rule in v2 pushes one way — omit the unsupported, prefer the shorter
answer — and **v2 contains no converse.** Nothing obliges the model to report a fact that is
present, on topic, and peripheral. Caution then drops it.

Decision: v3 adds one section, `Completeness inside the excerpts`. The excerpts bound the answer
in both directions — omission governs what they do not contain, completeness governs what they do.
Five duties, each a measured failure shape: reproduce a statutory enumeration in full; name the
provision or authority the excerpt names; carry a figure's as-of date; list the members of a set
you invoke; state a qualifier rather than leaving it to layout. The diff against v2 is a **single
insertion** — one variable.

Alternative: relax the omission rules so the model is less cautious generally. Rejected — those
rules are what took criticals to zero, and loosening them trades the gate that passes for the one
that does not.

Consequence: the completeness duties could, in principle, pull the model toward asserting more
than an excerpt supports, which is the criticals failure mode. The section therefore closes by
restating that it licenses no step, figure or gloss the excerpts lack. **Criticals are the measure
to watch on the next run, not just coverage** — if they move off 0, this is the change that did it.
