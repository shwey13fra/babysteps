# ADR-072 — Done is a profile fact, not an engine status

Date: 2026-11-10 · Code: `lib/ui/profile-store.ts`, `lib/ui/timeline-rows.ts`, `app/item/[id]/`

Context: design-system.md §5 specifies a finished item — `--done` text, hollow dot, no
strikethrough — and the PRD §5 calls it "past items greyed with 'check if done' guidance". It was
implemented in Phase 6, keyed off the engine's `past` status, and unit tested. **No profile could
ever produce it.** `deriveStatus` returns `past` only for a rule with no `deadline`, and all twelve
rules carry one. The state was specified, built, tested and unreachable.

The tests passed because they asserted *the renderer handles the state* — they constructed an item
with `status: "past"` and checked the mapping. Nothing asserted the state ever **occurs**.

Human ruling, 2026-11-10: what §5 calls "past" is **done** — user-completed, not time-elapsed. An
item whose deadline passed without completion is **overdue**, which already exists and is correct.
The mockup settles it: the greyed rows read "Marked done", not "this date has passed".

Decision: `completed: string[]` on the **stored record** in `localStorage`, beside the profile.

- **Not a field of `IntakeProfile`.** That schema is the POST body of `/api/timeline` and the
  engine's input. A presentation flag in it would travel to the engine, into the rules schema's
  neighbourhood and into the eval harness, to decide the colour of some text.
- **`deriveStatus` is untouched and knows nothing about done.** No rule loses its deadline. The
  screen applies the done treatment on top of whatever status the engine returned, at the
  row-building layer where the other presentation rules already live.
- **Three things change, and the date is not one of them**: the row greys, the dot takes the done
  style, and the countdown chip is dropped. The chip is the load-bearing part — "was due 126 days
  ago" on a step the parent has just told us they finished is the product arguing with them, and
  it is the only element on that screen allowed to alarm. The deadline itself still shows: a
  marked-done item is still a dated obligation and we cannot certify it discharged.
- **An estimated date stays labelled estimated.** The claim is about the step, not the date.
- **Done drops out of the do-next card**, which is a queue of what to do, not a list of what is
  left over. The next real action takes the freed slot.
- **One control, on the item page**, where the step is explained — not on a timeline row, where a
  mistaken tap one pixel from a link would grey a statutory obligation unread. Reversible in one
  tap, so no confirmation step.
- **Ids, not booleans per item**: a rule later renamed or retired leaves an inert orphan.
- **The shared partner view shows no done marks.** The signed token carries the profile and
  nothing else; adding them would change the signed shape and invalidate every link already sent,
  to show a partner something they cannot act on.

Alternatives. *Drop a deadline from a rule* so `past` becomes reachable — rejected: it bends
verified legal data to make a colour appear. *Change `deriveStatus`* — rejected: it bends tested
engine logic for the same reason, and time-elapsed is not what the state means. *Drop the state
from the spec* — rejected: a checklist a parent cannot tick is a worse product than one they can.

Consequence. Done marks live in one browser: they do not reach the partner's view, another device,
or us, and clearing site data clears them — the same trade PRD §8 already makes for the profile.
**Phase 7's reminders must read `completed` before sending**: a reminder for something the parent
has told us they finished is the fastest way to lose their trust in every other reminder, and it is
the one unsubscribe we cannot recover. Ruled now, built then.

The pattern, which is the part worth keeping: **a UI state was specified that no engine output
could produce, and it survived implementation and unit tests because the test asserted the renderer
handles the state rather than that the state occurs.** A test that constructs its own input proves
the mapping, never the reachability. Every assertion added here starts from a real profile and a
real engine timeline.
