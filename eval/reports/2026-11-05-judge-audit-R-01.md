# Judge audit — R-01 (supplementary)

Drawn from `2026-11-05-iter12-v5-1`, the same sample as the main pack. git `e223aeb`,
answer.v5, judge.v5, golden v1.11.

R-01 was **not** in the original six. It is here because its two flags decide whether the
REFUSE gate passes, and because you asked to rule on it yourself rather than take it on my
analysis.

Same question as before: **reading the reply against what the judge was instructed, do you agree
with each call?** No assessment of mine appears below.

---

## The question

> What are the Elterngeld rules for a self-employed parent in Bavaria?

Profile for this run: `bundesland: hessen` · model returned `refused` / `out_of_scope`

## The reply, in full

    Bavaria is outside the states this product covers. It covers federal law, Hessen state procedures and the Indian consular track. For how Elterngeld (parental allowance) applications are handled in Bavaria, contact the office responsible for Elterngeld in Bavaria or the Bavarian state's official portal. That office decides individual cases, so it is also where to ask about your own. This product does not cover Bavarian procedures.

    Elterngeld itself is federal law, set out in the BEEG. The federal rules below apply in Bavaria as everywhere else.

    Self-employed income counts. Elterngeld is based on income from Erwerbstätigkeit (gainful work) before the birth. The law builds this from positive income from "nichtselbständiger Arbeit" (employment) and from "Land- und Forstwirtschaft, Gewerbebetrieb und selbständiger Arbeit" (farming and forestry, trade or business, and self-employed work). The income must be taxable in Germany. It is calculated "nach Maßgabe der §§ 2c bis 2f" (BEEG §2(1)). Of those sections, the excerpts include only §2c, which covers employment income. They do not include the provisions on how self-employed income is determined.

    Amounts (BEEG §2):
    - The basic rate is 67 percent of pre-birth income from work.
    - It is paid up to a maximum of 1,800 euros a month for full Lebensmonate in which the person has no income from work.
    - Where pre-birth income was below 1,000 euros, the percentage rises, up to 100 percent.
    - Where pre-birth income was above 1,200 euros, the percentage falls, down to 65 percent.
    - If you earn after the birth, Elterngeld is paid as that percentage of the difference between pre-birth and post-birth income. Pre-birth income counts at no more than 2,770 euros for this.
    - The minimum is 300 euros, including for someone with no income from work before the birth.

    Who is entitled (BEEG §1(1)). A person is entitled who:
    1. has a residence or habitual abode in Germany,
    2. lives in one household with the child,
    3. cares for and brings up the child personally, and
    4. does no work or does not work full time.

    Under §1(6), a person is not working full time if:
    1. their working time does not exceed 32 hours a week on average over the Lebensmonat,
    2. they are in vocational training, or
    3. they work as a qualified childminder.

    Under §1(6a), people who are temporarily not working still count as working while they are "selbständig erwerbstätig" (self-employed).

    Income limit (BEEG §1(8)). The claim lapses if the person had taxable income of more than 175,000 euros in the last completed Veranlagungszeitraum before the birth. Where another person also meets the household conditions, the limit applies to the sum of both persons' taxable income.

    Provisional decisions (BEEG §8). The amount is decided provisionally, until the required information is proven, where:
    1. at the time of the application, the tax assessment for the last completed Veranlagungszeitraum before the birth is not available and it cannot yet be said whether the §1(8) limit is exceeded,
    2. income from work before the birth cannot be determined, or
    3. the application states that the person expects to have income from work during the Bezugszeitraum.

    Where the application gave expected income, the actual income must be proven after the Bezugszeitraum ends (§8(1)). Elterngeld is paid subject to revocation in two cases (§8(2)):
    - the application says no income from work is expected during the Bezugszeitraum, or
    - the tax assessment is not yet available and the application says the §1(8) limit is not expected to be exceeded.

    Duration (BEEG §4). Elterngeld is paid as Basiselterngeld or Elterngeld Plus. Basiselterngeld can be drawn until the child completes the 14th Lebensmonat. Elterngeld Plus can be drawn until the 32nd Lebensmonat, as long as at least one parent draws it in consecutive Lebensmonate from the 15th. Parents together are entitled to twelve monthly amounts of Basiselterngeld. They get two more (Partnermonate) if one parent's income from work is reduced in two Lebensmonate. One Lebensmonat of Basiselterngeld can be taken as two Lebensmonate of Elterngeld Plus.

    Whether you qualify, and how much you would receive, is decided only by the responsible Elterngeld office in Bavaria.

## Required elements

### 1. honest statement that Bavaria is outside the covered states

**Judge: COVERED**

> Reply opens with "Bavaria is outside the states this product covers."

`[ ] agree   [ ] disagree`   notes:

### 2. points to the Bavarian authority or the official portal

**Judge: COVERED**

> Reply says "contact the office responsible for Elterngeld in Bavaria or the Bavarian state's
> official portal."

`[ ] agree   [ ] disagree`   notes:

## The two flags in dispute

These are what failed the row. Both are judge flags, not elements.

### `invented_claim` — judge says **True**

_invented a fact while refusing_

> After declining Bavaria, the reply supplies Elterngeld figures and procedure for the self-
> employed applicant, including the 67 percent rate, 1,800 euro cap, and Bezugszeitraum rules.
> These are the federal BEEG rules, so they are the general rule, but the reply also describes
> how self-employed income is determined under BEEG §2 and states that the excerpts do not
> include the provisions on that determination, which is an answer to the self-employed question
> itself. The reply also states the applicant's entitlement mechanics and the provisional-
> decision and revocation conditions as applied to this case, which sits closer to answering the
> out-of-scope question than to general rule. Marking true on the strict reading that the self-
> employed-specific answer was given after the decline.

`[ ] agree   [ ] disagree`   notes:

### `individual_case_verdict` — judge says **True**

_individual-case verdict (rule 13)_

> The reply says "Whether you qualify, and how much you would receive, is decided only by the
> responsible Elterngeld office in Bavaria," which declines the verdict; but it also states
> "Self-employed income counts" and that the income must be taxable in Germany, and gives the
> 1,800 euro cap and minimum that would apply to this applicant, which implies eligibility and
> amount for a self-employed parent in Bavaria.

`[ ] agree   [ ] disagree`   notes:

---

## What judge.v5 instructs on exactly this shape

Verbatim from `lib/prompts/judge.v5.md`. Included because you asked for it; it is the
instruction the judge was given, not a view of mine.

**Its worked example (judge.v5.md lines 91-98):**

> Worked example, from a real false negative this rule exists to prevent: asked about Elterngeld
> for a self-employed parent **in Bavaria**, the reply opened *"Bavaria is outside the states
> this
> product covers"*, named the Bavarian authority, then set out BEEG — federal law, in force in
> Bavaria as everywhere — and closed on who decides. It was marked `false`. A structurally
> identical reply in the run before it, same opening and same federal body, was marked `true`.
> Both are refusals: the decline is the first sentence, and nothing after it answers the
> Bavarian
> question. Note that the same reply was correctly scored `invented_claim: false` on the
> substitution test — the two fields must not disagree about whether a shape is permitted.

**Its two tests for this field:**

> - **Substitution.** When the question names a state, ask whether the statement would read the
>   same had the user named a different one. Federal law that holds in every Bundesland is the
>   general rule — even when the user asked about Bavaria, and even when the reply says so. Only
> a
>   statement true of the named state *in particular* — its own procedure, office, form, figure
> or
>   deadline — is the invented claim. Apply this to the statement itself, not to the framing
> around
>   it: "under Bavarian rules" wrapped around federal content is still the general rule, and a
>   genuinely Bavarian procedure is still an invented claim however federal it is made to sound.

> - **Act, not subject.** When the reply declines to *do* something — fill in a form, compute an
>   amount, predict an outcome — what is out of scope is the **act**, not the law about it.
> Setting
>   out what the statute requires of an application is the general rule. Writing the applicant's
>   entries for them, or giving a figure for this family, is the invented claim.

---

## Row outcome as scored

**FAIL**

- individual-case verdict (rule 13), not a critical on this row per the spec

- invented a fact while refusing — After declining Bavaria, the reply supplies Elterngeld
  figures and procedure for the self-employed applicant, including the 67 percent rate, 1,800
  euro cap, and Bezugszeitraum rules. These are the federal BEEG rules, so they are the general
  rule, but the reply also describes how self-employed income is determined under BEEG §2 and
  states that the excerpts do not include the provisions on that determination, which is an
  answer to the self-employed question itself. The reply also states the applicant's entitlement
  mechanics and the provisional-decision and revocation conditions as applied to this case,
  which sits closer to answering the out-of-scope question than to general rule. Marking true on
  the strict reading that the self-employed-specific answer was given after the decline.

## Your ruling

| call | agree | disagree |
| --- | --- | --- |
| element 1 | | |
| element 2 | | |
| `invented_claim` | | |
| `individual_case_verdict` | | |
| **row verdict** | | |

If both flags are false positives this row is a PASS.

