// lib/timeline/mutterschutz.ts
//
// The Mutterschutz protection period (MuSchG §3). A span, not a deadline, so it
// is a TimelinePeriod and deliberately not a thirteenth rule: there is nothing
// here for the user to do by a date, and rendering it as a row would put a
// deadline chip on something that is not a deadline.
//
// MuSchG §3(1): protection starts six weeks before the expected date of delivery.
// MuSchG §3(2): it runs eight weeks after the birth, twelve weeks for a premature
// or multiple birth, and the days that could not be taken before the birth are
// added to the period afterwards.
//
// SOURCE: https://www.gesetze-im-internet.de/muschg_2018/__3.html
// Hand-verify this against the statute text in the Phase 1 VERIFY pass. The
// arithmetic below is ours; the rule it encodes is not.

import type { IntakeProfile, TimelinePeriod } from "../schemas";
import { addDays, diffDays } from "./dates";

const PRE_BIRTH_DAYS = 42; // six weeks
const WEEKS_AFTER_NORMAL = 8;
const WEEKS_AFTER_PREMATURE = 12;

/** A birth more than 21 days before the due date triggers the twelve-week period. */
export const PREMATURE_THRESHOLD_DAYS = 21;

/**
 * True when the twelve-week variant applies.
 *
 * `profile.premature` is a manual override and wins in both directions: set it
 * false and a very early birth stays on eight weeks, set it true and a term birth
 * gets twelve. The statute's other twelve-week triggers — a multiple birth, or a
 * disability determined within eight weeks — are not in IntakeProfile, so the
 * override is the only way to express them at MVP.
 */
export function isPremature(profile: IntakeProfile): boolean {
  if (profile.premature !== undefined) return profile.premature;
  if (profile.birth_date === undefined) return false;
  return diffDays(profile.birth_date, profile.due_date) > PREMATURE_THRESHOLD_DAYS;
}

/**
 * Days of pre-birth protection the mother could not use because the baby came
 * early. Added to the period after the birth (MuSchG §3(2)). Zero for a term or
 * late birth — a late birth does not shorten the period afterwards.
 */
export function unusedPreBirthDays(profile: IntakeProfile): number {
  if (profile.birth_date === undefined) return 0;
  const start = addDays(profile.due_date, -PRE_BIRTH_DAYS);
  const used = diffDays(start, profile.birth_date);
  return Math.max(0, PRE_BIRTH_DAYS - used);
}

/**
 * The protection period for this profile.
 *
 * Before the birth every date is a projection from the due date and the period is
 * 'estimated'. Once birth_date is set it is 'confirmed' and the end moves.
 */
export function computeMutterschutz(profile: IntakeProfile): TimelinePeriod {
  const premature = isPremature(profile);
  const weeks_after = premature ? WEEKS_AFTER_PREMATURE : WEEKS_AFTER_NORMAL;
  const start = addDays(profile.due_date, -PRE_BIRTH_DAYS);

  // No birth yet: project the end from the due date as a placeholder, exactly as
  // birth-anchored items do, and say it is an estimate.
  const anchor = profile.birth_date ?? profile.due_date;
  const end = addDays(anchor, weeks_after * 7 + unusedPreBirthDays(profile));

  return {
    id: "mutterschutz",
    start,
    end,
    weeks_after,
    premature,
    certainty: profile.birth_date === undefined ? "estimated" : "confirmed",
  };
}
