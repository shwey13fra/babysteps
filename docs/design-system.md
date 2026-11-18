# BabySteps Germany — design system v1 (calm-clinical)

Supersedes the cream/teal/violet tokens referenced in the v1 brief §2, which weren't in the handover pack.

---

## 1. The idea

The product's job is to take a hidden calendar of legal deadlines and make it visible and believable to someone who is anxious, tired, and reading in their second language. Two failure modes bracket the design. Too warm and reassuring, and it reads as a pregnancy blog — the survey respondent who trusts only official websites bounces. Too official, and it reproduces the exact aesthetic that is currently frightening these families: the Amtsschreiben, the dense grey block of German they photograph and paste into a translation app.

The resolution is to borrow the *structure* of German administrative paper and drop its *texture*. A Fristenkalender has a date gutter, a hairline rule, a reference number, a stamped as-of date. Those devices carry real information and they read as institutional. What makes official paper oppressive is density, justified grey text, boxed forms and no air. So: keep the gutter, the rule, the § reference and the date stamp. Give them generous space, one accent, and nothing decorative at all.

Three rules follow, and everything below is downstream of them.

**Nothing on screen without provenance.** Every date shows what it's counted from. Every claim shows its source and the date that source was checked. Every estimate is visibly an estimate. This is the trust mechanism, so it gets the design budget.

**One bold moment per screen.** On the timeline it's the today marker. In an answer it's the deadline. Everything else is quiet. Calm is produced by restraint, not by soft colours.

**The interface never sounds relieved or worried on the user's behalf.** No "Don't worry!", no "Great job!", no alarm language on anything that isn't actually urgent. Amber means a real deadline inside fourteen days.

## 2. Colour

Cool paper rather than cream — cream plus a teal accent is the current house style of every AI-assisted product, and for a German-administration subject the cooler ground is also just more accurate. Two track colours because the dual-track split is the product's differentiator and it has to be legible at a glance.

| Token | Hex | Use |
| --- | --- | --- |
| `--paper` | `#F4F7F7` | Page ground |
| `--surface` | `#FFFFFF` | Cards, item rows |
| `--ink` | `#15242B` | Primary text |
| `--ink-2` | `#4C5F68` | Secondary text, explanations |
| `--ink-3` | `#62747B` | Metadata, as-of dates, gutter labels |
| `--rule` | `#DCE4E4` | Hairlines, the timeline rail, dividers |
| `--de` | `#0B6B60` | German track |
| `--de-soft` | `#E4EFED` | German track fills |
| `--in` | `#4A3D8F` | Consular track |
| `--in-soft` | `#EAE8F5` | Consular track fills |
| `--warn` | `#8A5300` | Deadline within 14 days — text |
| `--warn-soft` | `#FBF1DC` | Deadline chip ground |
| `--stop` | `#96282A` | Overdue — text |
| `--stop-soft` | `#FAEAE9` | Overdue chip ground |
| `--done` | `#5C7077` | Completed items |
| `--on-de` | `#FFFFFF` | The label on a `--de` fill — the primary button. Was hard-coded until 2026-11-18 (ADR-087) |
| `--accent` | `#2D4EA8` | **The action colour, product-wide**: buttons, links, focus rings, selected states. Deliberately neither `--de` nor `--in` — those two are the tracks, and painting actions in either would make "belongs to the German office" and "is a button" the same colour. Measured 26° off the consular violet (hue 224 against 250) |
| `--on-accent` | `#FFFFFF` | The label on an `--accent` fill |
| `--skeleton` | `#EDF1F1` | The wait-state bars. Likewise |
| `--art-far` | `#15242B` | The stork's far wing. The one illustration colour that cannot be a text token — see §2b |

Every text-on-fill pairing above clears WCAG AA at body size. This was a claim until 2026-11-12, when axe-core measured the rendered pages and found it false: `--ink-3` was `#7B8F96` at **3.13:1** and `--done` was `#93A6AB` at **2.35:1** against `--paper`, the only accessibility defect in the product across seven routes. Both were darkened to the values above, which hold the hue and clear 4.5:1 on `--paper` (4.53 and 4.83) and on `--surface` (4.88 and 5.20). See ADR-073. `--ink-3` is still restricted to 13px metadata and never used for anything a user must read to act; `--done` is now within one step of it, so **colour is no longer what distinguishes a done row** - the hollow dot and the dropped chip are (ADR-072). The amber and red are dark enough to read as text rather than as warning-light decoration, which is deliberate: this product should never look like it is flashing at a pregnant person.

Colour never carries meaning alone. The two tracks also differ by label and by a 3px left border; urgency also differs by a written phrase ("in 9 days").

## 2b. Colour — dark

Added 2026-11-18 (ADR-087). Until then there was **no dark scheme at all**: no `prefers-color-scheme`
rule anywhere in the product and no `color-scheme` declaration, so a phone set to dark rendered a
page that had never been designed for it, with a white `#fff` hard-coded into the primary button.

| Token | Hex | Note |
| --- | --- | --- |
| `--paper` | `#0E1619` | Cool near-black. Not `#000`: pure black halates under light text, and it would lose the one thing the light scheme is built on — that the paper is cool rather than cream |
| `--surface` | `#172227` | |
| `--ink` | `#E6EDEF` | |
| `--ink-2` | `#AEBFC6` | |
| `--ink-3` | `#92A4AC` | Still restricted to 13px metadata |
| `--rule` | `#2A383D` | |
| `--de` | `#5CCBBA` | Lifted, not re-hued — still the German green at a glance |
| `--de-soft` | `#12302C` | |
| `--in` | `#B0A4F2` | Still the consular violet |
| `--in-soft` | `#231F3D` | |
| `--warn` | `#E3A74A` | |
| `--warn-soft` | `#2E2310` | |
| `--stop` | `#F49490` | |
| `--stop-soft` | `#331715` | |
| `--done` | `#8D9FA7` | Within one step of `--ink-3`, so colour still never marks a done row (ADR-072) |
| `--on-de` | `#05221E` | New in both schemes. The label on a `--de` fill — the one pairing a dark set cannot inherit, because in dark `--de` is a light teal and white on it reads at about 1.4:1 |
| `--accent` | `#8AA6FF` | Still 23° off the dark scheme's `--in` (226 against 249) |
| `--on-accent` | `#0B1430` | |
| `--skeleton` | `#1E2C31` | The wait-state bars. A hard-coded light grey is a bright flash in a dark room |
| `--art-far` | `#6B5BB5` | The stork's far wing. The body is `#FFFFFF` in **both** schemes, so this must stay darker than white in both — `--ink` goes near-white here and the wing dissolves into the body at about 1.14:1. It must also separate from the dark violet sky, which rules out `--in-soft`. Found by looking at the rendered page; no contrast arithmetic would have caught it, because the pairing is picture against picture |

**These are measured, not claimed.** §2 above carried the sentence "every pairing clears WCAG AA"
for three weeks while it was false. `tests/ui/contrast.test.ts` now computes all 21 pairings from
the stylesheet itself, in both schemes, and fails with the pairing and the number if any hex moves.
The worst pairing in dark is **5.91:1**; in light it is **4.53:1**.

The amber and the red are lifted the same amount as everything else and no further. This product
must never look like it is flashing at a pregnant person, and that is more true in a dark room at
four in the morning, which is when this screen will actually be read.

## 3. Type

**IBM Plex Sans** for everything, **IBM Plex Mono** for statute references only.

Plex Sans is a workhorse with an engineered, institutional temperament rather than a friendly startup one, and its Latin Extended coverage handles German diacritics and the long compounds without the fitting problems Inter has at small sizes. Plex Mono appears in one place: the § reference. That is not a decorative monospace label — an Aktenzeichen is the thing German administration uses to say "this is the exact provision", and reproducing that convention is how a citation reads as a citation.

Self-host both via `next/font/local`. See the legal pack: a `fonts.googleapis.com` request is a live Abmahnung risk in Germany.

| Role | Size / line-height | Weight |
| --- | --- | --- |
| Screen title | 27 / 32 | 600 |
| Item title | 17 / 24 | 500 |
| Body, answers | 15 / 24 | 400 |
| Secondary | 15 / 22 | 400, `--ink-2` |
| Metadata, gutter | 13 / 18 | 400, `--ink-3` |
| § reference | 13 / 18 | 400, Plex Mono |

Dates and countdowns use `font-variant-numeric: tabular-nums` so the gutter column stays aligned. Text is left-aligned everywhere; nothing is justified, because justified German at 380px produces rivers.

### German compounds

`Mutterschutzfristen`, `Vaterschaftsanerkennung` and `Steuer-Identifikationsnummer` will overflow a 380px column. Set `hyphens: auto` with `lang="de"` on any element containing a German term — the browser needs the language attribute to apply German hyphenation patterns, and getting this wrong is the most common cause of broken layout in bilingual German UI. Wrap German terms in `<span lang="de">` even mid-English-sentence.

### The gloss pattern

One pattern, used identically in answers, item pages and checklists: the German term in `--ink` with a dotted underline, the English gloss immediately after in parentheses in `--ink-2`, first occurrence per screen only.

> Apply for <span lang="de">Elterngeld</span> (parental allowance) at your <span lang="de">Elterngeldstelle</span> (the state office that decides it).

Tap-to-reveal was the alternative and it's worse here: it hides exactly the word the user needs when they are standing at a counter, and it doesn't survive printing. The gloss strings come from `glossary.de-en.yaml`, so the word the retriever matched and the word the user reads are guaranteed to be the same.

## 4. Layout

Mobile-first at 380px, single column, one max-width of 560px on larger screens — this is a phone product used in waiting rooms, and a desktop breakpoint that spreads content into two columns would break the timeline metaphor.

```
┌──────────────────────────────────────┐
│  Week 32 · due 15 Nov                │   header: state, not branding
│  ────────────────────────────────    │
│  ┌────────────────────────────────┐  │
│  │ Do next                        │  │   the only filled card
│  │ 1 Register at the hospital     │  │
│  │ 2 Tell your employer …         │  │
│  └────────────────────────────────┘  │
│                                      │
│  German  Consular                    │   legend, two words
│                                      │
│  4 Oct  │● Start looking for a …     │   gutter │ rail │ content
│         │  done                      │
│         │                            │
│ ━━━━━━━━━━ today · week 32 ━━━━━━━━━ │   the one bold moment
│         │                            │
│ 12 Oct  │● Register at the hospital  │
│         │  in 9 days                 │
│ 15 Nov  │◌ Register the birth        │
│         │  estimated · 1 week after  │
└──────────────────────────────────────┘
```

The 56px date gutter with tabular figures is the single structural decision that makes this feel like a deadline instrument rather than a task list. Dates sit in their own column and align; the eye scans one axis. The rail is a 1px `--rule` line with a filled dot for confirmed dates and a hollow dot for estimated ones.

The today band is the only full-bleed element and the only place with a 2px rule. It is what a person looks for first when they open the app, and it answers "where am I" before they read a word.

## 5. Components

**Item row.** Date in the gutter, dot on the rail, title, one metadata line. The metadata line is the whole trust mechanism compressed: `in 9 days · German track · estimated from your due date`. Consular items carry a 3px `--in` left border on the content block.

**States.** Done: `--done` text, dot hollow, no strikethrough (a strikethrough on "Register the birth" reads badly), the metadata line reading `Marked done · …` and no chip. **Done means the reader marked it done, never that time has passed** — it is a profile fact, not a status the engine derives (ADR-072). An item whose deadline has passed without being marked is **overdue**, and shows the red chip; nothing greys itself with age. The control that sets it lives on the item page, never on a row. Current: `--surface` card with a 1px `--de` or `--in` border. Urgent: amber chip with the day count, at deadline − 14. Overdue: red chip reading "was due 3 days ago" — a number, never an exclamation mark. Estimated: hollow dot plus the word, and a dashed rather than solid left border.

**Source chip.** `BEEG §7(1)` in Plex Mono, followed by `checked 12 Aug 2026` in `--ink-3`, the whole thing a link to the official page. Loud rather than quiet: your survey found a respondent who trusts only official sources, so the citation is not an afterthought to be revealed on tap, it is the reason the answer is believable. One chip per claim, inline at the end of the sentence it supports.

**Answer card.** White surface, no border. Answer text, then the source chips, then a jurisdiction line (`This applies in Hessen`), then the short disclaimer. Deflection and refusal cards are visually distinct but not alarming: a `--rule` left border, `--ink-2` body, no colour. A medical deflection styled in red would make an anxious person feel they'd done something wrong.

**Wait state.** A three-line skeleton at the answer's position with the text "Checking the official sources". Not streaming: your own rule says nothing renders without a validated citation, and streaming means rendering unvalidated text. A three-second honest wait that ends in a cited answer is better for this product than a fast wait that ends in a retraction.

**Print.** Checklists print. `@media print`: drop the chrome, keep the source chips and as-of dates, expand link URLs after the link text, force the German term and its gloss onto the same line. Someone will hand this to a clerk.

## 6. Motion

**The brochure may move. The instrument may not.** (Amended 2026-11-18, ADR-086.)

Motion is permitted on `/` before any due date has been entered. `/` is the only screen in the
product whose job is *"this is for me"* rather than *"this is accurate"*: nothing on it is counted
from a due date, nothing on it cites a statute, and nobody acts on it. Warmth and a cartoon
register are allowed there, and stop at the CTA.

Everywhere else the original rule stands unchanged. `/timeline`, `/item/[id]`, `/birth`, `/ask` and
`/share/[token]` have **one** transition: the birth-date diff on F2b, where the dates that changed
animate from old value to new over 400ms. That interaction is the product proving it works, so it
earns the motion budget. Nothing else moves.

**Control feedback is not motion.** Amended 2026-11-18. A button answering the pointer or the
thumb that is on it — hover, pressed, focus — within 160ms is feedback, not decoration: it never
starts on its own initiative, and its absence is a defect rather than restraint. Hover rules sit
behind `@media (hover: hover)`, because on a touch screen `:hover` sticks after the tap and leaves
the last control pressed. There are still **no route transitions anywhere**.

`prefers-reduced-motion` replaces the diff with a static before/after, collapses the landing
sequence to its held final frame, and removes the control feedback above with it.

This is a fence, not a repeal, and it is enforced rather than trusted: every animated selector for
the landing is scoped under `.landing`, and `tests/ui/landing.test.ts` fails if one escapes — the
fence is otherwise one `className` away from leaking onto the screen a frightened person reads for
a date.

## 7. Voice

Sentence case everywhere, no title case, no all-caps labels. Buttons name their effect: "Save the birth date", not "Submit". The same action keeps its name across screens.

Never soften a deadline and never dramatise one. "Applications more than three months after the birth lose whole months of payment" is the right register; "Don't miss out!" and "URGENT" are both wrong.

Empty and error states give direction, not mood. No answer found: "We couldn't find this in the official sources we cover. The <span lang="de">Elterngeldstelle</span> answers this by phone." Offline: "Your timeline is saved on this phone and still works. Questions need a connection."
