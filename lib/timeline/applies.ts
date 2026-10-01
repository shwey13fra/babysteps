// lib/timeline/applies.ts
//
// `applies_if` evaluation and jurisdiction scoping. Both decide whether a rule
// becomes an item at all, and both are pure functions of the profile.

import type { IntakeProfile, Jurisdiction } from "../schemas";
import type { Condition, Rule } from "./rules";

/** Profile fields a condition may test: scalars only. */
const TESTABLE = [
  "bundesland",
  "employment_status",
  "insurance",
  "marital_status",
  "first_child",
  "premature",
] as const;

type TestableField = (typeof TESTABLE)[number];

function isTestable(field: string): field is TestableField {
  return (TESTABLE as readonly string[]).includes(field);
}

/** All conditions in `all` must hold. An absent applies_if means "always". */
export function appliesTo(rule: Rule, profile: IntakeProfile): boolean {
  if (!rule.applies_if) return true;
  return rule.applies_if.all.every((c) => conditionHolds(c, profile, rule.id));
}

function conditionHolds(condition: Condition, profile: IntakeProfile, ruleId: string): boolean {
  const [field, allowed] = Object.entries(condition)[0]!;

  if (!isTestable(field)) {
    // Loud rather than silently false: a typo'd field name would otherwise make
    // a rule vanish from every timeline and look like a date bug.
    throw new Error(
      `${ruleId}: applies_if tests '${field}', which is not a scalar profile field. ` +
        `Allowed: ${TESTABLE.join(", ")}`,
    );
  }

  const actual = profile[field];
  if (actual === undefined) return false;
  return allowed.includes(actual);
}

/** IntakeProfile says 'hessen'; the corpus CHECK constraint says 'hesse' (brief §3). */
export function bundeslandToJurisdiction(bundesland: IntakeProfile["bundesland"]): Jurisdiction {
  return bundesland === "hessen" ? "hesse" : "berlin";
}

const INDIA = new Set(["in", "ind", "india", "indian"]);

function hasIndianParent(profile: IntakeProfile): boolean {
  return profile.nationalities.some((n) => INDIA.has(n.trim().toLowerCase()));
}

/**
 * Which jurisdictions this profile can see.
 *
 * Federal always. The user's own Bundesland, never the other one. The Indian
 * consular track only when a parent is an Indian national — a German/German
 * couple being told to register with the Consulate General of India is visibly
 * wrong, and the nationalities are already in the profile.
 *
 * Phase 2 filters match_chunks with these same strings, which is why they match
 * the SQL CHECK constraint rather than the intake vocabulary.
 */
export function allowedJurisdictions(profile: IntakeProfile): Jurisdiction[] {
  const allowed: Jurisdiction[] = ["federal", bundeslandToJurisdiction(profile.bundesland)];
  if (hasIndianParent(profile)) allowed.push("consular-india");
  return allowed;
}

export function inScope(rule: Rule, profile: IntakeProfile): boolean {
  return allowedJurisdictions(profile).includes(rule.jurisdiction) && appliesTo(rule, profile);
}
