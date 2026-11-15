# ADR-080 — One alarm, because the clients' defaults are accidental

**Date:** 2026-11-15 · **Status:** accepted · **Human ruling:** add one VALARM, 09:00, window-open day

## Context

The beta ships with **no reminder loop** (ruling 2026-11-15, option B), so the calendar export *is*
the reminder — it is what carries M2. The "Add to calendar" button deliberately promises nothing,
and until now the file carried **no `VALARM`** either, on the reasoning that the parent's own
calendar would handle it.

**The device check measured what that actually produces, and the two engines disagreed:**

| Client | What the imported event did |
| --- | --- |
| Apple Calendar (iOS) | `Alert: None` — no notification at all |
| Google Calendar | the account default: **e-mail at 11:30pm the night before**, plus a popup |

Neither is ours. One platform reminds nobody; the other sends an e-mail at half past eleven at
night about an office that opens at eight. **An absence was being mistaken for a design.** With no
reminder loop behind it, leaving the one reminder a parent gets to each client's defaults is not a
neutral choice — it is the feature failing silently on one platform and arriving uselessly on the
other.

## Decision

**Exactly one `VALARM` per event, `ACTION:DISPLAY`, at 09:00 local on the day the window opens.**

1. **One, never a cascade.** Twelve events each firing twice is how a parent mutes the whole
   calendar, and a muted calendar reminds nobody of anything. Asserted: `BEGIN:VALARM` count equals
   `BEGIN:VEVENT` count.
2. **Window-open, not the deadline.** `keyDate` is the deadline where there is one, and an alert on
   the morning of the deadline announces that it is already too late to plan. The window-open day
   is the first day the step can actually be done. Expressed as hours from `DTSTART` — midnight
   local on the event's own all-day date — so it lands at 09:00 in the reader's timezone without
   the file ever naming one.
3. **09:00, not 08:00.** Offices are not open yet at eight.
4. **It names the thing and stops.** No countdown, no consequence, no urgency vocabulary — the same
   register as every other surface. A matcher asserts the forbidden words never appear, and a
   **negative control** proves the matcher can still fail (rule 16).
5. **An estimated date says so in the alert itself:** *"… — this date is estimated and will move
   when the birth is recorded."* An alert that fires confidently on a guessed date spends the
   parent's trust on arithmetic we have already told them is provisional.
6. **Rules 12 and 13 hold inside the alarm.** An advisory item's alert never reads as statutory and
   never states an entitlement, amount or outcome — asserted across every rule, each with a control.

## Consequence

The reminder is now the same on both platforms and we chose it. The button copy does not change: it
still says "Add to calendar" and promises no reminders, because what it hands over is a file, and
the file's contents are described where the parent can see them.

**A known limit, stated rather than discovered later:** an alarm whose moment has already passed at
import time will not fire. A parent importing in month seven gets no alert for windows that opened
in month three. That is the right behaviour — a reminder for a window already open is not news, and
the timeline already says *"Window has opened — check if this is done"* — but it does mean the
alarm is useful mainly for steps still ahead, which is what the beta invite should say.

**On the method:** this was not reasoned from documentation. The decision rests on two screenshots
of two real calendars, and the documentation would have told us neither.
