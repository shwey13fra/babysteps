// MuSchG §3 protection period. A TimelinePeriod, not a deadline item.

import { describe, expect, it } from "vitest";
import type { IntakeProfile } from "@/lib/schemas";
import { TimelinePeriod } from "@/lib/schemas";
import {
  PREMATURE_THRESHOLD_DAYS,
  computeMutterschutz,
  isPremature,
  unusedPreBirthDays,
} from "@/lib/timeline/mutterschutz";

const BASE: IntakeProfile = {
  due_date: "2026-11-15",
  bundesland: "hessen",
  city: "Frankfurt am Main",
  employment_status: "employed",
  insurance: "gkv",
  nationalities: ["India", "India"],
  marital_status: "unmarried",
  first_child: true,
};

const withBirth = (birth_date: string): IntakeProfile => ({ ...BASE, birth_date });

describe("before the birth", () => {
  it("starts six weeks before the due date and is an estimate", () => {
    const p = computeMutterschutz(BASE);
    expect(p.start).toBe("2026-10-04"); // the playbook's hand-verification date
    expect(p.certainty).toBe("estimated");
    expect(p.weeks_after).toBe(8);
    expect(p.premature).toBe(false);
    expect(p.end).toBe("2027-01-10"); // due + 56
  });

  it("satisfies the TimelinePeriod contract", () => {
    expect(TimelinePeriod.safeParse(computeMutterschutz(BASE)).success).toBe(true);
  });
});

describe("term birth", () => {
  it("runs eight weeks from the birth with nothing carried over", () => {
    const p = computeMutterschutz(withBirth("2026-11-15"));
    expect(p.premature).toBe(false);
    expect(p.weeks_after).toBe(8);
    expect(unusedPreBirthDays(withBirth("2026-11-15"))).toBe(0);
    expect(p.end).toBe("2027-01-10");
    expect(p.certainty).toBe("confirmed");
  });

  it("does not shorten the period after a late birth", () => {
    const profile = withBirth("2026-11-25"); // ten days late
    expect(unusedPreBirthDays(profile)).toBe(0);
    expect(computeMutterschutz(profile).end).toBe("2027-01-20"); // birth + 56
  });
});

describe("the premature branch", () => {
  it("does not fire at exactly 21 days early — the threshold is strictly greater", () => {
    const profile = withBirth("2026-10-25");
    expect(PREMATURE_THRESHOLD_DAYS).toBe(21);
    expect(isPremature(profile)).toBe(false);
    expect(computeMutterschutz(profile).weeks_after).toBe(8);
  });

  it("fires at 22 days early and switches to twelve weeks", () => {
    const profile = withBirth("2026-10-24");
    expect(isPremature(profile)).toBe(true);
    expect(computeMutterschutz(profile).weeks_after).toBe(12);
  });

  it("adds the unused pre-birth days to the period afterwards", () => {
    // Born 2026-10-18, 28 days early. Protection opened 2026-10-04, so 14 of the
    // 42 pre-birth days were used and 28 were not.
    const profile = withBirth("2026-10-18");
    expect(unusedPreBirthDays(profile)).toBe(28);

    const p = computeMutterschutz(profile);
    expect(p.premature).toBe(true);
    expect(p.weeks_after).toBe(12);
    // birth + 12 weeks (84) + 28 carried over = 112 days
    expect(p.end).toBe("2027-02-07");
  });

  it("carries over exactly the days lost, for a very early birth", () => {
    const profile = withBirth("2026-10-04"); // the day protection would have opened
    expect(unusedPreBirthDays(profile)).toBe(42);
    expect(computeMutterschutz(profile).end).toBe("2027-02-07"); // birth + 84 + 42
  });
});

describe("the manual override", () => {
  it("forces twelve weeks for a term birth (multiple birth, or a determined disability)", () => {
    const profile: IntakeProfile = { ...withBirth("2026-11-15"), premature: true };
    expect(isPremature(profile)).toBe(true);
    expect(computeMutterschutz(profile).weeks_after).toBe(12);
  });

  it("forces eight weeks even when the birth was very early", () => {
    const profile: IntakeProfile = { ...withBirth("2026-10-01"), premature: false };
    expect(isPremature(profile)).toBe(false);
    expect(computeMutterschutz(profile).weeks_after).toBe(8);
  });

  it("applies before the birth too", () => {
    expect(computeMutterschutz({ ...BASE, premature: true }).weeks_after).toBe(12);
  });
});
