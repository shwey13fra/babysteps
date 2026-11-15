// lib/timeline/working-days.ts
//
// Is this a day German public offices are normally open?
//
// WHAT THIS MODULE DOES NOT DO: move a date. Nothing here shifts a deadline to
// the next working day, and ADR-079 says why. Whether a deadline falling on a
// Saturday moves is a LEGAL question with a per-rule answer — German law has a
// general provision for periods ending on a weekend or holiday, but it does not
// apply uniformly, and the Standesamt week is a notification duty rather than an
// ordinary Frist. We have not verified that provision or its scope against any
// source in the corpus. An engine that shifted the date anyway would be
// asserting law, which is precisely what CLAUDE.md rule 4 forbids.
//
// So the deadline stays exactly where the statute puts it, and the product says
// the true thing beside it: this day is a Saturday.
//
// No runtime import of anything that reaches `node:fs`, for the same reason
// key-date.ts has none: this is read by client islands.

import { toEpochDay, type ISODate } from "./dates";
import type { Bundesland } from "../schemas";

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/**
 * 0 = Sunday … 6 = Saturday.
 *
 * Epoch day 0 is 1970-01-01, a **Thursday**, so the +4 shift puts Sunday at 0.
 * The double modulo keeps pre-epoch dates positive — `-1 % 7` is `-1` in
 * JavaScript, which would index the array out of bounds and return undefined
 * rather than throwing.
 *
 * Derived from the ISO parts via `toEpochDay`, never through `new Date()`, so
 * it carries no timezone: the same function is correct on a server in UTC and
 * on a phone in Europe/Berlin.
 */
export function weekdayIndex(date: ISODate): number {
  return (((toEpochDay(date) + 4) % 7) + 7) % 7;
}

/** `Saturday`. The word the parent reads, not an index. */
export function weekdayName(date: ISODate): string {
  return WEEKDAYS[weekdayIndex(date)];
}

/**
 * PUBLIC HOLIDAYS ARE A DOCUMENTED GAP, NOT AN OVERSIGHT.
 *
 * These tables are empty and the emptiness is load-bearing, so read this before
 * assuming the product knows about a holiday:
 *
 *  - German public holidays are **per-Bundesland**. Fronleichnam is a holiday in
 *    Hesse and an ordinary working day in Berlin; Berlin has 8 March, Hesse does
 *    not. A single national list would be wrong for both.
 *  - A holiday table goes stale, and a stale one is worse than none because it
 *    reports knowledge it no longer has — the same failure mode as a source with
 *    no as-of date, which this product refuses everywhere else.
 *  - So it is a **corpus problem wearing an arithmetic costume** (ADR-079). It
 *    arrives through the ingestion path with a source and an as-of, or it does
 *    not arrive.
 *
 * The parameter exists now so the table can be filled without touching a single
 * call site. `tests/timeline/working-days.test.ts` asserts the gap explicitly:
 * Friday 25 December 2026 is a public holiday and this function returns false.
 */
const PUBLIC_HOLIDAYS: Record<Bundesland, ReadonlySet<ISODate>> = {
  hessen: new Set<ISODate>(),
  berlin: new Set<ISODate>(),
};

/**
 * True when offices are normally closed: today, weekends only.
 *
 * "Normally" is doing real work in that sentence. We do not know any individual
 * office's opening hours, and nothing in the corpus carries them, so the copy
 * built on this predicate says what offices generally do and sends the reader to
 * check — it never asserts that a particular Standesamt is shut.
 */
export function isNonWorkingDay(date: ISODate, bundesland: Bundesland): boolean {
  if (PUBLIC_HOLIDAYS[bundesland].has(date)) return true;
  const day = weekdayIndex(date);
  return day === 0 || day === 6;
}
