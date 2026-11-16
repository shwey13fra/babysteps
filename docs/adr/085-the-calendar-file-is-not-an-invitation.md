# ADR-085 — The calendar file is not an invitation

**Date:** 2026-11-16 · **Status:** accepted · **Stage F**

## Context

Stage F put the product on a real phone and the first attempt failed. A parent downloaded an
`.ics`, mailed it to themselves, opened it from mail — **and nothing happened.** The file displays
and stays displayed.

**The file is not at fault.** Measured against the deployed origin before anything was theorised:

```
bytes 1772 · CRLF throughout · lone LF 0 · lone CR 0
longest line 75 octets (RFC 5545 limit 75) · lines over the limit 0
VCALENDAR / VEVENT / VALARM — every required property present and well formed
```

Two causes, both outside our bytes:

1. The file carried `METHOD:PUBLISH` and had **no `ORGANIZER` and no `ATTENDEE`**. `METHOD` belongs
   to **iTIP (RFC 5546)**, the scheduling protocol — it marks a file as a *message* between an
   organiser and attendees. A client that reads it treats the file as scheduling traffic and looks
   for parties that are not there.
2. **Google Calendar's import is a desktop flow.** There is no reliable path from tapping an
   attachment on a phone.

**Why this is not cosmetic.** The ruling of 2026-11-15 chose *no reminder loop in the beta*, on the
stated grounds that **the calendar is the reminder** — the parent's own app notifies them better
than we would. That holds only if the file reaches a calendar. On Android with Gmail it does not,
and it fails **silently**: the file downloads, the mail arrives, the tap does nothing, nobody is
told. The same shape as ADR-084 — a promise that breaks one layer past where our code can see it.

## Decision

**1. No `METHOD` property.** RFC 5545 §3.7.2 makes it optional. This file names no organiser and
invites nobody, because a statutory deadline is not a meeting, so declaring an iTIP method was
wrong on its own terms. Without it the file is an ordinary calendar entry to be imported, which is
what it has always been.

**2. One line of UI guidance** under the button, saying where the file goes: open it from Mail on
iPhone, or add it on a computer in Google Calendar. Direction, not mood (design system §7).

**3. The "Add to Google Calendar" link is deferred to Phase 7**, to be decided together with the
e-mail reminder loop. It is the better mobile experience — one tap — but the event text travels in
the URL, and what falls off a truncated URL is the **tail**: the deadline-kind sentence and the
disclaimer. That is a rule 12 and legal-pack exposure, not a cosmetic one. If reminders arrive by
e-mail, the calendar link stops being load-bearing and the risk is not worth taking.

## What is NOT claimed

**That removing `METHOD` fixes Gmail.** It is not established. The evidence for Gmail's behaviour
is vendor documentation and forum reports, not Google's own, and no measurement was taken on a
device. `METHOD` is removed because it was an incorrect declaration; the import problem is only
what made anyone look at it.

**The import path must still be tested on a real phone.** Until then the UI guidance is what the
product actually relies on.

## Consequence

`tests/ics/calendar.test.ts` gains five assertions. There had been **no test for `METHOD` at all** —
one line wrote it and nothing checked it, so neither its removal nor its return would have been
noticed. The matcher was mutation-tested: restoring `METHOD:PUBLISH` turns it red.
