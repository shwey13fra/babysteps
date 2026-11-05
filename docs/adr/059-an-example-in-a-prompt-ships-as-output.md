# ADR-059 — an example in a prompt ships as output

Date: 2026-11-05 · Status: accepted · Amends ADR-057

## Context

ADR-057 added a routing/competence distinction to `answer.v4`: saying *where to go* is required,
saying *what you will get there* needs an excerpt. The rule is sound. Its **illustration** was not —
*"the Elterngeldstelle for your district is where you get a binding answer on your own case."*
"Binding" characterises the answer, so the example violated the rule it was written to teach.

iter11 raised it as an uncited legal claim on A-30, where BKGG §13 says only that the Familienkasse
*decides* on the claim. Grepping the replies found the sentence on **20 of 48 rows**, recited almost
verbatim. The judge happened to raise it once, so this was a latent critical across half the output,
not a single-row defect — strictly worse than a reproducible one, because any run can surface it
anywhere.

The word came from R-06's required element (*"where to get binding information"*), imported into the
prompt as exemplary phrasing. Same mechanism as the 2026-11-04 `Familienversicherung` gloss: a
specification's wording travelled into a different file and was emitted as the product's own claim.

## Decision

`answer.v5` removes the word from the rule and its example, forbids characterising the answer
(*binding, final, official, guaranteed, authoritative*), and instructs that these patterns be adapted
in the row's own words rather than recited. **An example in a prompt is a draft of the product's
voice and must be as defensible as a rule.** Duties come from specifications; wording comes from the
excerpts.

## Alternatives

Make "binding" conditional on excerpt support per row — rejected: it asks the model to judge support
for a word it need not use. Leave it and exclude A-30 — rejected: the sentence is on 20 rows.

## Consequence

Not yet measured; no valid v4/v5 baseline exists. A prompt diff must now be grepped for in the
**replies**, not only reasoned about: an instruction's blast radius is a measurable quantity.
