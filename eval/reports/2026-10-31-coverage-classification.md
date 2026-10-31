# Coverage classification — all 38 missing required elements, by cause

Run 2026-10-31 against `eval/reports/2026-10-29-iter3.json` (iteration 3, 48/48 rows).
Method: direct `ILIKE` over `corpus_chunks` for a discriminating German token per element — no
embedding call, no ranking — so a miss is attributable to the corpus rather than guessed at.
Retrieval reachability tested separately with each row's own question via `scripts/ingest/query.ts`.
Cost: $0 of model calls, a few cents of embeddings.

**Corpus shape, measured:** 770 chunks — `federal` 741, `berlin` 21, `hesse` 8,
**`consular-india` 0**.

---

## Summary

ANSWER-row coverage is 54/95. The gate is ≥75% = **72/95**, so **+18** is needed.

| class | cause | elements | addressable how |
| --- | --- | --- | --- |
| **A** | consular text unreachable, already known (ADR-019) | **8** | hand transcription, `docs/consular-curation-worklist.md` |
| **B** | fact exists but `berlin`-only, row is `hessen` | **5** | ingestion + a human ruling (ADR-011) |
| **C** | genuine corpus gap, source fetchable | **9** | ingestion |
| **D** | golden defect — element unsatisfiable or contradicted by statute | **3** | spec change, human only |
| **E** | fact retrieved but under-used | **4** | prompt |
| **F** | element is advice or inference, not a corpus fact | **2** | prompt, or golden |
| **G** | fact in corpus and in jurisdiction, **not retrieved** | **7** | retrieval |
| | | **38** | |

**The decisive arithmetic.** Everything reachable this session is E + F + G = **13**, taking
coverage to 67/95 = **70.5%**. Adding the best case from the three over-refusing rows gives
~68–69/95 ≈ **72%**. **The coverage gate cannot be closed by prompt and retrieval work alone.**
It needs either the three golden corrections in class D, or ingestion. Both are human decisions.

---

## Class A — the consular corpus does not exist (8 elements)

**A-24** (3): registration within one year at the Indian mission; after one year Central
Government permission; German birth certificate first.
**A-26** (5): registration with the mission first; German birth certificate; parents' passports
and residence permits; the mission's appointment channel; source review date.

**None of this is new, and it should not be reported as a discovery.** It is already decided and
recorded: ADR-019 ("consular text is hand-curated because it is unreachable"), the manifest
(`cgi_frankfurt` `robots.txt` = `User-agent: * / Disallow: /`; `indian_embassy_berlin`
`blocked_by: host-404`, ADR-016), `data/consular/india.yaml` ("the substance A-24 and A-26 need
is NOT here yet and cannot be fetched — it needs a human with a browser"), the page list in
`docs/consular-curation-worklist.md`, and `scripts/eval/verify-golden.ts`, which labels both rows
**NOT-INGESTABLE … cannot be (ADR-019)** on every run.

Two things are worth adding to that record.

**One, mechanical:** curated consular text reaches the model through `lib/rag/consular.ts` into
`generate.ts`, *not* through `corpus_chunks`. So `jurisdictionsFor()` (`lib/rag/retrieve.ts:87`)
names `consular-india` in every retrieval filter while no chunk can ever carry it. Harmless
today, and misleading to read.

**Two, arithmetic, and this part is new:** these 8 elements are **in the gate's denominator**.
The gate is 72/95 of ANSWER-row elements; 8 of those 95 cannot be covered until a human
transcribes the pages on the worklist. So the real bar is **72 of the 87 reachable elements =
82.8%**, not 75%. Every coverage target quoted in this project so far has been quoted against a
denominator that includes 8 elements nothing in the pipeline can reach.

## Class B — fact exists, wrong jurisdiction (5 elements, all A-13)

A-13 is the worst single row, 1/6 covered. All five missing facts sit verbatim in one `berlin`
chunk at cosine 0.744: *"gültiger Personalausweis oder Reisepass der Eltern"*, *"Geburtsurkunde
der Mutter"*, *"ggf. Geburtsurkunde des Vaters"*, *"ggf. Eheurkunde"*, *"ggf.
Vaterschaftsanerkennung"*, plus a legalisation note for foreign documents.

A-13's row is `bundesland: hessen`. Restricting the question to `federal,hesse` reproduces its
recorded `topCosine` of **0.625 exactly**. The `hesse` corpus is **8 chunks in total**, and none
is a Standesamt document list. ADR-011 exists to stop a Berlin page answering a Hesse user, so
the filter is behaving correctly and the gap is real.

## Class C — genuine corpus gap, source fetchable (9 elements)

| row | element | evidence |
| --- | --- | --- |
| A-14 | no doctor's referral needed | no chunk contains the phrase in any form |
| A-14 | separate on-call fee charged privately | `Rufbereitschaft` absent from the corpus |
| A-15 | home visits capped by the Hebammenhilfevertrag | `Hebammenhilfevertrag` absent |
| A-16 | cover runs from the date of birth | absent |
| A-16 | child's insurance number needed for other applications | `Versicherungsnummer` absent |
| A-18 | certificate issued at the earliest 7 weeks before the due date | `sieben Wochen` occurs only in BEEG §15/§16, the *Elternzeit notice period* — the wrong rule |
| A-19 | acknowledgement free of charge | `gebührenfrei` occurs only as Kindergeld freephone numbers |
| A-20 | Sorgeerklärung free at the Jugendamt | same — no fee information for the Jugendamt anywhere |
| A-30 | tax ID arrives by post after birth registration | the corpus says the ID must be *stated* in the application, never that it arrives by post |

## Class D — golden defects (3 elements). Spec changes, not commits.

**A-07 — "14 months if both parents take at least 2 months". The golden misstates the statute.**
BEEG §4(3): *"Ist das Einkommen aus Erwerbstätigkeit eines Elternteils in zwei Lebensmonaten
gemindert, haben die Eltern gemeinsam Anspruch auf zwei weitere Monate Basiselterngeld
(Partnermonate)."* The condition is **one parent's income reduced in two months**, not each
parent taking two months. The reply said exactly what the statute says and was marked wrong. The
judge's own reason records this: *"The reply reaches 14 only through the income-reduction
condition."*

**A-17 — "each has a tolerance window" is unsatisfiable from the corpus.** `Toleranzzeit` appears
in exactly one chunk, Kinder-RL §2, and there only inside a COVID-era transitional provision for
U6–U9. No U1 tolerance window exists anywhere in the corpus.

**A-20 — "joint custody requires a Sorgeerklärung".** The reply named three genuine routes
(Sorgeerklärung, marriage, court transfer). "Requires" is wrong as a statement of law; the reply
is more accurate than the golden.

## Class E — fact retrieved but under-used (4 elements). Prompt-fixable.

**A-04** (1) — MuSchG §3(2) lists all three grounds verbatim: *"verlängert sich auf zwölf Wochen
1. bei Frühgeburten, 2. bei Mehrlingsgeburten und, 3. wenn … eine Behinderung … festgestellt
wird."* The reply gave only Frühgeburten. A three-item statutory list was truncated to one.

**A-06** (2) — BEEG §1(8) names *"§ 2 Absatz 5 des Einkommensteuergesetzes"* verbatim, and
**BEEG §28 exists as its own chunk** carrying the transitional provision. The reply said the
transitional provision "is not among its sources", which was false.

**A-29** (1) — BEEG §1(6): *"ihre Arbeitszeit 32 Wochenstunden im Durchschnitt des Lebensmonats
nicht übersteigt."* The reply cited a federal explanatory page for "32 hours a week" instead of
the statute — against `answer.v2.md:98` ("Prefer the statute over a page that summarises it").

**The shared pattern: the model had the statute and preferred a summary of it, or stopped partway
through an enumeration.** One prompt change addresses all four.

## Class F — the element is advice or an inference (2 elements)

**A-02** "apply as early as possible after birth" and **A-16** "register promptly so cover runs
from the date of birth" are recommendations, not statements of law. The answer prompt discourages
exactly this register. Either the prompt permits a procedural recommendation that follows from a
cited deadline, or these two goldens are mis-specified. Flagged, not decided.

## Class G — fact in corpus, in jurisdiction, not retrieved (7 elements). The addressable pool.

**A-21** (3) — `retrievalHit: false`. A `hesse` chunk reads *"welches der sechs hessischen Ämter
für Versorgung und Soziales (HÄVS) in Hessen für Sie zuständig ist"* at
`rp-giessen.hessen.de/Elterngeld` — golden elements 1 and 2, nearly verbatim. Cosine **0.668** on
a German query; **absent from the top 5** on A-21's actual English question, where max cosine is
0.614 and all five hits are federal BEEG sections. The chunk's vocabulary is *Versorgungsamt* /
*Ämter für Versorgung und Soziales*; it never says *Elterngeldstelle*.

**A-23** (4) — refused `low_confidence` at cosine 0.616, yet **all four facts are in the corpus**:
- *"Es gibt in allen Bundesländern die Möglichkeit, Elterngeld digital zu beantragen"* (federal
  guidance) — element 1.
- *"Mit dem Angebot ElterngeldDigital können Sie Elterngeld in den Bundesländern Berlin,
  Brandenburg, Bremen, Hamburg, Mecklenburg-Vorpommern, Niedersachsen, Rheinland-Pfalz,
  Sachsen-Anhalt, Schleswig-Holstein und Thüringen … beantragen"* (federal guidance) — element 2,
  verbatim including the absence of Hessen.
- the `hesse` HÄVS chunk — element 3.

A-23 was filed in the last journal as a corpus gap. It is not. It is a retrieval failure that
then tripped the confidence floor.

---

## What this changes

1. **Coverage was never a prose problem.** Three iterations of prompt work could not move it
   because 29 of the 38 missing elements were not reachable by prompting at all. The judge-context
   lesson in `past-mistakes.md` repeats here one stage further upstream.
2. **The largest addressable pool is retrieval (G, 7 elements), not refusal behaviour.** The
   previous journal's "over-refusal is the biggest single lever" is wrong; that pool is 3 elements.
3. **The gate is not closable without a human decision** — golden corrections (D) or ingestion
   (B, C) or curated consular text (A).
4. **The gate's denominator was never audited.** 8 of its 95 elements are formally unreachable
   (ADR-019), so "75%" has always meant 82.8% of what the pipeline can actually produce.

## Measured after the glossary change (step 2 of the iteration-4 plan)

`data/glossary.de-en.yaml`: `Versorgungsamt`, `Ämter für Versorgung und Soziales`, `HÄVS`,
`Regierungspräsidium` added to `Elterngeldstelle`; a new `ElterngeldDigital` entry added for
A-23. Retrieval only, no model calls:

| row | before | after |
| --- | --- | --- |
| A-21 | `rp-giessen.hessen.de/Elterngeld` absent from top 5; max cosine 0.614 | that chunk at **#5**, cosine 0.618 |
| A-23 | max cosine 0.616, no ElterngeldDigital chunk | `rechner-antraege/elterngeld-digital` at **#4**; max cosine **0.674** |

`golden-drift.ts`: 0 drift. `verify-golden.ts`: 0 rows needing a human. No retrieval regression.

**This is a partial win and the remainder has a named cause.** A-21's second element
(Regierungspräsidium Gießen) is Hesse chunk #8; A-23's third (the Hessen online portal) is Hesse
chunks #4–#5. Neither is retrieved. The whole Hesse corpus is **8 chunks of one page**, and
`lib/rag/retrieve.ts:251` completes sections by `section_ref` — which guidance chunks do not
have, as its own comment states. **Section completion therefore never fires for a guidance page**,
so a question needing two paragraphs of one page gets one of them. A `source_url`-keyed
completion, bounded by the existing `EXCERPT_TOKEN_BUDGET`, would reach the rest. That is a code
change in `retrieve.ts` and `server.ts`, outside the data-only scope that was approved, so it is
proposed and not done.
