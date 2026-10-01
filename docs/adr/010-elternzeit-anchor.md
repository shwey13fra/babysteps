# ADR-010: Elternzeit notice is anchored to the due date at −49 days

Date: 2026-10-01 · Status: accepted

## Context
BEEG §16(1) requires written notice to reach the employer at least seven weeks before the leave
*starts*, not before the birth. The start depends on who takes leave and when: a partner taking
leave from the day of birth must give notice seven weeks before the due date; a mother starting
hers when the Mutterschutz period ends has a practical deadline about a week *after* the birth.
Intake asks neither who takes leave nor when (7 questions, under 2 minutes — F1).

## Decision
Model the conservative case: `anchor: due_date`, `offset_days: -49`, `kind: hard`. The second case
goes in the item's `note_en` and its detail page rather than into the date arithmetic.

## Alternatives
An eighth intake question naming the leave-taker and start date — rejected, it costs the
under-two-minutes promise for a case the note can carry. Anchoring to `birth` — rejected, it is
wrong for the partner case and produces a deadline in the past for the mother case.

## Consequence
A mother starting leave after Mutterschutz sees a date earlier than she needs, which is safe but
imprecise. If beta shows users confused by it, the fix is the eighth question, not a different
anchor. Numbering: this is ADR-010, not ADR-002 as the Phase 1 prompt said — 001–006 are reserved
for the brief §1 architecture decisions.
