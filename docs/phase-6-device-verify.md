# Phase 6 VERIFY — the three items that need a device

Nine of the thirteen Phase 6 VERIFY items are machine-checkable and pass. Three need a human with a
real device, because the thing being measured is a stopwatch, a sheet of paper, and a score a
browser computes about a rendered page. This is the runbook for those three.

**It is written so you do not have to read any code.** Each item says what to do, what it should
show, and — the part that matters — what *wrong* looks like, so you can tell a defect from
something merely unfamiliar.

Record the three results and hand them back. `phase-6-green` is not tagged until they are in.

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

## Item 12 — print preview of an item page

**Primary page:** `http://localhost:3000/item/standesamt_birth_registration` on this machine, then
Ctrl-P. This is the sheet a parent would actually hand to someone: the hard, statutory one.

**Second page, 30 seconds more:** `http://localhost:3000/item/vaterschaftsanerkennung`. It carries
the long German compound beside its English gloss, which is the one thing the print rules can break.
On screen it reads `15 Nov · counted from your due date` with an amber **"in 5 days"** chip and the
header label **"Practice, not law"** — that label is rule 12 doing its job: this one is not a legal
deadline and may never be described as one, on screen or on paper.

The item page needs a profile in *this browser's* storage to show a date. If you have not done
intake on this machine, run through `/intake` here once with the same seven answers.

**Also mark the Standesamt page done before printing** — tap **"Mark this done"** — so the preview
shows the new state. Tap **"Mark this not done"** afterwards if you want it back.

### What SHOULD appear in the preview

- The **title**, the **date line** — with these seven answers and no birth recorded it reads
  **`22 Nov · Estimated · counted from the birth`** — the **consequence** paragraph, and the
  **"Take with you" checklist** (four documents, each with a box, none split across a page break).
- The **source chip** `PStG §18`, boxed, followed by **`not yet checked by us`** and **its full URL
  printed after it in brackets**. The "not yet checked" is **correct, not a defect**: that rule's
  `verified_on` is null and the product says so rather than filling in a date it does not have.
  The URL is the reason the sheet is worth handing over — the clerk can check it.
- The **"Statutory deadline"** label and the sentence naming who decides.
- **"Marked done"**, in black — not the on-screen grey.
- The **disclaimer footer**, with its link URLs expanded the same way.

### What should NOT appear

- The **"Mark this done" / "Mark this not done" button**. A control on paper is noise.
- The **"Add to calendar — coming with reminders"** button, for the same reason.
- The dark page header strip, the timeline chrome, the back link's surrounding furniture.
- **Any greyed-out, unreadable text.** Everything on paper should be black or near-black.

### What wrong looks like

- A German term and its English gloss **split across two lines** — `Vaterschafts-` / `anerkennung
  (acknowledgement of paternity)`. The rule that forbids this is present in the CSS; whether it
  holds in your browser's preview is exactly what has never been seen.
- A checklist item broken across the page boundary.
- The source URL missing — then the sheet is a claim with no provenance, which is the one thing
  this page may not be.
- "Marked done" printing in pale grey. I corrected that rule today and have not seen it on paper.

---

## Item 13 — Lighthouse mobile accessibility ≥ 90

**Use the Chrome DevTools Lighthouse panel, not the CLI, for `/timeline`.** The CLI launches a clean
Chrome profile with empty storage, and `/timeline` sends a visitor with no saved answers to
`/intake` — you would score the intake page and not know it.

### The routes, and how to run each

| Route | How |
|---|---|
| `/` | CLI or panel |
| `/how-it-works` | CLI or panel |
| `/intake` | CLI or panel |
| `/item/standesamt_birth_registration` | CLI or panel (its date needs a profile; the audit does not) |
| `/timeline` | **Panel only**, with the profile in storage |
| `/ask` | Panel (it is the Q&A screen and wants a profile) |

**Panel:** open the page in Chrome → F12 → **Lighthouse** → Mode **Navigation**, Device **Mobile**,
Categories **Accessibility** only → **UNTICK "Clear storage"** → Analyze page load.

> Ticking "Clear storage" is the same trap as the CLI: it wipes the profile and audits the intake
> redirect instead of the timeline.

**CLI, for the four routes that need no profile:**

```
npx lighthouse http://localhost:3000/intake --only-categories=accessibility --form-factor=mobile --screenEmulation.mobile --chrome-flags="--headless=new" --output=html --output-path=./lighthouse-intake.html
```

`npx` downloads Lighthouse on first use (~50 MB, one-off, not a project dependency). The DevTools
panel needs no install at all and is the better tool here.

### What I expect it to show, including the bit I expect to fail

**Most audits should pass.** Every form control has a label, touch targets are at the 44px floor,
the focus ring is explicit, the progress indicator carries its ARIA attributes, and `lang` is set —
all verified in the markup.

**I expect the contrast audit to flag two greys, and that is the most likely reason a route lands
below 90.** Measured against the page background `#f4f7f7`:

| Token | Used for | Ratio | WCAG AA needs |
|---|---|---|---|
| `--ink-3` `#7b8f96` | metadata lines, gutter notes, lede text | **3.14 : 1** | 4.5 : 1 |
| `--done` `#93a6ab` | a row marked done | **2.35 : 1** | 4.5 : 1 |

So: **if Lighthouse reports "Background and foreground colors do not have a sufficient contrast
ratio", that is this, it is real, and it is a design-system decision rather than a bug in a
screen.** The calm-clinical palette chose those greys on purpose and they are below AA for text
under 18.7px.

If you want them fixed, the minimal change that keeps the hue and reaches 4.5:1 is
`--ink-3: #62747b` and `--done: #60757b`. That is a docs/design-system.md §2 change and I will not
make it without your ruling — it touches every quiet line in the product.

**Report per route: the score, and the names of any audits that failed.** A score alone cannot tell
us whether 88 means the greys or something I have not thought of.

---

## What to hand back

1. **Intake:** the stopwatch figure, the phone, and which question cost the most time.
2. **Print:** pass/fail, and a photo or PDF if anything printed wrong.
3. **Lighthouse:** score per route plus failing audit names.

With those three, `phase-6-green` goes on, and Phase 7 starts.
