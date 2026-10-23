# Consular curation worklist

What a human has to read in a browser so the consular answer track stops being mute.
Context: ADR-019. Schema and invariants: `lib/rag/consular.ts`. Destination: `data/consular/india.yaml`.

I cannot do this part. Frankfurt serves `Disallow: /`, indiacode.nic.in answers our client 403,
and spoofing past either is circumvention we have refused twice. A person opening the page in a
normal browser is not our crawler and is not bound by our robots policy.

## How to hand me the content

For each item below, paste me the passage and these five facts. I write the YAML, the loader
validates it, and the tests run:

| field | what it is |
| --- | --- |
| `source_url` | the exact page you read, not the site root |
| `source_title` | the page's own title |
| `checked_on` | the date you read it, today's date |
| `checked_by` | your name or handle |
| `text_en` | the passage, as close to verbatim as you can — quote it, don't summarise |

`review_after` I set to `checked_on + 90 days`, the ceiling the loader enforces. `authority_en`
I fill from the page. Do not paraphrase to make a passage tidier: the whole point is that the
entry says what the page says, and a tidied quote is an unsourced claim wearing a quote's clothes.

## The items, in priority order

### 1. Birth registration deadline — closes golden row A-24
The one-year rule and what happens after a year. A-24 currently asserts: registration at the
mission within one year of birth, and after one year registration requires permission of the
Central Government.

- **Citizenship Act 1955 §4(1) proviso** — the statutory source. `indiacode.nic.in` refuses our
  client (robots 403). Read it there in a browser, or in any official PDF of the Act, and paste
  the proviso verbatim.
- **Your mission's birth-registration page** — Frankfurt if you are in Hessen, Berlin otherwise.
  The form, the fee, the appointment route, and whether the German birth certificate must be
  apostilled or translated.

### 2. Minor's passport procedure — closes golden row A-26
A-26 asserts: birth registered with the mission first; German birth certificate; parents'
passports and residence permits; application through the mission's appointment channel.

- Your mission's page for a **minor's first passport**, including whether registration genuinely
  must precede the passport application, and which outsourced service provider (if any) handles
  the appointment. Name the provider if the page names it.
- **Do not** paste processing times. A-26's `must_not_contain` forbids promises about them, and
  they are the most volatile thing on the page.

### 3. Which mission covers which Bundesland
Needed so an answer can name the right office rather than "an Indian mission". Frankfurt's
jurisdiction list and Berlin's, from their own pages.

### 4. A current URL for the Berlin mission
`indianembassyberlin.gov.in` returned robots 404 once and a network error minutes later; its
content path 404s. Carried from the previous session. One confirmed working URL settles it.

## What not to bring

- **No processing times, fee amounts that are not on the page, or "they usually ask for…".**
  Volatile operational state stays out of sourced data (past-mistakes 2026-10-23).
- **No statement about what this family will get.** Rule 13. State the rule, name the office.
- **Nothing from a forum, a blog, or an agent's website.** If the mission does not say it, we
  do not cite it.
