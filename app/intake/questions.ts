// app/intake/questions.ts
//
// The seven questions, as data. Pure, so the flow can be tested without a
// browser.
//
// SEVEN, not eight, because `IntakeProfile` has exactly seven user-supplied
// fields - due_date, bundesland, city, nationalities, employment_status,
// marital_status, first_child. `insurance` is `z.literal("gkv")`: the MVP covers
// statutory insurance only, so it is not a question but a stated assumption,
// surfaced on the last screen rather than hidden.
//
// Wording follows design-system.md §7: sentence case, no title case, and the
// nationality screen is written to be honest about coverage rather than to hide
// the MVP's edges - the mockup's caption calls that answer the demand signal for
// which consular track gets built next.

import type { IntakeProfile } from "@/lib/schemas";

/** The answers as the flow collects them, before they become a profile. */
export type Draft = {
  due_date?: string;
  bundesland?: IntakeProfile["bundesland"];
  city?: string;
  nationalities?: [string, string];
  employment_status?: IntakeProfile["employment_status"];
  marital_status?: IntakeProfile["marital_status"];
  first_child?: boolean;
};

export type Choice = {
  /** What the button says. */
  label: string;
  /** The honest consequence of this answer, in --ink-3 under the label. */
  note?: string;
  /** Applied to the draft when chosen. */
  value: Partial<Draft>;
};

export type Question = {
  key: keyof Draft;
  /** The screen title. */
  title: string;
  /** One sentence saying why this is asked, or what it decides. */
  lede: string;
  kind: "date" | "text" | "choice";
  choices?: Choice[];
  /** Label above a date or text field. */
  fieldLabel?: string;
  placeholder?: string;
};

/**
 * Nationality is collected as the pair the engine actually reads. The engine's
 * `hasIndianParent` accepts in/ind/india/indian, so "India" is the token that
 * turns the consular track on; anything else leaves it off.
 */
export const QUESTIONS: Question[] = [
  {
    key: "due_date",
    title: "When is the baby due?",
    lede: "Almost every German deadline is counted from this date. You can change it later, and once the baby arrives the real date replaces it.",
    kind: "date",
    fieldLabel: "Due date",
  },
  {
    key: "bundesland",
    title: "Which state will the birth be registered in?",
    lede: "Registration, parental allowance and the offices that handle them are state matters, so this changes which steps you see.",
    kind: "choice",
    choices: [
      { label: "Hessen", note: "Frankfurt, Wiesbaden, Darmstadt and the rest of the state", value: { bundesland: "hessen" } },
      { label: "Berlin", note: "The city state", value: { bundesland: "berlin" } },
    ],
  },
  {
    key: "city",
    title: "Which city?",
    lede: "Used to name the right local office on your timeline. It is not sent anywhere.",
    kind: "text",
    fieldLabel: "City",
    placeholder: "Frankfurt am Main",
  },
  {
    key: "nationalities",
    title: "Which passports do you and your partner hold?",
    lede: "This decides which consulate steps appear on your timeline. Right now we cover Indian citizenship in full.",
    kind: "choice",
    choices: [
      {
        label: "Both Indian",
        note: "German and Indian steps, both tracks",
        value: { nationalities: ["India", "India"] },
      },
      {
        label: "One Indian, one German",
        note: "German steps, plus the parts of the Indian track that still apply",
        value: { nationalities: ["India", "Germany"] },
      },
      {
        label: "One Indian, one other",
        note: "We will tell you which parts we cannot cover yet",
        value: { nationalities: ["India", "Other"] },
      },
      {
        label: "Neither is Indian",
        note: "German steps only for now",
        value: { nationalities: ["Other", "Other"] },
      },
    ],
  },
  {
    key: "employment_status",
    title: "Are you employed?",
    lede: "Maternity protection and parental allowance work differently for employees, the self-employed, and people not in work.",
    kind: "choice",
    choices: [
      { label: "Employed", note: "Including part-time and fixed-term", value: { employment_status: "employed" } },
      { label: "Self-employed", note: "Freelance or running your own business", value: { employment_status: "self-employed" } },
      { label: "Not in paid work", note: "Studying, between jobs, or at home", value: { employment_status: "not-employed" } },
    ],
  },
  {
    key: "marital_status",
    title: "Are you and your partner married?",
    lede: "For unmarried parents, legal fatherhood is not automatic — it takes a separate step, and it is easier before the birth.",
    kind: "choice",
    choices: [
      { label: "Married", value: { marital_status: "married" } },
      { label: "Not married", note: "Adds the acknowledgement of paternity to your timeline", value: { marital_status: "unmarried" } },
    ],
  },
  {
    key: "first_child",
    title: "Is this your first child?",
    lede: "Some entitlements and some of the paperwork depend on whether there are older children.",
    kind: "choice",
    choices: [
      { label: "Yes, the first", value: { first_child: true } },
      { label: "No, we have children already", value: { first_child: false } },
    ],
  },
];

export const TOTAL = QUESTIONS.length;

/**
 * Whether the progress dot at `index` is lit for the given step.
 *
 * The current question counts as lit: the mockup shows four of seven filled on
 * "Question 4 of 7". The first version of this lit NOTHING on question 1,
 * because it subtracted one from the step before comparing - a wrong-by-one
 * nobody would have reported as a bug, just as a slightly dead-looking screen.
 *
 * At the review step (step === TOTAL) every dot is lit.
 */
export function dotLit(index: number, step: number): boolean {
  return index <= step;
}

/** Whether a draft has an answer for a given question. */
export function answered(draft: Draft, key: keyof Draft): boolean {
  const v = draft[key];
  if (v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  return true;
}

/**
 * Per-question validation, so a bad answer is caught on its own screen rather
 * than at the end. Returns an error string or null.
 *
 * The due date deliberately allows a past date: a user can arrive after the due
 * date has passed and still have a valid timeline, and `IntakeProfile` does not
 * forbid it either. What is rejected is an unparseable date and a date so far
 * out that it is a typo rather than a pregnancy.
 */
export function validate(key: keyof Draft, draft: Draft, today: string): string | null {
  if (key === "due_date") {
    const v = draft.due_date;
    if (!v) return "A due date is needed to work out any of the dates.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return "Use the date picker, or type it as YYYY-MM-DD.";
    const [y] = v.split("-").map(Number);
    const thisYear = Number(today.slice(0, 4));
    if (y < thisYear - 2 || y > thisYear + 2) {
      return "That year looks like a typo. Check it and try again.";
    }
    return null;
  }
  if (key === "city") {
    const v = draft.city?.trim() ?? "";
    if (v.length === 0) return "A city is needed to name the right local office.";
    if (v.length > 80) return "That is longer than any city name. Check it and try again.";
    return null;
  }
  return answered(draft, key) ? null : "Pick one to carry on.";
}

/**
 * A complete draft as an IntakeProfile, or null.
 *
 * `insurance` is set here, not asked: the corpus covers statutory insurance only
 * and the schema is a literal. The last screen says so in plain words.
 */
export function toProfile(draft: Draft): IntakeProfile | null {
  if (
    draft.due_date === undefined ||
    draft.bundesland === undefined ||
    draft.city === undefined ||
    draft.nationalities === undefined ||
    draft.employment_status === undefined ||
    draft.marital_status === undefined ||
    draft.first_child === undefined
  ) {
    return null;
  }
  return {
    due_date: draft.due_date,
    bundesland: draft.bundesland,
    city: draft.city.trim(),
    employment_status: draft.employment_status,
    insurance: "gkv",
    nationalities: draft.nationalities,
    marital_status: draft.marital_status,
    first_child: draft.first_child,
  };
}
