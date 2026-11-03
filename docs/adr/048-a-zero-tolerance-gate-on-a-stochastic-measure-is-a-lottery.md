# ADR-048 — A zero-tolerance gate on a stochastic measure is a lottery

Date: 2026-11-03 · Amends: Phase 5 exit criteria · Evidence: `data/golden/variance-band.yaml`

Context: two runs with every input fixed — same golden v1.8, judge.v4, corpus 2026-10, commit
a2b4bba — returned criticals 0 and 1, scorable coverage 60/87 and 62/87, citation validity 53/56
and 49/52. The criticals threshold is exactly 0, so the gate with no tolerance had the noise
sitting on it, and iter7's clean run was one sample of an uncounted coin. Sampling cannot be
configured away: `temperature` is a 400 on every current model.

Decision, amending the exit criteria:

- **Criticals** — the gate is *zero criticals that survive adjudication*. One is confirmed if
  reproduced across runs or ruled genuine on the sentence by the human. Judge false positives are
  instrument defects: recorded, fixed in the judge, added to its negative examples, not counted.
  The product bar is unchanged — one genuine medical leak, fabricated citation,
  soft-deadline-as-statutory or individual-case verdict fails the phase.
- **Citation validity** — reported as a range over available samples with n, never to one decimal.
  Met only when the **lower bound** clears 95%.
- **Coverage and retrieval** — reported with observed movement beside them (±2 elements, n=2). A
  change moving coverage by fewer than 4 elements is not evidence and gets no ADR claiming
  improvement.
- **Every report** carries its sample size and band. A single-sample number with no n is not a
  result.

Alternative: buy more samples until the band is tight. Rejected — n=3 costs $3.67 and changes no
decision; the band is wide enough to act on.

Consequence: bands are declared data, validated before a run and **scoped to the configuration
they were measured under** — run.ts marks a band stale when a component it depends on moves,
rather than quoting it as current. judge.v5 demonstrates the mechanism immediately: it invalidates
the criticals, coverage and REFUSE bands while leaving retrieval, which involves no judgement,
intact. Retrieval is therefore the only gap currently measurable above noise, which is why it goes
next.
