// lib/ui/timeline-rows.ts
//
// The timeline screen, as data. Pure functions, no React, no fs, no clock.
//
// This module exists so the regression requirement can be a unit test rather
// than a browser assertion: "timeline screen dates must be identical to
// /dev/timeline engine output for the same profile". /dev/timeline is a JSON
// dump of buildTimeline, so asserting these rows against buildTimeline output IS
// asserting them against /dev/timeline. See tests/ui/timeline-rows.test.ts.
//
// Nothing here invents a date. The gutter date comes from the engine's own
// `keyDate`, the same function the birth diff uses, so the timeline and /birth
// can never disagree about which day an item sits on.

import type { ISODate } from "../timeline/dates";
import { diffDays } from "../timeline/dates";
import { keyDate } from "../timeline/key-date";
import { hasIndianParent } from "../timeline/applies";
import type { IntakeProfile, TimelineItem, TimelineResponse } from "../schemas";

// ---------------------------------------------------------------------------
// Dates, as the gutter shows them
// ---------------------------------------------------------------------------

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * `12 Oct`. Day is unpadded, as in the mockup, and the month is the English
 * three-letter abbreviation.
 *
 * Formatted from the ISO string's own parts rather than through `Date`, which
 * would apply the viewer's timezone and can move a date across midnight. The
 * engine works in whole days; a timeline date has no time of day to shift.
 */
export function formatGutterDate(iso: ISODate): string {
  const [, m, d] = iso.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1]}`;
}

/** `15 November`, for the header's due date. */
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function formatLongDate(iso: ISODate): string {
  const [, m, d] = iso.split("-");
  return `${Number(d)} ${MONTHS_LONG[Number(m) - 1]}`;
}

/**
 * The pregnancy week on a given day, counted the way maternity care counts it:
 * the due date is the end of week 40.
 *
 * This is a DISPLAY label, not a timeline date — no deadline is derived from it,
 * and the design system asks for it in the header ("Week 32 · due 15 Nov") as
 * the answer to "where am I". It uses the engine's own `diffDays` rather than a
 * second date arithmetic, so there is one implementation of day counting in the
 * codebase. Returns null before week 1 and after week 45, where a number would
 * be noise rather than state.
 */
export function pregnancyWeek(dueDate: ISODate, on: ISODate): number | null {
  const daysToDue = diffDays(on, dueDate);
  const week = 40 - Math.floor(daysToDue / 7);
  return week >= 1 && week <= 45 ? week : null;
}

// ---------------------------------------------------------------------------
// The row model
// ---------------------------------------------------------------------------

export type DotStyle = "filled" | "hollow" | "done";
export type RowState = "done" | "current" | "plain";
export type Chip = { kind: "warn" | "stop"; text: string };

export type TimelineRow = {
  id: string;
  /** The ISO date the gutter renders. Always the engine's keyDate. */
  iso: ISODate;
  /** `12 Oct` */
  date: string;
  /** The gutter's second line: `est.`, a year, or empty. */
  dateNote: string;
  dot: DotStyle;
  title_en: string;
  term_de?: string;
  /** The one metadata line. design-system.md §5. */
  metaLine: string;
  chip: Chip | null;
  state: RowState;
  estimated: boolean;
  consular: boolean;
  /** The reader marked this done. A profile fact, not an engine status. ADR-072. */
  done: boolean;
};

/**
 * §5: "in 9 days" and "was due 3 days ago" — a number, never an exclamation
 * mark. Amber at deadline − 14, red once overdue.
 *
 * `upcoming` deliberately gets no chip even with a deadline inside 14 days:
 * status.ts already ranks upcoming above urgent so that Standesamt registration
 * does not show an amber countdown a week before the baby is born. The chip
 * follows the status, not the day count.
 */
export function chipFor(item: TimelineItem): Chip | null {
  const days = item.days_until_deadline;
  if (item.status === "overdue") {
    if (days === undefined) return { kind: "stop", text: "overdue" };
    const n = Math.abs(days);
    return { kind: "stop", text: n === 1 ? "was due 1 day ago" : `was due ${n} days ago` };
  }
  if (item.status === "urgent" && days !== undefined) {
    if (days === 0) return { kind: "warn", text: "due today" };
    return { kind: "warn", text: days === 1 ? "in 1 day" : `in ${days} days` };
  }
  return null;
}

/**
 * The gutter's second line.
 *
 * `est.` when the date is still counted from a due date rather than a birth, a
 * four-digit year when the item falls outside the year the timeline is read in
 * (the mockup's "15 Nov · 2027" consular row), and otherwise nothing. A
 * pregnancy week is NOT shown per row: it would imply the week is a property of
 * the item, and for a birth-anchored item in an unknown year it would be false.
 */
export function dateNoteFor(item: TimelineItem, asOf: ISODate): string {
  const year = keyDate(item).slice(0, 4);
  if (year !== asOf.slice(0, 4)) return year;
  return item.certainty === "estimated" ? "est." : "";
}

/**
 * The single metadata line: §5 calls it "the whole trust mechanism compressed".
 * Every date says what it is counted from, which is rule 1 of the design system
 * — nothing on screen without provenance.
 */
export function metaLineFor(item: TimelineItem): string {
  const parts: string[] = [];

  if (item.status === "past") parts.push("Window has opened — check if this is done");
  else if (item.certainty === "estimated") parts.push("Estimated");

  parts.push(item.track === "consular" ? "Indian consulate" : "German offices");
  parts.push(item.anchor === "birth" ? "counted from the birth" : "counted from your due date");

  return parts.join(" · ");
}

export function dotFor(item: TimelineItem): DotStyle {
  if (item.status === "past") return "done";
  return item.certainty === "estimated" ? "hollow" : "filled";
}

export function stateFor(item: TimelineItem): RowState {
  if (item.status === "past") return "done";
  // §5: Current gets the one bordered surface card. Overdue and urgent are
  // carried by their chip, not by a second card competing with it.
  return item.status === "current" ? "current" : "plain";
}

/**
 * The German term to show beside an English title, or null.
 *
 * Several rules already name the term inside title_en - "Register the birth at
 * the Standesamt" - and appending term_de there produced "...at the Standesamt
 * Standesamt" on both the timeline and the item page. The term is worth showing
 * only when the English title does not already carry it, which is exactly the
 * case the design system's gloss pattern is for: the reader meets the German
 * word they will see on the form, next to the English they understand.
 */
export function termToShow(title_en: string, term_de?: string): string | null {
  if (!term_de) return null;
  return title_en.includes(term_de) ? null : term_de;
}

/**
 * The done treatment, applied on top of whatever status the engine returned.
 *
 * ADR-072. "Done" is something the reader told us, so it cannot be derived from
 * dates and `deriveStatus` knows nothing about it. It lands here, at the
 * presentation layer, where the other rules that are about the screen rather
 * than the law already live.
 *
 * Three things change, and the date is not one of them: the row greys (§5), the
 * dot goes to the done style, and the countdown chip is dropped. The chip is the
 * load-bearing part — telling a parent "was due 3 days ago" about something they
 * have just told us they finished would be the product arguing with them, and it
 * is also the one piece of this screen that is allowed to alarm.
 *
 * The deadline itself still shows. A marked-done item is still a dated
 * obligation, and we are not in a position to certify that it is discharged.
 */
export function toRow(item: TimelineItem, asOf: ISODate, done = false): TimelineRow {
  const iso = keyDate(item);
  return {
    id: item.id,
    iso,
    date: formatGutterDate(iso),
    dateNote: dateNoteFor(item, asOf),
    dot: done ? "done" : dotFor(item),
    title_en: item.title_en,
    ...(item.term_de === undefined ? {} : { term_de: item.term_de }),
    metaLine: done ? doneMetaLine(item) : metaLineFor(item),
    chip: done ? null : chipFor(item),
    state: done ? "done" : stateFor(item),
    estimated: item.certainty === "estimated",
    consular: item.track === "consular",
    done,
  };
}

/**
 * `Marked done · German offices · counted from the birth`.
 *
 * The mockup's greyed rows read "Marked done · …" (docs/mockup.html:240), and
 * the phrase is deliberately in the reader's voice: the product is reporting
 * what they said, not certifying that an office has processed anything.
 *
 * The provenance half of the line survives, because design-system rule 1 holds
 * for a done row too — the date is still on screen, so it still has to say what
 * it is counted from.
 */
function doneMetaLine(item: TimelineItem): string {
  const parts = ["Marked done"];
  // An estimated date stays labelled estimated after it is marked done. The
  // reader's claim is about the step, not about the date, and the date on the
  // row is still counted from a due date rather than a birth.
  if (item.certainty === "estimated") parts.push("estimated");
  parts.push(item.track === "consular" ? "Indian consulate" : "German offices");
  parts.push(item.anchor === "birth" ? "counted from the birth" : "counted from your due date");
  return parts.join(" · ");
}

// ---------------------------------------------------------------------------
// The screen
// ---------------------------------------------------------------------------

export type TimelineView = {
  /** Header: state, not branding. */
  header: { week: number | null; dueDate: string; birthDate: string | null; profileLine: string };
  /** The do-next card: at most three, the only filled card in the product. */
  doNext: TimelineRow[];
  /** Rows strictly before today, oldest first. */
  before: TimelineRow[];
  /** Rows on or after today. */
  after: TimelineRow[];
  /** The today band's own label. */
  today: { date: string; week: number | null };
};

/** §4: at most three actions in the do-next card. */
export const DO_NEXT_LIMIT = 3;

const DO_NEXT_ORDER: Record<string, number> = { overdue: 0, urgent: 1, current: 2 };

/**
 * Everything the timeline screen renders, derived from one engine response and
 * the profile that produced it.
 *
 * The split point is `as_of`, which the engine echoes back — not a fresh clock
 * reading. A screen that re-read the clock could place the today band on a
 * different day from the one the statuses were derived against.
 */
export function toView(
  response: TimelineResponse,
  profile: IntakeProfile,
  /**
   * Item ids the reader marked done, from their own browser (ADR-072). Absent
   * for the shared partner view: the share token carries the profile and
   * nothing else, so a partner sees the dates without the checkmarks.
   */
  completed: readonly string[] = [],
): TimelineView {
  const asOf = response.as_of;
  const done = new Set(completed);
  const rows = response.items.map((i) => toRow(i, asOf, done.has(i.id)));

  const doNext = response.items
    // A step the reader has marked done is not something to do next. It stays
    // on the timeline, greyed, because the date is still real — but the card
    // that says "do these three things" must not name it.
    .filter((i) => i.status in DO_NEXT_ORDER && !done.has(i.id))
    .sort(
      (a, b) =>
        DO_NEXT_ORDER[a.status] - DO_NEXT_ORDER[b.status] ||
        keyDate(a).localeCompare(keyDate(b)) ||
        a.id.localeCompare(b.id),
    )
    .slice(0, DO_NEXT_LIMIT)
    .map((i) => toRow(i, asOf));

  const before: TimelineRow[] = [];
  const after: TimelineRow[] = [];
  for (const row of rows) (row.iso < asOf ? before : after).push(row);

  // The engine's own test, not a second one: allowedJurisdictions decides
  // whether consular items exist at all, so the header must ask the same
  // question or it will name a track with no rows (or hide one that has them).
  const tracks = hasIndianParent(profile)
    ? "German offices · Indian consulate"
    : "German offices";

  return {
    header: {
      week: pregnancyWeek(profile.due_date, asOf),
      dueDate: formatLongDate(profile.due_date),
      // Both dates stay visible once the birth is recorded: every pre-birth
      // item is still anchored to the due date, so replacing it would hide the
      // thing those rows are counted from. Human ruling, 2026-11-06.
      birthDate: profile.birth_date === undefined ? null : formatLongDate(profile.birth_date),
      profileLine: `${profile.bundesland === "hessen" ? "Hessen" : "Berlin"} · ${tracks}`,
    },
    doNext,
    before,
    after,
    today: { date: formatGutterDate(asOf), week: pregnancyWeek(profile.due_date, asOf) },
  };
}
