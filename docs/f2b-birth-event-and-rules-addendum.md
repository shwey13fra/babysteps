# Addendum: F2b birth event, rule schema, and three missing rules

Insert before Phase 1. This changes `lib/schemas.ts`, `lib/timeline/`, the rule files and one screen — all of it cheaper to do now than to retrofit after the engine tests are written.

---

## 1. F2b — record the actual birth date

### Why it's a launch blocker

Six of the nine planned rules key off the birth, not the due date: Standesamt registration, Elterngeld, Kindergeld, the baby's health insurance, consular registration and the passport. Before the birth those dates can only be estimates. After the birth, the estimates are wrong by however many days the baby was early or late — a week is common, three weeks is not rare — and every one of those items is a hard deadline. Without this feature the product is most confidently wrong at the exact moment it matters most, and a four-week beta with families at different gestational stages will hit it.

It also quietly extends the product past the PRD's "families already past birth are out of scope at MVP" line, in the only direction that costs nothing: families who *become* post-birth while using it.

### Data model

`IntakeProfile` gains two optional fields:

```ts
birth_date: z.string().date().optional(),          // ISO, set by F2b
birth_recorded_at: z.string().datetime().optional() // for the "you confirmed this on" line
```

Every rule declares what it is anchored to:

```yaml
anchor: due_date | birth   # was implicit, now explicit
```

Every computed `TimelineItem` carries:

```ts
certainty: 'estimated' | 'confirmed'
```

The derivation is one line: an item is `confirmed` when its anchor is `due_date`, or when its anchor is `birth` and `profile.birth_date` is set. Everything else is `estimated`. This is the field the UI keys its dashed-versus-solid treatment off, and it is what makes the honesty visible instead of a footnote.

### Engine behaviour

When `birth_date` is absent, `birth`-anchored items compute from `due_date` as the placeholder and are marked estimated. When it is present, they compute from `birth_date` and are marked confirmed, and `due_date` is retained only for display ("due 15 Nov, born 9 Nov").

Setting the birth date also derives two things that were previously intake questions or flags:

- **Premature branch.** If `birth_date` is more than 21 days before `due_date`, or the user ticks the premature box, the 12-week Mutterschutz variant applies and the days unused before the birth are added to the period after. This is currently a manual flag; make it a derived value with the manual flag as an override.
- **Status recomputation.** Items that were `upcoming` can jump straight to `urgent` or `overdue` the moment the birth date lands — a baby born three weeks early moves the Standesamt deadline into the past-plus-four-days territory. The engine must handle "already overdue on first render" as a normal state, not an edge case.

### Screen

One screen, reachable two ways: a persistent card at the top of the timeline from week 36 onward ("Has the baby arrived?"), and a link in every reminder e-mail from that point.

The screen is a single date field and a confirm button. On confirm, show a **diff** before committing:

```
Nine dates moved.

Register the birth       17 Nov  →  11 Nov     now 2 days away
Apply for Elterngeld     15 Feb  →   9 Feb
Register with consulate  15 Nov  →   9 Nov 2027
...
```

The diff is the whole design idea of the screen. It converts an anxious moment into a demonstration that the product is doing its job, and it is the single most screenshot-worthy interaction in the build. It also doubles as a self-check: if a date moves in a direction that makes no sense, the user sees it before you do.

### What else has to change

| Surface | Change |
| --- | --- |
| `reminder_subscriptions` | The stored `profile` jsonb must be updatable after subscription, or reminders keep firing on estimated dates. Add `PATCH /api/subscription/[token]`, reusing the token that already exists — rename `unsubscribe_token` to `manage_token` while it costs nothing. |
| Share link | The HMAC token encodes the profile, so existing partner links go stale on birth. Version the payload and show a "this view is from before the birth was recorded" banner rather than silently serving old dates. |
| Reminder copy | A reminder for a `birth`-anchored item sent while `certainty` is `estimated` must say so in the mail. |
| Eval | Add one golden case: the same question with and without a birth date, asserting the engine, not the model, produced the difference. |

### Tests to add in Phase 1

Birth exactly on the due date (no dates move). Birth 21 days early (premature branch fires, Mutterschutz extends, unused pre-birth days are added). Birth 10 days late. Birth date in the future (rejected). Birth date before the pregnancy could plausibly have started (rejected). Birth 4 days before the Standesamt deadline computes as overdue on first render. Birth date set, then cleared — every item returns to estimated with the original placeholder dates.

---

## 2. The rule-file schema (currently undefined)

The playbook tells Claude Code to author the rules "per the brief §4 example", but §4 of the brief is the security specification — there is no example anywhere in the three documents. Left as is, the agent will invent a shape in Phase 1 and you'll be living with it. Pin it now:

```yaml
# data/rules/german_federal.yaml
- id: elterngeld_application
  track: german                      # german | consular
  jurisdiction: federal              # federal | hesse | berlin | consular-india
  title_en: Apply for Elterngeld
  term_de: Elterngeld                # must match a `de` key in glossary.de-en.yaml
  anchor: birth                      # due_date | birth
  window_open:
    offset_days: 0                   # from the anchor
  deadline:
    offset_days: 92
    kind: soft                       # hard = statutory | soft = money-losing | advisory
    note_en: >
      Not a statutory cut-off. Elterngeld is paid at most three months back from
      the month the application arrives, so later applications lose whole months.
  applies_if:
    all:
      - insurance: [gkv]
  authority_en: Elterngeldstelle of your Bundesland
  consequence_en: >
    Each month you apply late beyond the three-month window is a month you cannot
    claim later.
  documents:
    - Birth certificate for Elterngeld purposes (Geburtsurkunde mit Verwendungszweck Elterngeld)
    - Payslips for the twelve months before the birth
    - Confirmation of Mutterschaftsgeld from the Krankenkasse
  source_ref: "BEEG §7(1)"
  source_url: https://www.gesetze-im-internet.de/beeg/__7.html
  verified_on: 2026-09-10
  review_after: 2026-12-10           # consular rules: 90 days. Statute: 365 days.
```

Two fields worth arguing for. `kind` on the deadline separates "the law says you lose the right" from "you lose money" from "do this early or it gets hard" — the UI colours them differently and the answer layer must never call a soft deadline a legal one, which is exactly the mistake golden case A-02 tests for. And `review_after` gives the freshness job something to sort on, which is the beginning of the law-change alerting in PRD 2.5.

---

## 3. Three rules that should be in the MVP nine (making it twelve)

### `elternzeit_notify_employer` — the biggest omission

BEEG §16(1) requires the request to reach the employer **at least seven weeks before the leave starts**, in writing with an original signature — an e-mail does not satisfy the form requirement. Miss it and the start of the leave shifts, which cascades into the Elterngeld months. This is a hard, form-bound, employer-facing deadline of exactly the kind the survey respondents described missing, and it is absent from the nine.

It needs an ADR because the anchor is genuinely ambiguous: the seven weeks count back from the start of the *leave*, not from the birth. A partner taking leave from the day of birth must give notice seven weeks before the due date. A mother starting hers when the Mutterschutz period ends has a practical deadline about a week after the birth. The intake doesn't ask who is taking leave and when.

Recommended resolution: model the conservative one — `anchor: due_date, offset_days: -49, kind: hard` — and put the second case in the item's explanation. Alternatively add an eighth intake question, which costs you the under-two-minutes promise. Decide it explicitly in an ADR rather than letting the agent pick.

### `vaterschaftsanerkennung` — already implied by your intake

You ask marital status and then never use it. Under BGB §1592 an unmarried partner is not the legal father until paternity is acknowledged; without it he is not on the birth certificate, which blocks the consular registration and the passport on the Indian side. Joint custody needs a separate Sorgeerklärung (BGB §1626a). Both are free at the Jugendamt and both can be done **before** the birth, which is the whole point of surfacing it on a timeline.

```yaml
applies_if:
  all:
    - marital_status: [unmarried]
anchor: due_date
window_open: { offset_days: -84 }
deadline: { offset_days: 0, kind: advisory }
```

### `mutterschaftsgeld_application`

The certificate of the expected delivery date may be issued at the earliest seven weeks before the due date, and the application to the Krankenkasse plus the employer notification follow from it. It sits in a narrow window that opens and closes, which the timeline is good at showing and a static checklist is not.

```yaml
anchor: due_date
window_open: { offset_days: -49 }
deadline: { offset_days: -14, kind: soft }
```

---

## 4. Two documentation inconsistencies to reconcile before Phase 1

**Feature order.** Brief §5 runs F1→F2→…→F8→F9 in a single sequence. PRD §4.1 puts F8 at P0 and F5-F7 at P1. The playbook builds F1-F4, F7, F8 in Phase 6 and F5, F6 in Phase 7. The playbook is right; make the brief match it so Claude Code doesn't read §5 and reorder itself.

**Quality gates.** PRD M3 targets ≥95% of eval answers carrying a correct official citation. Phase 5 exits at ≥80% ANSWER hit rate. These are different metrics, and as written the build can pass its gate while missing its stated success criterion. Suggested reconciliation: keep ≥80% as the *retrieval* gate, add *citation validity ≥95%* as a separate gate, and treat the gap between them honestly in the portfolio write-up — "retrieval found the right clause 84% of the time; when it answered, 97% of citations were valid" is a more credible sentence than one blended number.
