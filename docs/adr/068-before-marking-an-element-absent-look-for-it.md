# ADR-068 — Before marking an element absent, look for it

Date: 2026-11-06 · Human ruling (judge audit, 5 of 6) · Code: `scripts/eval/literals.ts`,
`scripts/eval/verbatim-presence.ts`, `lib/prompts/judge.v7.md` · Golden: v1.13

Context: the audit overturned A-21 element 1. The judge marked it NOT COVERED because *"It never
names the HÄVS or states that Hessen has six such offices"*; the reply contains `the six Hessische
Ämter für Versorgung und Soziales` verbatim. Every negative example in the rubric until now was a
false positive — an invented critical. This one fails the other way and **suppresses coverage**,
on the one gate still missing.

Decision: three things, none of which cost a model call.

1. **A deterministic sweep** (`verbatim-presence.ts`) over every stored sample: for each element
   marked NOT COVERED, extract the distinctive literals from the element's own text and grep the
   stored reply. Run before the exit document, as a check of whether the instrument can *read*.
2. **judge.v7** gets the case as its first false-negative example, with the verbatim string, the
   false reason, and — deliberately — a *true* reason for the same verdict on another run, so the
   lesson lands on the `why` and not on the verdict.
3. **Golden v1.13** corrects A-21 element 3, whose `links its page` no reply can satisfy: a URL
   lives in the Citation contract (`schemas.ts:142`), not in prose, and citation validity already
   measures it.

Result, and the reason this ADR is short on alarm: **833 NOT COVERED verdicts across 34 samples
produced 8 strong flags, all on A-21, of which exactly 1 survives reading.** The other 7 state
truthfully that the reply names the authority and then identify the real gap. **NOT COVERED is
frequently right on an element whose words appear**, so a flag is a candidate for a human read,
never a correction — the script rescores nothing.

Alternative: rescore flagged elements automatically. Rejected — it would have silently credited 7
sound verdicts and moved a gate figure on a regex's opinion.

Consequence: **the coverage gate does not move.** The upheld flag is in `iter13`, not a valid
baseline; of the two valid baselines one was never flagged and the other's flag is dismissed. The
scorable lower bound stands at **72.9% (62/85)** against 75%, a miss by 2 elements. Two defects of
my own were caught by the sweep's own verification and are recorded in Past Mistakes: merging
matched literals across samples, which overstated the evidence; and reporting one sample's `why`
as the group's, which is how 7 sound verdicts briefly looked like defects.
