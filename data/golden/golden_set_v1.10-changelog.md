# golden_set v1.9 → v1.10 — change log

Date: 2026-11-04 · corpus_version `2026-10` · 48 rows, unchanged · **1 required element corrected**

A **measurement correction, not a quality improvement.** Nothing in the answer layer changed.
Keep this delta out of the Phase 5 improvement narrative.

**Unlike v1.9, this one does NOT move a gate denominator.** Verified cell by cell rather than by
eye: the migration compared every cell of all 48 rows and reported exactly **1** difference,
`A-16.required_answer_elements`. Requirement counts: **ANSWER 93 → 93**, DEFLECT and REFUSE
unchanged. So the scorable denominator stays at **85**, and iter8's 66/85 remains directly
comparable to anything measured under v1.10.

The two standing constraints still bind: **no semicolons** inside an element (`run.ts` splits
clause cells on a bare `;`) and **one claim per element**.

Human ruling, 2026-11-04: the "free of charge" claim is not sourceable from the cited provision,
with the instruction to **replace rather than delete if any provision in the corpus carries the
contribution-freedom**, and to delete only if none does. The corpus was searched before editing.

---

## A-16 — "How do we insure the baby after the birth?" · SGB V §10

| | |
| --- | --- |
| **was** | `Familienversicherung is free of charge for the child under statutory insurance; …` |
| **now** | `the child is covered by Familienversicherung under a parent's statutory insurance; …` |

**Corrected, not deleted — the A-17 pattern.** The element bundled two claims: that the child is
covered, and that the cover costs nothing. The first is the statute's own content; the second is
not in it.

- **§10(1):** *"Versichert **sind** der Ehegatte, der Lebenspartner und **die Kinder von
  Mitgliedern** …"* — who is covered, by operation of law. This is what the element now asserts.
- **Contributions are nowhere in §10.** The provisions that govern them — SGB V §3 (Beitragspflicht
  der Mitglieder) and §223 (Beiträge je Kalendertag der Mitgliedschaft) — are **not ingested**:
  `corpus_manifest.yaml` takes `only_sections: ["10", "24d", "24i"]` because SGB V entire is far
  too large. The freedom from contributions follows from *joining* those provisions, which is
  reasoning the answer layer must not do and the judge cannot check.

### The corpus was searched before the element was edited

A literal scan of **every** chunk, not a retrieval query — `beitragsfrei`, `Beitragsfreiheit`,
`keine Beiträge`, `kein Beitrag`, `ohne Beitrag`, `kostenlos`, `kostenfrei`. 37 chunks match. Not
one states that the **child** is covered without contributions. The nearest misses, and why each
fails:

| chunk | says | why it does not carry the element |
| --- | --- | --- |
| familienportal `elternzeit/arbeit-versicherung` | *"Wenn Sie freiwillig versichert sind, aber einen Anspruch auf Familienversicherung hätten, besteht für Sie Beitragsfreiheit"* | The **voluntarily insured adult**, conditioned on a statutorily insured spouse. Not the child |
| the same page | *"Soweit Sie vor der Elternzeit bereits beitragsfrei … familienversichert sind, ändert sich daran durch die Elternzeit nichts"* | Presupposes contribution-freedom in an aside about Elternzeit; asserts nothing about the child, and a presupposition is not a statement the judge can ground a claim on |
| `SGB X §64` — Kostenfreiheit | *"Für das Verfahren bei den Behörden **nach diesem Gesetzbuch** werden keine Gebühren und Auslagen erhoben"* | Administrative fees under **SGB X**. Health-insurance contributions are not fees, and SGB V is not "dieses Gesetzbuch" |
| `BKGG §11` | *"Die Überweisung erfolgt kostenfrei"* | The bank transfer of Kinderzuschlag |

**Recorded for when the corpus grows: the fact is true and unsourceable here.** Children are
contribution-free under Familienversicherung — they are *Versicherte*, not *Mitglieder*, and
contributions attach to membership. Ingesting SGB V §3 and §223 would make it sourceable, and the
element can then return as its own claim. It is materially useful to a parent, so this is a gap in
the corpus and not a decision that the fact does not matter.

## What this does to the figures — both, as the standing rule requires

**Nothing improved.** The denominator does not move, so there is only one figure to give:

| | v1.9 | v1.10 |
| --- | --- | --- |
| ANSWER requirement count | 93 | **93** |
| scorable denominator | 85 | **85** |
| the ≥75% gate, in elements | 64 of 85 | **64 of 85** |
| iter8's measured coverage | 66/85 = 77.6% | directly comparable |

If coverage rises under v1.10 it is because an element that **could not be met** has been replaced
by one that **can** — exactly the A-17 correction, where coverage moved "because three elements
stop being wrong or unsatisfiable, which has nothing to do with the answer layer." The next report
must label it that way and must not count it as progress.

### Still open on this row, deliberately unchanged

A-16 element 3, *"the child's insurance number is needed for other applications"*, remains
unreachable — `Versicherungsnummer` and `Krankenversichertennummer` return **0 chunks**. Flagged
in the v1.9 log, still not advice, still outside any ruling made so far.
