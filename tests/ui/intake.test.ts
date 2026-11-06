// The seven intake questions and the draft -> IntakeProfile conversion.
//
// Driven by what can silently go wrong: a question whose answer never reaches
// the profile, a choice list that misses an enum value the engine can receive,
// and a nationality encoding that turns the consular track on when it should be
// off. All three would produce a timeline that is wrong rather than broken.

import { describe, expect, it } from "vitest";
import { IntakeProfile } from "@/lib/schemas";
import { hasIndianParent } from "@/lib/timeline/applies";
import { buildTimeline } from "@/lib/timeline";
import {
  QUESTIONS,
  TOTAL,
  answered,
  dotLit,
  toProfile,
  validate,
  type Draft,
} from "@/app/intake/questions";

const TODAY = "2026-10-04";

/** A complete set of answers, as seven taps and two typed fields would leave it. */
const FULL: Draft = {
  due_date: "2026-11-15",
  bundesland: "hessen",
  city: "Frankfurt am Main",
  nationalities: ["India", "India"],
  employment_status: "employed",
  marital_status: "unmarried",
  first_child: true,
};

describe("there are seven questions and they cover the profile", () => {
  it("has exactly seven", () => {
    expect(TOTAL).toBe(7);
    expect(QUESTIONS).toHaveLength(7);
  });

  it("asks for every user-supplied IntakeProfile field exactly once", () => {
    // insurance is deliberately absent: z.literal("gkv"), stated on the last
    // screen rather than asked. birth_date and premature are set later.
    const asked = QUESTIONS.map((q) => q.key).sort();
    expect(asked).toEqual(
      [
        "bundesland",
        "city",
        "due_date",
        "employment_status",
        "first_child",
        "marital_status",
        "nationalities",
      ].sort(),
    );
  });

  it("gives every question a title and a reason for being asked", () => {
    for (const q of QUESTIONS) {
      expect(q.title.length).toBeGreaterThan(8);
      expect(q.lede.length).toBeGreaterThan(20);
    }
  });

  it("uses sentence case, not title case, and never shouts", () => {
    // design-system.md §7. A screen reading "URGENT" or "Register Your Birth"
    // is the wrong register for this product.
    for (const q of QUESTIONS) {
      expect(q.title).not.toMatch(/[A-Z]{3,}/);
      expect(q.title).not.toContain("!");
      for (const c of q.choices ?? []) expect(c.label).not.toMatch(/[A-Z]{4,}/);
    }
  });

  it("gives every choice question at least two choices, each carrying a value", () => {
    for (const q of QUESTIONS.filter((x) => x.kind === "choice")) {
      expect(q.choices && q.choices.length >= 2).toBe(true);
      for (const c of q.choices ?? []) expect(Object.keys(c.value).length).toBe(1);
    }
  });
});

describe("the choices cover every value the engine can receive", () => {
  function valuesFor(key: keyof Draft): unknown[] {
    const q = QUESTIONS.find((x) => x.key === key);
    return (q?.choices ?? []).map((c) => c.value[key]);
  }

  it("offers both Bundesländer the schema allows", () => {
    expect(new Set(valuesFor("bundesland"))).toEqual(new Set(["hessen", "berlin"]));
  });

  it("offers all three employment statuses", () => {
    expect(new Set(valuesFor("employment_status"))).toEqual(
      new Set(["employed", "self-employed", "not-employed"]),
    );
  });

  it("offers both marital statuses and both answers for a first child", () => {
    expect(new Set(valuesFor("marital_status"))).toEqual(new Set(["married", "unmarried"]));
    expect(new Set(valuesFor("first_child"))).toEqual(new Set([true, false]));
  });
});

describe("the nationality encoding drives the consular track correctly", () => {
  const choices = QUESTIONS.find((q) => q.key === "nationalities")?.choices ?? [];

  it("offers four answers, including one that admits we cannot cover it", () => {
    expect(choices).toHaveLength(4);
    expect(choices.some((c) => /cannot cover/i.test(c.note ?? ""))).toBe(true);
  });

  it.each([
    ["Both Indian", true],
    ["One Indian, one German", true],
    ["One Indian, one other", true],
    ["Neither is Indian", false],
  ])("%s turns the consular track %s", (label, expected) => {
    const choice = choices.find((c) => c.label === label);
    expect(choice, label).toBeDefined();
    const profile = toProfile({ ...FULL, ...choice?.value });
    expect(profile).not.toBeNull();
    expect(hasIndianParent(profile!)).toBe(expected);
  });

  it("actually changes which items the engine produces", () => {
    // The real consequence, not just the predicate: a German/German couple must
    // not be told to register with the Consulate General of India.
    const indian = toProfile({ ...FULL, nationalities: ["India", "India"] })!;
    const neither = toProfile({ ...FULL, nationalities: ["Other", "Other"] })!;
    const consular = (p: typeof indian) =>
      buildTimeline(p, { today: TODAY }).items.filter((i) => i.track === "consular").length;
    expect(consular(indian)).toBeGreaterThan(0);
    expect(consular(neither)).toBe(0);
  });
});

describe("toProfile", () => {
  it("produces a profile the schema accepts", () => {
    const profile = toProfile(FULL);
    expect(profile).not.toBeNull();
    expect(IntakeProfile.safeParse(profile).success).toBe(true);
  });

  it("sets statutory insurance without asking", () => {
    expect(toProfile(FULL)?.insurance).toBe("gkv");
  });

  it("trims the typed city", () => {
    expect(toProfile({ ...FULL, city: "  Wiesbaden  " })?.city).toBe("Wiesbaden");
  });

  it("returns null while any answer is missing, rather than a half profile", () => {
    for (const key of Object.keys(FULL) as Array<keyof Draft>) {
      const partial = { ...FULL };
      delete partial[key];
      expect(toProfile(partial), `missing ${key}`).toBeNull();
    }
  });
});

describe("validate catches a bad answer on its own screen", () => {
  it("requires a due date", () => {
    expect(validate("due_date", {}, TODAY)).not.toBeNull();
  });

  it("rejects a year that is a typo rather than a pregnancy", () => {
    expect(validate("due_date", { due_date: "2019-11-15" }, TODAY)).toMatch(/typo/i);
    expect(validate("due_date", { due_date: "2126-11-15" }, TODAY)).toMatch(/typo/i);
  });

  it("rejects a malformed date", () => {
    expect(validate("due_date", { due_date: "15/11/2026" }, TODAY)).not.toBeNull();
  });

  it("accepts a due date that has already passed", () => {
    // A user can arrive after the due date and still have a real timeline; the
    // schema does not forbid it either, so neither does this.
    expect(validate("due_date", { due_date: "2026-09-01" }, TODAY)).toBeNull();
  });

  it("requires a non-empty city and rejects an absurd one", () => {
    expect(validate("city", { city: "   " }, TODAY)).not.toBeNull();
    expect(validate("city", { city: "x".repeat(81) }, TODAY)).not.toBeNull();
    expect(validate("city", { city: "Frankfurt am Main" }, TODAY)).toBeNull();
  });

  it("asks a choice question to be answered", () => {
    expect(validate("bundesland", {}, TODAY)).not.toBeNull();
    expect(validate("bundesland", { bundesland: "berlin" }, TODAY)).toBeNull();
  });

  it("treats first_child: false as answered", () => {
    // The trap: a falsy-but-valid answer read as "not answered" would make the
    // second choice on that screen impossible to submit.
    expect(answered({ first_child: false }, "first_child")).toBe(true);
    expect(validate("first_child", { first_child: false }, TODAY)).toBeNull();
  });

  it("treats whitespace as unanswered for typed fields", () => {
    expect(answered({ city: "  " }, "city")).toBe(false);
  });
});

describe("the progress dots", () => {
  it("lights the current question, so question 1 of 7 shows one dot", () => {
    // The first version subtracted one from the step before comparing and lit
    // NOTHING on the first screen. Nobody would report that as a bug - the
    // screen just looks dead - which is why it is pinned here.
    const lit = (step: number) => QUESTIONS.filter((_q, i) => dotLit(i, step)).length;
    expect(lit(0)).toBe(1);
  });

  it("lights four of seven on question 4, as the mockup does", () => {
    const lit = QUESTIONS.filter((_q, i) => dotLit(i, 3)).length;
    expect(lit).toBe(4);
  });

  it("lights every dot on the review screen", () => {
    const lit = QUESTIONS.filter((_q, i) => dotLit(i, TOTAL)).length;
    expect(lit).toBe(TOTAL);
  });

  it("never lights a dot ahead of the current question", () => {
    for (let step = 0; step < TOTAL; step += 1) {
      for (let i = 0; i < TOTAL; i += 1) {
        expect(dotLit(i, step)).toBe(i <= step);
      }
    }
  });
});
