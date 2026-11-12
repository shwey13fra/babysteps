# Phase 6 VERIFY — the item that still needs a device

**Updated 2026-11-12.** Items 12 and 13 were closed by measurement on this machine and are recorded
below rather than asked of you. **Item 11, the stopwatch, is the only one left**, because it is the
one that measures a parent rather than a page.

`phase-6-green` is not tagged until the stopwatch figure is in.

---

## Closed on 2026-11-12 — item 13, accessibility

axe-core 4.13.0 — the engine Lighthouse's accessibility category is built from — run against eight
routes at a true 412px viewport, with a profile in storage so `/timeline` rendered rather than
redirecting to `/intake`.

**Before:** `color-contrast` was the only violation on any route — 4 to 28 nodes per route, and
nothing else: no label, ARIA, `lang`, focus, heading or name-role-value failure anywhere, and no
incomplete audits. Two tokens accounted for every node. `--ink-3` measured **3.13:1** and `--done`
**2.35:1**, confirming the 2026-11-10 prediction on rendered pages rather than on arithmetic.

**After** the ADR-073 correction (`--ink-3` `#62747B`, `--done` `#5C7077`): **zero violations on all
eight routes.** The runbook's proposed `--done: #60757B` was not used — it computes to exactly
4.50:1, with no rounding headroom.

The consequence worth knowing: `--done` is now within one step of `--ink-3`, so **colour no longer
distinguishes a done row.** The hollow dot and the dropped chip do, which is what ADR-072 had
already made load-bearing.

## Closed on 2026-11-12 — item 12, print

Both item pages were rendered with every `@media print` rule forced on, at 794px (A4 at 96dpi), and
every computed colour and geometry on the sheet was measured.

| Checked | Result |
|---|---|
| "Mark this done" / "Add to calendar" buttons | absent from the sheet |
| Page header strip, nav, dots, legend, do-next | absent |
| Source chip | boxed, with its full URL printed after it in brackets |
| "not yet checked by us" | **was pale grey — fixed, now black** |
| Disclaimer footer link | **was pale grey — fixed, now black**, URL expanded |
| "Marked done" | black |
| Checklist | 4 items, every one `break-inside: avoid` |
| German compound beside its gloss | `.term` is `white-space: nowrap`; cannot split |
| Sheet height | **737px and 706px at 794px wide — under one A4 page** |

Because each sheet is under one page, nothing can straddle a page break, which is what the
pagination question was really asking.

**One expectation in the original runbook was wrong.** It said the print preview should show the
**"Statutory deadline"** label. It does not, and should not: that label lives inside `.head`, which
print hides. What carries the deadline kind on paper is the full `.kindline` sentence — "This date
is set by statute. PStG §18 requires…", "This is common practice rather than a rule in law…" — in
black. Rule 12 is satisfied by the sentence, which says more than the label did.

Three things print in colour rather than black, and all three are deliberate: the consequence
paragraph in `--ink-2` (7.0:1 on white), the amber countdown chip, and the teal "Back to the
timeline" link.

---


## Before you start — one server, two ways to reach it

```
cd C:\Users\shwet\Babysteps
npm run build
npm start
```

Use the **production build**, not `npm run dev`. `next dev` compiles each route the first time it is
asked for, which adds seconds to a page load that have nothing to do with the product. M1 is a
stopwatch target; measuring the compiler would be measuring the wrong thing.

- **On this machine:** `http://localhost:3000`
- **From your phone, same Wi-Fi:** `http://192.168.0.26:3000` — the address `next dev` printed as
  "Network" today. If the phone cannot reach it, it is almost always Windows Firewall prompting on
  first run, or the phone sitting on a guest network.

> A dev server from this session may still be listening on :3000. Ctrl-C it in its terminal before
> `npm start`, or the build you measure will not be the one you just made.

---

## Item 11 — stopwatched intake, under 2 minutes, on a real phone

**URL:** `http://192.168.0.26:3000/intake` on the phone.

**Before the first run:** this phone may already hold answers from earlier testing. The flow always
starts at question 1 either way, so you can just run it — the only effect is that finishing
overwrites the stored profile. Do **not** use private browsing: this product refuses to save when
site data is blocked, and you would hit a warning screen at the end that is correct behaviour but
not what you are trying to measure.

**Load the page once before you start the clock.** First load fetches the fonts. A parent on their
second visit has them cached; you want to measure the parent, not the download.

**Start the stopwatch when you tap into the due-date field. Stop it when the timeline draws.**

The seven answers, in the order the flow asks them:

| # | Question | Answer to give |
|---|---|---|
| 1 | When is the baby due? | **2026-11-15** (type it or use the picker) |
| 2 | Which state will the birth be registered in? | **Hessen** |
| 3 | Which city? | **Frankfurt am Main** |
| 4 | Which passports do you and your partner hold? | **Both Indian** |
| 5 | Are you employed? | **Employed** |
| 6 | Are you and your partner married? | **Not married** |
| 7 | Is this your first child? | **Yes, the first** |

Then a review screen that states the statutory-insurance assumption. Tap **"Show my timeline"**.

### What it should show

- **Under 2 minutes**, and I expect well under: five of the seven are single taps, and only the due
  date and the city need the keyboard. A realistic run is 40–70 seconds. **If it takes more than
  two minutes, the finding is not "slow phone" — note which question ate the time.**
- Seven dots at the top, the current one lit, **filled from question 1** — not empty on the first
  screen. That exact wrong-by-one was a defect here, and it is the kind that reads as a dead screen
  rather than a bug.
- Question 2's answers carry grey notes under them ("Frankfurt, Wiesbaden, Darmstadt and the rest
  of the state"). Question 6's "Not married" says it adds the acknowledgement of paternity.
- The timeline draws on **"Show my timeline"** with no further tap, and the header reads
  **"Week 40 · due 15 November"** with "Hessen · German offices · Indian consulate" under it.

### What wrong looks like

- A keyboard that will not dismiss, or a date field that needs more than one attempt — the due date
  is the one keyboard-heavy screen and is the most likely place to lose the two minutes.
- The warning *"This browser will not let us save your answers"* at the end. **Correct behaviour**
  for private browsing or blocked site data — but it means the run did not measure what we wanted.
  Switch to a normal tab and re-run.
- A visible delay between tapping an answer and the next question. Each screen is local; there is
  nothing to wait for.
- Twelve rows on the timeline is right for these answers. Fewer than ten means something filtered
  wrongly; tell me the count.

---

## What to hand back

The stopwatch figure, the phone, and which question cost the most time.

With that, `phase-6-green` goes on, and Phase 7 starts.
