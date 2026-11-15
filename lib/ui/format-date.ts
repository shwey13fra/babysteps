// lib/ui/format-date.ts
//
// How a date is written, in one place.
//
// MOVED here from timeline-rows.ts on 2026-11-15, not copied. ADR-079 added a
// closed-day sentence that both `item-view.ts` and `timeline-rows.ts` have to
// produce identically, and item-view already imported the formatters from
// timeline-rows. Putting the sentence in item-view would have made the two
// modules import each other — a cycle that happens to work today, because every
// binding is a hoisted function used only at call time, and that is exactly the
// kind of thing that breaks later under a different bundler.
//
// CLAUDE.md's 2026-11-04 exception: extracting a shared helper is in scope when
// the alternative is duplicating it. `timeline-rows.ts` re-exports all three, so
// nothing that imported them had to change.
//
// Every formatter reads the ISO string's own parts and never constructs a
// `Date`. `new Date("2027-01-02")` is parsed as UTC midnight and rendered in the
// viewer's timezone, which moves the date backwards by a day for anyone west of
// Greenwich. The engine works in whole days; a timeline date has no time of day
// to shift.

import type { ISODate } from "../timeline/dates";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * `12 Oct`. Day is unpadded, as in the mockup, and the month is the English
 * three-letter abbreviation.
 */
export function formatGutterDate(iso: ISODate): string {
  const [, m, d] = iso.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1]}`;
}

/** `15 November`, for the header's due date. */
export function formatLongDate(iso: ISODate): string {
  const [, m, d] = iso.split("-");
  return `${Number(d)} ${MONTHS_LONG[Number(m) - 1]}`;
}

/**
 * `2 January 2027`, for a sentence that must stand on its own.
 *
 * The year is not optional here. `formatLongDate` omits it because it appears
 * beside a timeline whose header already states the year, but the closed-day
 * sentence is also written into a calendar DESCRIPTION, where it is read months
 * later with nothing of ours around it.
 */
export function formatLongDateWithYear(iso: ISODate): string {
  const [y, m, d] = iso.split("-");
  return `${Number(d)} ${MONTHS_LONG[Number(m) - 1]} ${y}`;
}
