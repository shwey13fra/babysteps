# ADR-044: Four federal sources ingested for the class C elements

Date: 2026-11-03 · Status: accepted · Follows ADR-042 (Content-Signal) and ADR-013 (dated robots)

## Context
Nine class C required elements had no source in the corpus. Four gesetze-im-internet slugs carry
the provisions: `pstv`, `sgb_8`, `sgb_10`, `ao_1977` (`ao` and `ao_2017` 404).

## Decision
Ingest them, `fetch: auto`, with `only_sections` limited to the provisions named: PStV §33/§34,
SGB VIII §18/§58/§59, SGB X §64, AO §139a/§139b. Licence: all four are amtliche Werke under §5
UrhG. robots.txt re-read live today with the project User-Agent — 200, `Disallow:` empty, 0 rules
— and **no Content-Signal on this origin**, so under ADR-042 nothing is reserved. `fetch.ts`
confirmed independently: "No robots drift: every live verdict matched the manifest."

## Alternatives
Ingest each law whole — rejected, `only_sections` is what keeps SGB VIII and AO tractable.
Wait for the Hebammenhilfevertrag and do one ingestion — rejected, that source still needs its
own robots verdict and licence reading, and these four were already cleared.

## Consequence
+8 statute sections, +13 chunks, 770 → 783 rows; embedding cost $0.0001; Phase 2 gate PASS.
**0 rows dropped a chunk** (`probe-displacement`), and golden-drift and golden-verification are
byte-identical to their 2026-10-31 baselines. PStV §33 retrieves at rank 2 on A-13's own question,
§34 at rank 2 on A-27's. **§33 carries 4 of A-13's 6 elements, not the 5 previously recorded**:
`Meldebescheinigung` and `Übersetzung`/`Legalisation` occur 0 times in it. AO §139a/§139b are
reachable by a tax-ID query but **not** by A-30's own question, so they supply frame, not element.
Coverage effect is unmeasured until an eval run.
