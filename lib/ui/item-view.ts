// lib/ui/item-view.ts
//
// The item page, as data. Pure; no React, no fs.
//
// The load-bearing part of this file is `deadlineKindLine`. CLAUDE.md rule 12:
// a deadline whose rule file says kind: soft or advisory must NEVER be described
// anywhere - UI, answer, e-mail - as a legal or statutory deadline. This is the
// one place the UI says what kind of deadline an item carries, so it is the one
// place that rule can be broken on screen, and tests/ui/item-view.test.ts asserts
// the forbidden vocabulary never appears for the two soft kinds.

import type { Bundesland, DeadlineKind } from "../schemas";
import { isISODate } from "../timeline/dates";
import { isNonWorkingDay, weekdayName } from "../timeline/working-days";
import { formatLongDate, formatLongDateWithYear } from "./format-date";

export type KindLine = {
  /** The sentence under the sources. */
  text: string;
  /** Short label for the header. */
  label: string;
};

/**
 * What kind of deadline this is, in the user's words.
 *
 * - `hard` is set by statute, so it may be called statutory.
 * - `soft` costs money rather than the right itself - the Elterngeld
 *   three-month rule is the example: there is no date after which you cannot
 *   apply, only months you stop being paid for.
 *
 *   THAT EXAMPLE USED TO BE IN THE OUTPUT, and it was a lie on three of the
 *   four rules that reach this branch. "What it costs is money - months you
 *   stop being paid for" was written for Elterngeld and then said about every
 *   soft deadline, including `baby_health_insurance`, where the thing at stake
 *   is FREE family cover: there is no monthly payment, so there are no months
 *   to stop being paid. The rule's own note contradicted it one sentence later
 *   ("Family cover for a newborn is free"). Removed 2026-11-18, found by a
 *   human reading the calendar event it generated.
 *
 *   Nothing was lost with it. Every soft rule already states its own cost in
 *   `consequence_en`, which renders two paragraphs above this line: "a month
 *   you cannot claim later", "lost permanently", "it does delay the cash",
 *   "the bills land on you". A generic sentence cannot know which of those is
 *   true, so it does not try - it says only what holds for all four, which is
 *   that the date is not statutory.
 * - `advisory` is practice. A hospital's booking window is not law and the
 *   clinic decides.
 *
 * Every branch names who decides, which is the RDG/StBerG boundary from
 * docs/legal-compliance-pack.md §3: state the rule, then name the authority.
 */
export function deadlineKindLine(
  kind: DeadlineKind,
  authority_en: string,
  note_en?: string,
): KindLine {
  const note = note_en?.trim() ? ` ${note_en.trim()}` : "";

  if (kind === "hard") {
    return {
      label: "Statutory deadline",
      text: `This date is set by statute.${note} ${decides(authority_en)}`,
    };
  }

  if (kind === "soft") {
    return {
      label: "Missing it costs money",
      text: `This is not a legal deadline and nothing stops you applying after it.${note} ${decides(authority_en)}`,
    };
  }

  return {
    label: "Practice, not law",
    text: `This is common practice rather than a rule in law.${note} ${decides(authority_en)}`,
  };
}

/**
 * Names who decides, which is the RDG/StBerG boundary: state the rule, then
 * name the authority.
 *
 * Two sentences, not one joined by a dash. `authority_en` is not reliably a
 * noun phrase — `hebamme_search_start`'s is a whole clause, "You find the
 * midwife yourself; your Krankenkasse covers the care" — so anything of the
 * form "<authority> decides" produces nonsense for some rules. The dash form
 * tolerated that but left a verbless fragment on the rest: "Your Krankenkasse
 * — and the decision in your case is theirs." A full stop reads correctly for
 * both shapes.
 */
function decides(authority_en: string): string {
  const a = authority_en.trim().replace(/\.$/, "");
  return `${a}. The decision in your case is theirs.`;
}

/**
 * What the source chip says about when the source was checked.
 *
 * `verified_on: null` means nobody has checked this source yet, and it is shown
 * as that rather than filled with a guess or quietly omitted. design-system.md
 * rule 1: nothing on screen without provenance, which includes the absence of it.
 */
export function asOfLabel(verified_on: string | null, source_status?: string): string {
  if (verified_on) return `checked ${formatCheckedDate(verified_on)}`;
  if (source_status === "needs_manual_verification") return "not yet checked by us";
  return "not yet checked";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** `12 Aug 2026`. From the ISO parts, never through Date(). */
export function formatCheckedDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

/**
 * The window/deadline sentence for the item header.
 *
 * Describes the anchor, which is the provenance the design system asks for on
 * every date: "counted from your due date" or "counted from the birth".
 */
export function anchorLine(anchor: "due_date" | "birth", certainty: "estimated" | "confirmed"): string {
  const from = anchor === "birth" ? "counted from the birth" : "counted from your due date";
  return certainty === "estimated" ? `Estimated · ${from}` : from;
}

/**
 * Provenance for the one date in this product the PARENT supplied.
 *
 * Every other date is derived by lib/timeline from a rule, and every claim
 * carries the as-of of the source it came from. The birth date is the single
 * input the engine cannot check, so it gets the same treatment: the product
 * says where the date came from, including when the date came from the reader
 * (ruling 2026-11-14).
 *
 * Returns the day the birth was RECORDED, not the day of the birth - those are
 * different facts and the birth date is already on screen beside this line.
 *
 * Null whenever the pair is incomplete or malformed, so a stored record written
 * by an older build degrades to silence rather than to a wrong sentence.
 */
export function recordedLine(birthDate?: string, recordedAt?: string): string | null {
  if (!birthDate || !recordedAt) return null;
  if (!isISODate(birthDate)) return null;
  const day = recordedAt.slice(0, 10);
  if (!isISODate(day)) return null;
  return `You recorded the birth date on ${formatLongDate(day)}.`;
}

/**
 * The date falls on a day offices are normally shut — said plainly, and nothing
 * more than that.
 *
 * ADR-079: the date is NOT moved. This sentence is the whole of the response, in
 * three places that must agree — the item page, the timeline row (in its short
 * form below) and the calendar DESCRIPTION.
 *
 * ON THE WORDING, which was ruled on and then narrowed (2026-11-15). The ruling
 * asked for "the office will be closed". That is a prediction about a specific
 * office's opening hours, and this product has no source for any office's hours:
 * nothing in the corpus carries them, and some Standesämter do open on a
 * Saturday for weddings. Asserting it would be the one thing we never do —
 * stating as fact something we cannot cite. So the claim is narrowed to what is
 * demonstrably true and generally sourced: the date IS a Saturday, offices are
 * NORMALLY closed at weekends, and the reader is sent to the authority to check.
 * Same shape as rule 13 everywhere else: state the rule, name who decides.
 */
export function closedDayLine(iso: string, bundesland: Bundesland): string | null {
  if (!isISODate(iso)) return null;
  if (!isNonWorkingDay(iso, bundesland)) return null;
  return (
    `${formatLongDateWithYear(iso)} is a ${weekdayName(iso)}. ` +
    "German public offices are normally closed at weekends — check the opening hours before you go."
  );
}

/**
 * `falls on a Saturday`, for the timeline row's single metadata line.
 *
 * The full sentence belongs on the item page and in the calendar entry, where
 * there is room for it. A timeline of twelve rows cannot carry twelve sentences:
 * design-system.md §5 gives each row ONE metadata line, and the compressed
 * clause joins the line that is already there rather than adding a second one.
 */
export function closedDayShort(iso: string, bundesland: Bundesland): string | null {
  if (!isISODate(iso)) return null;
  if (!isNonWorkingDay(iso, bundesland)) return null;
  return `falls on a ${weekdayName(iso)}`;
}
