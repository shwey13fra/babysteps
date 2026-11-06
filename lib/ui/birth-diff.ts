// lib/ui/birth-diff.ts
//
// F2b, as data. Pure functions; no React, no fs, no clock.
//
// This is the screen the addendum calls the most screenshot-worthy interaction
// in the build, and the reason is that it is the product visibly doing its job:
// a parent types one date and watches the deadlines move to where they really
// are. It also catches a mistyped date before we do, because a diff that reads
// wrong is obvious to the person who was there.
//
// Everything here formats numbers the engine already computed. `days_early` and
// the Mutterschutz periods arrive from /api/birth-preview, and day counting is
// the engine's `diffDays` rather than a second implementation.

import type { BirthPreviewResponse, DateChangeWire, TimelinePeriod } from "../schemas";
import { diffDays } from "../timeline/dates";
import { formatGutterDate } from "./timeline-rows";

export type DiffRow = {
  id: string;
  title: string;
  /** `22 Nov` — where the date sat while it was estimated. */
  from: string;
  /** `16 Nov` — where it sits now the birth is known. */
  to: string;
  /** Whole days the item moved. Negative means it moved earlier. */
  movedDays: number;
};

/**
 * The diff rows, earliest new date first.
 *
 * Ordered by where the dates land rather than by rule id, because the list is
 * read as "what happens next" and an id ordering would scatter the near dates
 * through the far ones.
 *
 * Sorted on the ISO strings BEFORE formatting. Sorting the formatted dates is
 * the obvious mistake here and it is silent: "16 Nov" sorts before "9 Feb"
 * alphabetically, so a February deadline would be listed above a November one.
 */
export function toDiffRows(changes: DateChangeWire[], asOf: string): DiffRow[] {
  const thisYear = asOf.slice(0, 4);
  // A date outside the year the diff was made in shows its year. Without this a
  // consular item a year away renders as "10 Nov -> 4 Nov" and reads as days
  // away - on the one screen whose job is to be believable.
  const fmt = (iso: string) =>
    iso.slice(0, 4) === thisYear
      ? formatGutterDate(iso)
      : `${formatGutterDate(iso)} ${iso.slice(0, 4)}`;

  return [...changes]
    .sort((a, b) => a.to.localeCompare(b.to) || a.id.localeCompare(b.id))
    .map((c) => ({
      id: c.id,
      title: c.title,
      from: fmt(c.from),
      to: fmt(c.to),
      // The engine's own day counting. lib/timeline/dates.ts has no imports at
      // all, so it is safe on the client.
      movedDays: diffDays(c.from, c.to),
    }));
}

/** `6 days earlier`, `3 days later`, `same day`. */
export function describeMove(movedDays: number): string {
  if (movedDays === 0) return "same day";
  const n = Math.abs(movedDays);
  const unit = n === 1 ? "day" : "days";
  return movedDays < 0 ? `${n} ${unit} earlier` : `${n} ${unit} later`;
}

/**
 * How the baby's arrival compares with the due date, in words.
 *
 * `days_early` is the engine's number: positive when the birth precedes the due
 * date, negative when it follows.
 */
export function describeArrival(daysEarly: number): string {
  if (daysEarly === 0) return "on the due date";
  const n = Math.abs(daysEarly);
  const unit = n === 1 ? "day" : "days";
  return daysEarly > 0 ? `${n} ${unit} early` : `${n} ${unit} late`;
}

export type MutterschutzNote = {
  /** The sentence shown under the diff. */
  text: string;
  /** True when the protection period after the birth changed length. */
  changed: boolean;
};

/** Small numbers read better as words in a sentence than as digits. */
function words(n: number): string {
  const table: Record<number, string> = {
    1: "one",
    2: "two",
    3: "three",
    4: "four",
    5: "five",
    6: "six",
    7: "seven",
    8: "eight",
    9: "nine",
    10: "ten",
    11: "eleven",
    12: "twelve",
  };
  return table[n] ?? String(n);
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * What the birth date does to the Mutterschutz period.
 *
 * This is the one consequence of an early birth that is NOT a moved date, so it
 * would be invisible in the diff list. It states the statutory rule and the
 * threshold the engine applied — MuSchG §3(2) — and never predicts an
 * entitlement or an amount (rule 13).
 *
 * The protection period after the birth is statute, so calling it statutory is
 * accurate here; rule 12 only forbids dressing a soft or advisory deadline that
 * way.
 */
export function mutterschutzNote(
  before: TimelinePeriod,
  after: TimelinePeriod,
  daysEarly: number,
  thresholdDays: number,
): MutterschutzNote {
  const arrival = describeArrival(daysEarly);

  if (after.weeks_after !== before.weeks_after) {
    return {
      changed: true,
      text:
        `The protection period after the birth becomes ${words(after.weeks_after)} weeks ` +
        `instead of ${words(before.weeks_after)}, because the baby arrived ${arrival} — more than ` +
        `${words(Math.round(thresholdDays / 7))} weeks before the due date (MuSchG §3(2)).`,
    };
  }

  if (daysEarly > 0) {
    return {
      changed: false,
      text:
        `The protection period after the birth stays at ${words(after.weeks_after)} weeks — the ` +
        `baby arrived ${arrival}, which is inside the normal range. The days of protection not ` +
        `used before the birth are added to the end of it (MuSchG §3(2)).`,
    };
  }

  if (daysEarly < 0) {
    return {
      changed: false,
      text:
        `The protection period after the birth stays at ${words(after.weeks_after)} weeks — ` +
        `arriving ${arrival} does not shorten it (MuSchG §3(2)).`,
    };
  }

  return {
    changed: false,
    text: `The protection period after the birth stays at ${words(after.weeks_after)} weeks (MuSchG §3(2)).`,
  };
}

/** The heading over the list: "Nine dates will move". */
export function diffHeading(count: number): string {
  if (count === 0) return "No dates move";
  if (count === 1) return "One date will move";
  return `${capitalise(words(count))} dates will move`;
}

/**
 * One sentence about how far the dates moved.
 *
 * Checked, not assumed: birth-anchored items all hang off the same anchor, so
 * they normally shift by the same number of days - but a rule could clamp or
 * round, and claiming "every date moved 13 days earlier" when one of them did
 * not would be a false statement on the screen whose entire job is to be
 * believable. If they disagree, the sentence says so instead.
 */
export function describeAllMoves(rows: DiffRow[]): string | null {
  if (rows.length === 0) return null;
  const first = rows[0].movedDays;
  const allSame = rows.every((r) => r.movedDays === first);
  if (!allSame) return "These dates did not all move by the same amount.";
  if (first === 0) return "None of these dates actually moved.";
  return rows.length === 1
    ? `It moved ${describeMove(first)}.`
    : `Every date above moved ${describeMove(first)}.`;
}

export type DiffView = {
  rows: DiffRow[];
  heading: string;
  arrival: string;
  /** How far they all moved, or that they did not agree. Null when nothing moved. */
  moves: string | null;
  note: MutterschutzNote;
};

/** Everything the screen needs, from one preview response. */
export function toDiffView(response: BirthPreviewResponse): DiffView {
  const rows = toDiffRows(response.changes, response.as_of);
  return {
    rows,
    heading: diffHeading(rows.length),
    arrival: describeArrival(response.days_early),
    moves: describeAllMoves(rows),
    note: mutterschutzNote(
      response.period_before,
      response.period_after,
      response.days_early,
      response.premature_threshold_days,
    ),
  };
}
