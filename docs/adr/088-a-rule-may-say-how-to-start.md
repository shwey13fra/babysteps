# ADR-088 — A rule may say how to start, not only when it is due

**Date:** 2026-11-18 · **Status:** accepted · **Phase 7**

## Context

The human asked `/ask` how to find a midwife. The answer was slow and thin: no links, no way to
search, and no mention of the route most parents actually use — asking a `Frauenarzt` for a
referral.

**It was not a bad answer. There was nowhere for a good one to come from.**

A rule carried `title_en`, `anchor`, `window_open`, `deadline`, `authority_en`, `consequence_en`,
`documents`, `source_ref` and `source_url` — *when*, *who* and *what to bring*, and nothing about
*how to start*. `hebamme_search_start` read **"You find the midwife yourself; your Krankenkasse
covers the care"**: true, correctly sourced to SGB V §24d, and useless to someone who does not know
where to look.

`/ask` could not cover for it. The corpus is statute text from gesetze-im-internet, so it will
never contain a directory or a referral route, and rule 8 forbids rendering an answer without a
citation. The single most useful sentence in the product had no home in the data model.

## Decision

Rules gain an optional, ordered **`how_to`**: steps, each of which may carry a `url` and the
`checked_on` date for that url. Rendered on the item page under "How to start"; deterministic, no
model call, and therefore no part of the `/ask` latency problem.

**A step is a route, never a prediction.** "Search this directory by postcode" and "ask your
Frauenarzt to refer you" are navigation. "You will get a midwife" is the outcome rule 13 forbids us
to state, and `tests/timeline/how-to.test.ts` fails on the vocabulary of entitlement.

**A link cannot exist without its date.** The zod refinement rejects a `url` with no `checked_on`
and a `checked_on` with no `url`. A third-party directory rots faster than a statute, so it needs
the date more than `source_url` does.

**German comes from the glossary.** `Frauenarzt` is the glossary's gloss-only entry; `Gynäkologe`
and `Frauenärztin` are not in it, so they would be fabrications however natural they read (rule 14).
A test rejects them.

## Alternatives

**Put the practical steps in the corpus and let `/ask` retrieve them.** Rejected: it makes a
deterministic, checkable fact into a generated sentence, and it would mean ingesting non-statutory
pages into a corpus whose whole claim is that it is official sources.

**Widen `authority_en`.** Rejected: that field answers "who decides", and overloading it with "how
to begin" would have put an unverifiable sentence next to a verifiable one with no way to tell them
apart — no per-link date, and nothing to test.

## What is NOT claimed

**That `hebammensuche.de` has capacity near any given reader.** The step says how to look. Whether
anyone is found is exactly the outcome we do not predict.

The URL was verified on 2026-11-18 by fetching it, not by assuming a 200 meant the right page: it
titles itself Hebammensuche.de, asks "Ich suche eine Hebamme", requires a Postleitzahl, and filters
for Hausbesuche and free capacity.

## Consequence

`/ask`'s latency is untouched and still unmeasured — this removes the question from the model's
path rather than making the model faster. The three sequential round-trips in `app/api/ask/route.ts`
remain the next thing to measure.

Only `hebamme_search_start` has steps so far. Every other rule renders exactly as before, because
the field is optional.
