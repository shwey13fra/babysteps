# Landing sequence and the stork — design, 2026-11-17

**Status: AGREED IN SHAPE, NOT BUILT. No file under `app/` or `lib/` has been touched.**
Implementation starts in a later session, after this document is approved and more changes are
folded in. The human has said explicitly that more changes are coming.

Prototype: `docs/prototypes/landing-stork.html` — open it in a browser. It is the specification
for the motion; the numbers below are read off it, not invented.

---

## 1. Intent

`/` is one screen doing three jobs at once: the promise, the boundary ("what this is not"), and
the entry to the seven questions. The human's words were **"all in one page is too much clustered
and clumsy."** Splitting it gives each job a moment, and gives the product the one thing a
text-only landing cannot do: say *this is about your baby* before a word is read.

**Why now.** The product is deployed and functional; what is unproven is whether a tired parent
reading in a second language chooses to start. That is a first-impression problem, and it is the
last thing between here and the beta invite.

## 2. Goals

- Three screens, in order: **the promise → what it does not do → question 1 of 7.**
- A single-play animated hero that states the problem rather than decorating the page.
- The boundary ("does not fill forms, does not contact offices, does not tell you what you are
  entitled to") gets its own screen instead of being a paragraph at the bottom of a long one.
- Nothing on the landing may slow the first paint. The measured mobile load is already under 2s
  and must stay there.

## 3. Non-goals

- `/ask` as a chat transcript. **Separate project, separate session.** Mixing it in here blurs both.
- The whole-timeline "Add all dates to calendar" control. Required by Stage G, still missing from
  the UI, tracked separately — `/api/ics` supports it, nothing calls it.
- Any change to `/timeline`, `/item/[id]`, `/birth` or `/ask` visuals.

## 4. Anti-goals — what would make this a failure even if it shipped

- **A parent who cannot act for six seconds.** If the animation gates the button, it has cost us
  the thing it was supposed to win.
- **Warmth leaking past the landing.** `design-system.md §1` is explicit: too warm and it reads as
  a pregnancy blog, and the respondent who trusts only official sources leaves. A cartoon register
  on a statutory deadline is the failure this design was built to avoid.
- **Motion on the instrument.** The timeline and the answers must stay still.

## 5. Constraints that bind the build

| Constraint | Source | Consequence here |
| --- | --- | --- |
| "One transition… nothing else moves" | `design-system.md §6` | **This design amends §6** — see §8 below. Not yet applied. |
| Cool paper, no "AI house style" | `design-system.md §2` | Palette is existing tokens only. Nothing new invented. |
| Mobile-first at 380px, 44px targets | `design-system.md §4` | Next is 48px tall, full width, and never moves after it lands. |
| Self-hosted fonts, no Google domain | legal pack | The prototype uses system fonts as a stand-in; the build uses the existing `next/font/local` setup. |
| Under 2s load | PRD M1 / Stage F | Hero is inline SVG + CSS. **No Lottie, no video, no image file, no new dependency.** |
| `prefers-reduced-motion` | `design-system.md §6` | The whole sequence collapses to its final held frame. Already implemented in the prototype. |

## 6. The sequence, as agreed

Total **6.0 seconds** to the button, measured from the animation's own clock
(`fadeUp` on `.next`: delay 5400ms + duration 600ms, state `finished`).

| Beat | Time | What happens |
| --- | --- | --- |
| 1 Carrying | 0 – 1.8s | Stork enters decelerating, **one** baby in a cloth sling slung from the beak. Wings flap out of phase; the sling swings a half-beat behind. |
| 2 Drops it | 1.8s | Sling and baby leave together. **The beak is empty for the rest of the flight.** The stork rises slightly, lighter. |
| 3 Out of frame | 1.8 – 2.9s | The baby falls under gravity easing, drifting forward with the stork's momentum, fading as it leaves the bottom of the frame. It is not seen again. |
| 4 Paperwork springs | 2.9 – 4.1s | Eight pieces of officialdom spring out of the floor, 70ms apart — squash on launch, overshoot, two decaying bounces, settle. |
| 5 …and disappears | 4.2 – 4.9s | They fade out completely over 700ms, drifting up. The sky is empty for a beat. |
| 6 BabySteps · Next | 4.8 – 6.0s | A white sheet rises from the bottom. The wordmark comes up 16px from weight 300 and open letter-spacing, landing at 700 and normal spacing. Then the tagline, then **Next**, then the step dots. All hold. |

**The empty beat between 5 and 6 is deliberate.** It is what makes the wordmark land rather than
arrive in a crowd.

### The drawing

Flat vector in the existing palette, every corner removed by stroking each shape in its own fill
with round joins. White body, `--in` near wing, `--ink` far wing, amber beak and trailing legs,
`--in-soft` sky with white clouds drifting in parallax.

**The eiderdown is two panels, `--de` and `--in`** — the German track and the consular track. The
baby arrives wrapped in both jurisdictions. It reads as a quilt to anyone who does not know.
*This is the author's addition, not the human's instruction; it is the first thing to cut if the
picture feels too clever.*

### Provenance, and the line that must not be crossed

The motion reference is **studio&more's "Bird animation PDQ"** on Dribbble, supplied by the human.
The style is followed; **the artwork is ours, drawn from scratch in our tokens.** A style is not
ownable, a commissioned illustration is, and this repo goes public. If a closer match to that
exact bird is wanted, the honest routes are commissioning that studio or briefing an illustrator
with the link — not tracing the asset.

## 7. The three screens

1. **Promise.** Hero sequence, wordmark, "Every deadline. Both countries. In English. Sourced.",
   Next, "No account, no e-mail. About two minutes.", step dots.
2. **Boundary.** "What it does not do" — does not fill in any form, does not contact an office on
   your behalf, does not tell you what you are entitled to or how much. Then: *it gives you the
   rule, the date, and the office that decides.* Next and Back.
3. **Question 1 of 7.** "When is the baby due?", with the line that every date is counted from it
   and that the real birth date is told to us later.

Screen 3 either begins `/intake` or hands straight to it. **Not decided.** See §10.

## 8. What this amends, and what it needs from the human

**`design-system.md §6` currently says one transition exists and nothing else moves.** This design
breaks that, and the proposed replacement is a fence rather than a repeal:

> **The brochure may move. The instrument may not.** Motion is permitted on `/` before any due
> date has been entered. `/timeline`, `/item/[id]`, `/birth` and `/ask` keep the single
> birth-date-diff transition and nothing more.

Same fence for register: warmth and a cartoon stork are right on the landing, which is the one
screen whose job is "this is for me" rather than "this is accurate", and must not leak past the
CTA.

**This needs an explicit ruling and an ADR before any code.** It also sits against the human's own
Stage G note, which calls Google's stork-and-teddy-bear illustration *"exactly the register
mismatch this design works to avoid."* Overriding that is the human's call, made knowingly.

## 9. The cost nobody has paid yet

**Six seconds is still six seconds.** Two mitigations are in the prototype and both must survive
into the build:

- **A tap anywhere skips to the final held frame.** Already working.
- **Seen once, then never again.** A returning visitor lands on the held frame with no animation
  at all. Not yet built — needs a persistence decision (localStorage is the obvious one, and it is
  per-device, which is acceptable for a cosmetic preference and raises no consent question because
  nothing identifying is stored).

## 10. Left to the builder, and open

- **Does screen 3 own question 1, or redirect to `/intake`?** `/intake` is the one flow tested end
  to end on a device; moving its first question is the only part of this design with real
  regression risk. Recommendation: screen 3 hands off, and `/intake` is not restructured.
- **Route shape.** Three screens on one route with client state, or three routes. One route keeps
  the back button sane and prevents anyone deep-linking into the middle of a pitch.
- **Where the sequence code lives.** A single client component with the SVG inline; no new
  dependency either way.
- **Tests.** At minimum: the reduced-motion path renders the final state; the skip control reaches
  the final state; `.next` exists and is reachable without waiting. A mutation must turn each red
  before it counts as green — CLAUDE.md rule 16, and three gates have already been caught failing
  open.

## 11. Still queued behind this, unrelated to the landing

From the Stage F/G list, unchanged by today: the calendar import and free/busy check on a laptop,
the four DPA acceptance dates, the Supabase project-ref match, securityheaders.com, the cookie and
font checks in DevTools, the Vercel Analytics plan question, and the ruling on publishing
`knowledge/`.
