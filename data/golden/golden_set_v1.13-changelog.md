# golden_set v1.12 → v1.13 — change log

Date: 2026-11-06 · corpus_version `2026-10` · 48 rows, unchanged · **1 required element corrected**

A **specification correction**, found by a human judge audit. Nothing in the answer layer changed
by this file. Keep it out of any improvement narrative.

**This does NOT move a gate denominator.** One textual replacement of a unique substring: exactly
**1 of 49 lines differs**, all 49 rows parse at **11 fields**, A-21's element count stays at **3**,
and the ANSWER scorable denominator stays at **85**.

Both standing constraints hold: **no semicolons** inside an element (`run.ts` splits clause cells
on a bare `;`) and **one claim per element** — the corrected wording states one thing about the
answer's scope, where the old wording bundled three.

---

## A-21 — "Where do we apply for Elterngeld in Frankfurt?"

| | |
| --- | --- |
| before | `the answer names the authority, links its page, and states that this is Hessen-specific` |
| after | `the answer states the authority and that this is Hessen-specific` |

### Why

**`links its page` cannot be satisfied by any reply, ever.** A URL is not part of the answer text.
It lives in the Citation contract — `lib/schemas.ts:142`, `source_url` on each citation — and
`answer.v5.md:205` instructs the model to put it there, not in prose. So the element required of
the answer layer a thing the answer layer is specified not to do, and no amount of answering could
meet it.

The judge's verdict on 2026-11-06 reads exactly as that defect predicts:

> *"The reply names the Regierungspräsidium Gießen Elterngeld page and says it is about Hessen, but
> it does not give a URL link and does not name the specific Frankfurt office, so the authority is
> not fully named."*

The reply did the specified thing and was marked down for not doing the unspecified one.

**Where the link requirement goes instead:** nowhere new. It is already measured. Citation validity
resolves every cited chunk by `(url, ref)` (ADR-049) and is reported as its own gate figure. A URL
that is wrong, missing or unresolvable fails there, which is the check that can actually see it.
Asking for it a second time in prose did not add a check; it subtracted a measurable element.

**What is kept.** The element is not a freebie. A reply naming no authority, or naming one without
saying the arrangement is Hessen-specific, still misses it — and "Hessen-specific" is the half that
matters most, because A-21 is the row that catches a Berlin procedure presented as general, which
is this row's own `must_not` cell.

### Fourth instance of one class, so the rule needs no further argument

A-16 (ADR-056), R-06 (ADR-060), A-01 (v1.12) and now A-21: **a required element whose wording asks
for more than the system is permitted or specified to do is a golden-set defect, and is corrected
to its permitted half rather than deleted.** The denominator holds in all four.

A-21 adds the third distinct reason an element can be unmeetable. A-16's was a **sourcing** limit
(the fact is in no ingested provision). A-01's was a **project rule** (rule 4 — the LLM never
computes dates). A-21's is a **contract boundary**: the required string lives in a different field
of the response than the one being graded. All three are specification defects; none is a product
defect.

---

## Not changed, and why

The same audit found **one instrument defect**, and it is not a golden-set problem. It goes to
`judge.v7.md`, not to this file.

**A-21 element 1 — judged NOT COVERED with a reason that is false about the reply.** The element
asks for the *sechs hessischen Ämter für Versorgung und Soziales*; the reply contains `the six
Hessische Ämter für Versorgung und Soziales` verbatim and states the residence principle twice.
The judge's reason — *"It never names the HÄVS or states that Hessen has six such offices"* — is
false on its face, and the human audit overturned the verdict. **The element itself is sound and is
not touched.** A correct element graded by a misreading instrument is an instrument problem;
editing the golden set to suit it would hide the defect in the denominator.

### What the verbatim-presence sweep found, and what it did not

`eval/reports/verbatim-presence-sweep.md` (ADR-068) is deterministic and cost nothing. Over **34
scored samples** and **833 NOT COVERED element verdicts** it raised **8 strong flags** — a
multi-word authority name from the element appearing in the reply it was judged absent from — and
all 8 are on A-21. Read one by one against each sample's own stated reason, **exactly one is
upheld**: the iter13 verdict above.

The other seven are **dismissed, and the reason matters.** Four are A-21's Fachaufsicht element,
where every reason explicitly acknowledges that the reply names the Regierungspräsidium Gießen and
correctly observes it never says that body holds the Fachaufsicht. Three are element 1 on earlier
runs, where the reasons likewise acknowledge the offices are named and identify the real gap — the
reply quotes them from a contact page without stating the residence rule in terms of them. For
instance, on `iter12-v5-2`:

> The reply says the six Hessian Ämter exist and that the user should use the contact list to find
> the office for their district […] the reply names 'the six Hessian Ämter für Versorgung und
> Soziales' only as quoted from the Regierungspräsidium page, and the responsibility rule it gives
> is the generic BEEG district rule, not the HÄVS mapping.

That is a checkable judgement a reader may disagree with. It is not a misread. **NOT COVERED is
frequently the right call on an element whose words do appear** — which is exactly why a flag from
this sweep is a candidate for reading, never a correction.

**Consequence for the coverage gate: none.** The one upheld flag is in `iter13-judge-v6-1`, which
is not a valid baseline (ADR-067). Of the two valid baselines at the current configuration,
`iter12-v5-1` was never flagged and `iter12-v5-2`'s flag is dismissed above. The scorable coverage
lower bound therefore stands **exactly as measured at 72.9% (62/85)** against a 75% bar, a miss by
**2 elements**. Nothing in this sweep moves it, and no figure in the exit document changes because
of it.

### The 16 weak flags

Also reported, also dismissed: a lone glossary term such as `Elterngeld`, or a § reference matched
at paragraph level (`citations.ts:60` drops the Absatz, so an element asking for §12(1) matches a
reply citing §12(3)). These are expected — an element about Elterngeld is quoted in a reply about
Elterngeld — and they are listed only so the sweep's output is complete rather than curated.
