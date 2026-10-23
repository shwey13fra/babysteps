# golden_set v1 → v1.1 — change log

Date: 2026-10-22 · corpus_version `2026-10` · 675 chunks · verified by
`scripts/eval/golden-drift.ts` against `data/cache/parsed.json`

Scope: the 34 `verify_priority: high` rows. The 14 DEFLECT/REFUSE rows among them carry no
`ground_truth_source` — they assert behaviour, not a citation, so there is nothing to check
against the corpus. That leaves **20 ANSWER rows**.

Method: every number asserted in `required_answer_elements` was looked for in the **ingested
text of the § the row cites**, not in retrieval. German statutes spell small numbers out
("sieben Wochen"), so word forms count as present — without that, A-03 and A-15 both looked
like drift and were not.

`question` text is unchanged in every row, so v1.1 stays comparable with v1.

## Summary

| outcome | n | rows |
| --- | --- | --- |
| verified | 13 | A-02, A-03, A-08, A-09, A-10, A-13, A-15, A-18, A-19, A-25, A-27, A-28, A-29 |
| corrected, still `high` | 1 | A-06 |
| non-statute, needs a human | 4 | A-17, A-21, A-22, A-23 |
| not ingestable | 2 | A-24, A-26 |

## A-06 — the one substantive correction

*"Is there an income limit above which we get no Elterngeld?"* — cited BEEG §1(8).

**Removed: "150000 EUR for single parents".** The string `150 000` appears **nowhere in BEEG**
as ingested. BEEG §1(8) states 175 000 € twice: Satz 1 for a single claimant, Satz 2 for the
combined income of two claimants. The same figure governs both, so the annotation's distinction
between a joint and a single-parent threshold does not exist in the statute.

What BEEG does contain: `175 000` in §1, `200 000` in §28. Neither `150 000` nor `300 000`
appears anywhere.

**`ground_truth_source` extended to `BEEG §1(8) + BEEG §28`.** The cohort rules live in §28, not
§1(8), so the original citation could not support the date the annotation asserts.

**Left open, deliberately.** §28 contains *both* "ab dem 1. April 2024 und vor dem 1. April 2025"
(the 200 000 Maßgabe) *and* §28(1b) "nach dem 31. März 2024 und vor dem 1. Mai 2025". Which
governs the commencement of the 175 000 figure is a legal question. This pass does not settle it
and `verify_priority` stays `high` until a human does (CLAUDE.md rule 13).

## Corpus gaps this pass found and closed

- **EStG §66(1)** (the Kindergeld amount, cited by A-10) was not ingested — the manifest had
  `only_sections: ["70"]`. Added; A-10 now verifies.
- **ElterngeldDigital** (cited by A-23) had been excluded from the familienportal URL list as a
  "calculator". It is the online-application route the row asks about. Added.

## Gaps this pass found and could NOT close

- **A-24, A-26 (consular).** `cgifrankfurt.gov.in` serves `Disallow: /` and
  `indianembassyberlin.gov.in` returns 404 (ADR-014/016). Both rows are unanswerable until the
  consular text is hand-curated. This is the dual-track gap: the consular half of the product
  has zero corpus.
- **A-17, A-21, A-22, A-23.** Non-statute sources. Their domains are ingested (g-ba.de,
  rp-giessen.hessen.de, service.berlin.de, familienportal), so the claims can be checked against
  the pages — but by a human reading them, not by matching a § reference.

## Separately: retrieval misses, NOT annotation drift

`scripts/eval/verify-golden.ts` also measured whether each row's question retrieves its source.
Five do not: A-06, A-17, A-21, A-23, A-27. The sources are present in the corpus; the queries do
not surface them in top-8. That is a retrieval-quality finding for the Phase 4 baseline and the
Session 5 tuning loop, not a reason to change an annotation. Recorded here so it is not
rediscovered as drift later.

---

# Second pass — 2026-10-23

## A-17 — now verified (Kinder-Richtlinie PDF ingested)

The landing page carried no timings, so the Richtlinie PDF was added to the manifest
(`g-ba.de/downloads/62-492-3998/Kinder-RL_2025-05-15_iK-2026-01-01.pdf`, robots-permitted).
It is §-structured authoritative text, so its chunks carry refs (`Kinder-RL §4` is U2) and
rank in the statute pool. §2 holds the table, extracted intact:

```
U1  Unmittelbar nach der Geburt
U2  3.-10. Lebenstag     Toleranz 3.-14. Lebenstag
U3  4.-5. Lebenswoche    Toleranz 3.-8. Lebenswoche
```

Matches the annotation exactly. `ground_truth_source` narrowed to `§2`.

`§69 Dokumentation` is excluded from ingestion — blank examination-booklet forms, 138,795 of
the Richtlinie's 260,811 characters, which swamped retrieval because they repeat every
U-number. Underscore density separates form from prose cleanly (§69 4.1%, all others 0.0%).

## A-21 — verified, authority named

Was "the Elterngeldstelle". The ingested rp-giessen page names it: *"welches der sechs
hessischen Ämter für Versorgung und Soziales (HÄVS) in Hessen für Sie zuständig ist"*, with
the Fachaufsicht for Elterngeld at the Regierungspräsidium Gießen. Annotation now checks for
what the source actually says.

## A-22 — corrected, Jugendamt removed

Was "the Elterngeldstelle of the district **Jugendamt**". Neither `Jugendamt` nor `Bezirksamt`
appears in **any** ingested Berlin page. service.berlin.de says *"Ihrer Elterngeldstelle im
Bezirk"*. The Jugendamt attribution may well be right in practice, but it is not sourced, so
it is removed rather than cited.

Noted but deliberately **not** written into the annotation: the page currently says the digital
portal is being rebuilt and new applications must go by post. That is an operational state that
will change, and a golden annotation should not encode it.

## A-23 — verified, and sharper than before

The ElterngeldDigital page names the ten Länder it covers — Berlin, Brandenburg, Bremen,
Hamburg, Mecklenburg-Vorpommern, Niedersachsen, Rheinland-Pfalz, Sachsen-Anhalt,
Schleswig-Holstein, Thüringen — and **Hessen is not among them**. It then states:
*"Unabhängig vom Angebot ElterngeldDigital können Sie in Baden-Württemberg, Bayern, Hessen,
Nordrhein-Westfalen, Saarland und Sachsen Elterngeld online beantragen."* The Hessen page
carries its own "Onlineantrag Elterngeld" portal.

This row's jurisdiction is `hesse`, so it is precisely the trap the annotation describes. Both
halves of a correct answer are now in the corpus.

## Tooling defect found in this pass

The drift checker was passing rows **vacuously**. Its number extractor required a word boundary
after the digit, so `U1`, `3rd` and `10th` matched nothing — A-17 first "confirmed" with zero
numbers actually checked. Fixed; it now extracts 1, 2, 3, 10, 4, 5 and confirms them against §2.
Every row was re-run after the fix.

## State

| verify_priority | n |
| --- | --- |
| verified | 17 |
| high | 17 (14 DEFLECT/REFUSE with no ground_truth_source + A-06, A-24, A-26) |
| medium | 14 |

**ANSWER rows still open: A-06, A-24, A-26.** A-06 needs a legal call on the commencement date;
A-24 and A-26 need consular text that ADR-014/016 make unfetchable.
