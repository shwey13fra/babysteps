# Landing build, and the pass over the shipped routes — plan, 2026-11-18

**Status: APPROVED AND BUILT, 2026-11-18.** All three rulings came back as recommended (R1 and R2
yes, R3 yes), and Stages 1, 2 and 3 are complete and green: 981 tests, typecheck clean, lint clean,
production build passing, `/` still prerendered static. Stage 4 was not taken. ADR-086 and ADR-087
were written; `design-system.md` §2, §2b and §6 were amended. See the session journal of the same
date for what the build found that this plan did not predict.
Sits on top of `docs/specs/2026-11-17-landing-sequence-design.md`, which is the design; this is the
build order for it, plus the scope question the human asked about the routes already shipped.

Raised by the human invoking the UI/UX and frontend-design skills with two asks: **build the
landing**, and **redo the shipped routes**. The second ask is the one this plan argues with.

---

## 1. What I checked before writing this

| Claim | Evidence |
| --- | --- |
| The shipped routes implement `design-system.md` faithfully | `app/globals.css` is 1062 lines of tokens and components, each block commented with the § it came from |
| Touch targets already clear 44px | `app/globals.css:201` `.btn-primary`, `:213` `.btn-ghost`, `:658` `.choice`, `:696` `.field input`, `:724` `.nav .back` |
| Intake already wires errors to the field | `app/intake/page.tsx:117-123` — `aria-invalid`, `aria-describedby`, `id="intake-error"` |
| Focus is visible and never removed | `app/globals.css:270-274` |
| Reduced motion is honoured globally | `app/globals.css:279-289` |
| **Dark mode does not exist** | `grep` for `prefers-color-scheme` and `color-scheme` across `app/globals.css` and `app/layout.tsx` returns no match |
| **The prototype's skip is mouse-only** | `docs/prototypes/landing-stork.html:300` — a `click` listener on a `div`. No keyboard path, no accessible name, no visible control |
| The footer disclaimer renders on `/` too | `app/layout.tsx:48-58` — it is in the root layout, under every route including the new landing |

Two UX rules from the skill's database bear directly on the landing, both severity **High**:
*Auto-Rotating Content Controls* ("auto-advancing content needs a user-operable stop control") and
*Excessive Motion* ("animate 1–2 key elements per view"). The first is a finding against the
prototype. The second the sequence survives, because the eight paperwork items are one
choreographed object rather than eight independent animations.

The colour-domain search for dark-mode tokens returned **product palettes for digital signage and
a photography studio — off-target, and not used.** The dark tokens in Stage 2 are derived by hand
from the existing hues and must be measured, not asserted.

---

## 2. The argument about "redo the shipped routes"

**Recommendation: do not redesign them. Do a defined dark-mode-and-defects pass instead.**

The routes are not weak work. `/timeline`, `/item/[id]`, `/intake`, `/birth`, `/ask` and
`/share/[token]` are a direct, commented implementation of a design system that was authored
deliberately, argued against its own alternatives in §1–§2, and already corrected once under
measurement — ADR-073 darkened `--ink-3` and `--done` after axe-core found 3.13:1 and 2.35:1.
Redesigning them re-opens decisions made with better information than a redesign pass would have,
and it puts a tested flow back into regression risk for a visual preference: `/intake` is the one
flow tested end to end on a device.

What is genuinely missing is narrower, and real:

1. **Dark mode, which does not exist at all.** The root `CLAUDE.md` quality bar names it. The
   Stage F list recorded it "unmeasured", which implied it was built; it is not. A page with no
   `color-scheme` declaration and a hard-coded `#fff` on `.btn-primary` (`globals.css:194`) behaves
   unpredictably when a phone forces dark — which is exactly the phone this product is read on.
2. **The error announcement gap.** `app/intake/page.tsx:102` and `:186` render the error into a
   plain `<span>`. It is correctly associated with the field, but nothing announces it when it
   appears after a press of Continue. The skill's *Focusable Error Summary* rule applies.
3. **The landing is the only route that looks unfinished** — and that is what this plan builds.

If after reading this the human still wants a redesign, that is their call to make knowingly, and
Stage 4 is where it would go. It is written as a separate, optional stage for that reason.

---

## 3. Gate 0 — the ruling, before any code

`2026-11-17-landing-sequence-design.md §8` says in terms that it **needs an explicit ruling and an
ADR before any code**, because it breaks `design-system.md §6` ("one transition… nothing else
moves") and runs against the human's own Stage G note calling a stork-and-teddy-bear illustration
"exactly the register mismatch this design works to avoid."

Three rulings are needed. Nothing below Stage 1 starts without them.

| # | Question | Recommendation |
| --- | --- | --- |
| R1 | Does the motion fence stand — **the brochure may move, the instrument may not**? | Yes. It is a fence, not a repeal, and it keeps §6 intact everywhere the product makes a claim. → **ADR-086** |
| R2 | Does the stork stand, against the Stage G note? | Yes, **on the landing only**, because `/` is the one screen whose job is "this is for me" rather than "this is accurate". The eiderdown's two jurisdiction panels are the first thing to cut if the picture reads as too clever. |
| R3 | Is `design-system.md` amended to carry a **dark** token set? | Yes — as its own §2b, with measured ratios rather than asserted ones. → **ADR-087** |

R3 is separable: the landing can ship without it. R1 and R2 cannot.

---

## 4. Stage 1 — the landing (`/`)

**Open decisions from §10 of the design, resolved here as recommendations.**

- **Screen 3 hands off to `/intake`; `/intake` is not restructured.** The design's own
  recommendation, and the right one: moving its first question is the only part of this work with
  real regression risk.
- **One route, three screens, client state.** Advancing calls `history.pushState`, and a `popstate`
  listener maps the browser Back button onto the in-page Back. Back stays sane, nobody deep-links
  into the middle of a pitch, and there is no server round-trip between screens.
- **`app/page.tsx` stays a Server Component** and keeps its `metadata` export. The sequence lives in
  one client component with the SVG inline. No new dependency.

**Files**

| File | Change |
| --- | --- |
| `app/page.tsx` | Rewritten: metadata plus the sequence component. Stays a Server Component. |
| `app/landing-sequence.tsx` | New. `"use client"`. Three screens, the inline SVG, the skip control, the seen-once check. |
| `app/globals.css` | New appended section in the file's existing commented style. Existing selectors untouched. |
| `app/layout.tsx` | One change only, and only if the footer question below is ruled that way. |
| `tests/ui/landing.test.tsx` | New. Four tests, each with a negative control (rule 16). |

**The footer problem, which the design does not address.** `app/layout.tsx:48-58` puts the legal
disclaimer under every route. Under a cinematic three-screen landing it lands below the hero. The
legal pack requires the disclaimer in the footer of every route and the Impressum within two clicks
of every page, so it **cannot simply be dropped from `/`**. Recommendation: keep it, and give
screen 1 `min-height: 100svh` so the footer sits honestly below the fold instead of being hidden.
**This wants the human's eye rather than my ruling**, and is the part of Stage 1 I would build last.

**The skip control, rewritten from the prototype.** The prototype skips on a click anywhere on a
`div` (`landing-stork.html:300`). The build replaces it with a real `<button>` — visible from t=0,
top-right, 44px, in `--ink-3` so it never competes with the sequence. Click-anywhere stays too; it
costs nothing and tired thumbs use it.

**Seen once, then never again.** `localStorage` key `bs.landing.seen`. A returning visitor gets the
final held frame with no animation. Per-device, cosmetic, nothing identifying stored, so no consent
question — as the design already reasons. The read goes in an effect, never during render, or it
mismatches on hydration.

**Tests — rule 16, a control proving each can still fail, in the same commit:**

1. `prefers-reduced-motion: reduce` renders the final held frame. *Control:* drop the query, assert red.
2. The skip control reaches the final frame **by keyboard**. *Control:* make it a `div` again, assert red.
3. `.next` exists and is reachable without waiting out the clock. *Control:* gate it behind the animation, assert red.
4. With `bs.landing.seen` set, no animation class is applied. *Control:* ignore the key, assert red.

**VERIFY gate — measured, not looked at.** The 2026-11-17 session lost a day to two animations that
rendered something wrong and reported success. The guard is the one that worked the third time:
sample `getComputedStyle().opacity` across the run and read `getAnimations()` for delay and
duration, rather than judging by eye. Specifically: no second baby painted during the carry, the
wings' computed transform actually changes, `.next` reports `finished` at 6.0s, and first paint on
`/` stays under 2s (PRD M1, already met and not to be lost).

---

## 5. Stage 2 — dark mode (gated on R3)

Thirteen tokens need a dark counterpart. This is where the ADR-073 lesson binds: **every pairing is
measured with axe-core on the rendered page before the claim is written down.** Direction only, to
be verified: a cool near-black ground rather than pure black; both track colours lifted enough to
carry 4.5:1 on it; the amber and the red lifted the same way so neither starts to read as a warning
light in the dark. `.btn-primary`'s hard-coded `#fff` (`globals.css:194`) becomes a token, and
`color-scheme` is declared so the browser stops guessing.

Scope: `app/globals.css` and `app/layout.tsx` only. No component markup changes.

---

## 6. Stage 3 — the defects pass

Small, evidenced, no redesign.

- `app/intake/page.tsx:102,186` — the error gets a live region so it is announced when it appears.
  Control: assert the announcement, then remove the role and watch it go red.
- Re-run `npm run typecheck`, `npm test`, `npx vitest run tests/security/posture.test.ts`, and
  axe-core across all eight routes including the new landing, in both colour schemes.

---

## 7. Stage 4 — OPTIONAL, only if the human overrules §2

A redesign of the shipped routes. Deliberately not planned here: it needs its own design session
and its own amendment to `design-system.md`, and planning it inside a build plan is how a scope
lock gets lost. If it is wanted, it gets its own spec.

---

## 8. Order, and what blocks what

```
Gate 0  R1 R2 ──► Stage 1  landing ──┐
                                     ├──► Stage 3  defects ──► commit
        R3    ──► Stage 2  dark mode ┘
```

Stage 2 is independent of Stage 1 and can be dropped without affecting it.

## 9. Changes outside discussed scope

NONE. This document is the only file written.

---

## 10. Amendment, same day — the settle was moving the picture

**Found by the human watching it**, after the suite was green and after every property measurement
in §4's VERIFY gate had passed: *"a stork comes and is just there on the screen — the transitions
are so bad."*

They were right, and the cause was structural rather than cosmetic.

| State | `.l-bird` left |
| --- | --- |
| Last frame the animation paints (t=4649ms) | **1382px** — off-frame; the sky spans 763–1323 |
| `rested`, which the component switches to at t=6.12s | **837px** — mid-sky |

**A 545px jump across a 560px frame.** The stork flew off the right edge, the component settled,
the animation was removed, and the bird snapped back to whatever the static rule said and sat
there. Three things moved on settle, not one: the bird, the `infinite alternate` wings (which stop
at an arbitrary angle, not at the static rule's neutral), and the `infinite` cloud drift.

**Why nothing caught it.** Every check in §4 measured `playing` and measured `rested` — separately.
The defect exists only in the step between them, and no measurement looked at the step. The
property-sampling discipline from 2026-11-17 was followed correctly and was simply pointed at the
wrong pair of things.

### The rule this adds

> **Anything that holds a position after the sequence must hold the same position the static rule
> gives it. Anything that cannot — an `infinite` animation has no final frame — must not animate.**

Enforced in `tests/ui/landing.test.ts`: the `.l-bird` base `transform` and the 100% keyframe of
`l-cross` are parsed out of the stylesheet and compared, the wing keyframes must end at
`rotate(0deg)`, and **no landing selector may declare an `infinite` animation**. Each has a control,
including one proving the two readers are not both returning `null` — two nulls compare equal and
would pass the invariant vacuously.

### What changed in the design

**Corrected the same day, after the human restated the intended sequence.** My first fix made the
stork glide to a stop and STAY in frame, on my own reasoning that an empty sky was a poor resting
image. That was me resolving a conflict by changing the design instead of asking what the design
was. The human's sequence is explicit and was always the intent:

> stork flies in with the baby in the eiderdown → drops it → the dropped baby slowly disappears →
> the paperwork pops up → once it vanishes, BabySteps and the Next button come up. Once the stork
> drops the baby **it flies away out of frame**. Clouds behind the stork, and **when the stork
> goes, the clouds go too.**

So the stork leaves, the sky ends empty, and that empty sky is the correct resting frame — the
invariant is satisfied by moving the STATIC rule to meet the animation, not the other way round.

| What | Before | Now |
| --- | --- | --- |
| `l-cross` duration | 4650ms | **2900ms** — the stork must clear the frame before the paperwork springs at 2950ms, because the order is stork leaves *then* paperwork arrives, not both at once |
| Release point | 38% | **61%** (`RELEASE_AT`), which is 1769ms against the fall's 1775ms delay |
| Exit easing | decelerating | **accelerating** — a thing eases out when arriving and eases in when leaving |
| Clouds | infinite parallax drift | one **finite** linear pass that fades in, drifts behind the stork, and is gone by 3400ms — just after the stork at 2900ms |
| `.l-bird` static rule | mid-sky | **off-frame**, the same value `l-cross` ends on |
| Wing flap | 1162ms x 4 | **725ms x 4 = 2900ms**, exactly the crossing, ending at neutral |

Measured, with the animations paused and scrubbed:

| t | stork | baby in sling | baby falling | clouds | paperwork | wordmark + Next |
| --- | --- | --- | --- | --- | --- | --- |
| 0.6s | in | 1 | 0 | 0.9 | 0 | 0 |
| 1.77s | in | **0** | 0 | 0.9 | 0 | 0 |
| 2.2s | in | 0 | **1** | 0.9 | 0 | 0 |
| 2.9s | **gone** | 0 | 0 | 0.55 | 0 | 0 |
| 3.4s | gone | 0 | 0 | **0** | **1** | 0 |
| 4.88s | gone | 0 | 0 | 0 | **0** | 0 |
| 6.0s | gone | 0 | 0 | 0 | 0 | **1** |

`design-system.md §6`'s "clouds drifting in parallax" still holds — the drift is finite now rather
than endless, which is what lets it land.

**The one consequence to be aware of:** the resting frame is an empty sky, so a returning visitor
and a `prefers-reduced-motion` reader see the violet band with no stork in it. That follows directly
from the stork leaving and is correct, but if it reads as empty the fix is to collapse the sky band
to the 104px it already uses on screens two and three. Not done; it is a two-line change.

---

## 11. Second review pass — centred, blended, and purple

The human watched it in an incognito window and gave five instructions. All five are implemented
and scoped to `.landing`; nothing on `/timeline`, `/item/[id]`, `/intake`, `/birth` or `/ask`
changed.

| Instruction | What changed |
| --- | --- |
| "place everything a bit center" | `.l-sheet` is `text-align: center`, and the scene is centred in the viewport — `.l-sky` is a fixed `min(340px, 46svh)` band rather than a greedy flex child, which had pushed the wordmark onto the bottom edge |
| "let the BabySteps come in to the center as well… blend it slowly" | `l-bolden` no longer slides up from below. It **resolves**: `blur(7px)` and `0.16em` tracking settling to sharp and set, over **1000ms** (was 560ms). A blur settling is what something coming into being looks like; a translate is what a notification looks like |
| "not separately in a white background — blend it" | The white card is gone. `.l-sheet` has no background, no radius and no shadow, and `.landing` is a gradient from `--in-soft` through to `--paper`, so the sky resolves into the page and the footer below is not a seam. `l-rise` is a settle, not a 104% slide |
| "use purple or purplish blue instead of the dark green" | The CTA, the lit progress dot and the focus ring are `--in`; `--on-in` is a new token in both schemes because `--in` is a light violet in dark mode and white on it would be unreadable |
| (same, in the artwork) | The paperwork and the quilt were still `--de`. See below |

### The green I reported gone, and had not

The first sweep for leftover green read `color`, `backgroundColor`, `borderColor` and
`outlineColor`, and returned zero. **SVG paints with `fill` and `stroke`**, so it never looked at
the artwork — the eight pieces of paperwork and the baby's quilt were still the German-track green,
plainly visible in the screenshot. Re-measured including `fill` and `stroke`: now genuinely zero.

The same mistake as `.field .err`, one layer along: a check written against the property you
happened to think of rather than the property that paints.

**The cost:** the quilt's two panels were `--de` and `--in` — the German track and the consular
track, so the baby arrived wrapped in both jurisdictions. Dropping the green drops that reading.
The design had already flagged it as the author's addition and the first thing to cut, so it is
cut; the quilt is two purples now. Say so if it should come back in some other form.

### Also changed, on my own judgement and therefore flagged

The paperwork was **30px and read as specks in a thin line**. It is 42px now, in a shallow arch
rather than a row. Nobody asked for this; it is reversible in one rule.

### Still open

- **The resting frame is an empty sky.** It follows correctly from the stork leaving, but it is a
  large empty band above the wordmark at the end of every viewing, not only for returning visitors.
  Collapsing `.l-sky` to the 104px it already uses on screens two and three is the obvious fix and
  has not been done.
- **The paperwork is SVG, not the prototype's emoji.** Flagged three times, never ruled on.

---

## 12. Third pass — one action colour across the product, and buttons that answer

Two instructions: use the landing's palette everywhere, and make the buttons and transitions
better, against a healthcare landing page by Musemind on Dribbble. Both collided with decisions
taken earlier the same day, so both were put back as questions before any code. The human ruled.

### Ruling 1 — a new accent, the tracks untouched

`--de` is the **German track** and `--in` is the **Indian-consular track**, on every timeline row,
every dot, every legend swatch and the source chips. `design-system.md §2` calls that split the
product's differentiator. Painting actions in either one would make *"this deadline belongs to the
German office"* and *"this is a button"* the same colour.

So the chrome got its own hue: **`--accent`**, used product-wide for buttons, links, focus rings,
selected states and the prompt's left border. Chosen by measurement, not by eye — hue **224°**,
which is **26° off the consular violet** at 250°, and 7.05:1 on `--paper`, 7.59:1 on `--surface`.
Dark is `#8AA6FF`, 23° off the dark scheme's `--in`.

Verified on the rendered timeline: German dot still `rgb(11, 107, 96)`, consular dot still
`rgb(74, 61, 143)`, link and prompt border `rgb(45, 78, 168)`, all three distinct.

The landing's own violet override is **gone** — it briefly had its own CTA colour, and now there is
one action colour everywhere, which is what was asked for. `--on-in` was removed rather than left
as a dead token.

### Ruling 2 — control feedback yes, route transitions no

ADR-086 stands **untouched**: no route transitions anywhere, and the instrument still does not
move. What was added is feedback — hover, pressed and focus — which is a control answering the
pointer or thumb on it within 160ms, never something that starts on its own. `design-system.md §6`
carries that distinction now.

Every hover rule sits behind `@media (hover: hover)`, because on a touch screen `:hover` sticks
after the tap. **One pre-existing rule did not** — `.item h3 a:hover`, from Phase 6, which left the
last-tapped timeline row title underlined. Fixed, and `tests/ui/contrast.test.ts` now brace-counts
the stylesheet and fails on any unguarded `:hover`, with a control proving it can.

### The button look

From the reference: fully-rounded pills, generous padding, soft shadow. The style is followed and
nothing was copied — the same line drawn for the stork.

| | Before | Now |
| --- | --- | --- |
| `.btn-primary` | 10px radius, 44px, no states | **999px pill**, 48px, shadow, hover lift, `scale(0.985)` press |
| `.btn-ghost` | 10px, 44px | pill, 48px, accent border on hover |
| `.choice` | 10px, 44px, no states | 14px (not a pill — it holds two lines), 48px, hover border, press |
| `.field input` | 10px, 44px | 14px, 48px, accent border on focus |

The trailing circular arrow from the reference was **not** taken: it suits a "Book consultation"
but not "Save the birth date", and putting it on every primary button would have it meaning
nothing. Easy to add to forward actions alone if wanted.

### Not done

The paperwork is still SVG rather than the prototype's emoji — flagged four times, never ruled on.

---

## 13. Fourth pass — the arrow, and two defects it uncovered

**Instructed:** replace the written "Back" button with a back arrow in the top-left corner.

Three screens had one — two in `/intake`, one on `/`. They now share `app/back-button.tsx` rather
than three copies of the same inline SVG, which is how two of three end up different by accident.

An icon-only control is the one case where what a sighted person reads and what a screen reader
reads are **entirely separate**, so a missing name is invisible on the rendered page. The component
therefore requires its label rather than defaulting it — `"Back to question 3 of 7"` on intake,
`"Back to the previous screen"` on the landing — hides the chevron with `aria-hidden`, and is 44px
square, which a 22px glyph is nowhere near on its own. `tests/ui/back-button.test.ts` holds all of
that, with controls.

`.topbar` reserves the 48px row even on question one, where there is nothing to go back to, so the
progress bar does not jump between questions. The now-unused `.nav` and `.nav .back` rules were
deleted rather than left behind.

### Defect 1 — the centring was never applied

**Reported as done two passes ago, and it was not.** `.l-sheet` had `text-align: center`, and
`§3` is enforced by `body, p, li, h1, h2, h3, h4 { text-align: left }` — a selector matching those
elements **directly**. A matching rule always beats an inherited value, so the container centred
and every child inside it stayed left. Measured: `.l-sheet` computed `center` while its own `<h1>`
and `<p>` computed `left`.

Fixed by naming the four text elements explicitly. Guarded: the test asserts each of
`.l-wordmark`, `.l-heading`, `.l-body` and `.l-fine` appears in a `text-align: center` rule, plus a
control asserting the global left-align rule that causes the trap still exists — otherwise the
guard would one day pass for the wrong reason.

### Defect 2 — a hydration mismatch on every returning visitor

The Next dev overlay showed **1 Issue**. React: *"some attributes of the server rendered HTML
didn't match the client properties… This won't be patched up"*, on
`data-motion`, server `"playing"` against client `"rested"`.

`/` is prerendered **static**, so the server cannot know whether this browser has seen the
sequence. Passing `hasSeenLanding` straight into `useSyncExternalStore` as the snapshot meant the
client's hydration render disagreed with the HTML for anyone who had.

The snapshot is now a plain "has React finished hydrating" constant — `false` on the server and
during hydration, `true` after — and the preference is consulted on the render *after* hydration,
where differing from the server is the point rather than an error. Overlay back to clean, behaviour
unchanged: with the key set, `data-motion` is still `rested`.

This one was only ever visible in the dev overlay. It would not have shown up in any test, on any
screenshot, or in production.

---

## 14. Fifth pass — a calendar event that told a lie

The human added an event to Google Calendar from the site and sent the screenshot. The import
itself worked: date, Sunday warning, alarm, documents, source, disclaimer all landed. Three
findings, checked against the `.ics` that produced it.

**1. A false statement about money.** The `soft` deadline line hard-coded *"What it costs is money —
months you stop being paid for"* (`lib/ui/item-view.ts`). Written for Elterngeld, rendered on all
four soft rules. On `baby_health_insurance` it is false — `Familienversicherung` is free family
cover, there is no monthly payment — and the rule's own note contradicted it one sentence later in
the same paragraph.

Removed. Nothing was lost: every soft rule already states its own cost in `consequence_en`, two
paragraphs above — "a month you cannot claim later", "lost permanently", "it does delay the cash",
"the bills land on you". The generic line now says only what holds for all four, that the date is
not statutory.

**2. A verbless fragment.** `decides()` produced *"Your Krankenkasse — and the decision in your case
is theirs."* It assumed `authority_en` is a noun phrase; `hebamme_search_start`'s is a whole clause,
which is why the dash was there in the first place. Now two sentences, which reads correctly for
both shapes.

**3. `localhost:3000` in the file — not a bug.** `siteUrlForPersistedFile()` (ADR-084) returns the
alias when `NEXT_PUBLIC_SITE_URL` is set and `null` in production without it, in which case the
link is dropped rather than left dead. Unset locally, which is correct.

**Still to confirm, and not verifiable from here:** that `NEXT_PUBLIC_SITE_URL` is set in Vercel
production. If it is not, every `.ics` ships with no link at all — safe, but silently lesser.

**Tests.** Four tests pinned the old copy and failed, which is what they were for. Updated to keep
their intent, plus a new one asserting the shared line makes **no** payment claim at all, with a
control proving the matcher catches the sentence it was written for.

**Noted, not fixed:** the advisory line is mildly redundant — "This is common practice rather than a
rule in law." followed by the rule's own "Practice, not statute." Pre-existing, cosmetic.
