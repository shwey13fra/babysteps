// Weekends, and the holiday gap stated out loud.
//
// Found on a real device, 2026-11-15: both exported items landed on Saturdays —
// `vaterschaftsanerkennung` on Sat 26 Dec 2026 and `standesamt_birth_registration`
// on Sat 2 Jan 2027. Two of two. The engine has no concept of a working day, so
// roughly two days in seven it points a parent at a closed office.
//
// ADR-079 rules that NOTHING shifts. Whether a deadline moves to the next
// working day is a legal question with a per-rule answer, and an engine that
// shifted it would be asserting law — rule 4's line. This module only answers
// "is this a day offices are normally open", and the product says so plainly.

import { describe, expect, it } from "vitest";
import { isNonWorkingDay, weekdayIndex, weekdayName } from "@/lib/timeline/working-days";

describe("weekdayIndex", () => {
  it("anchors correctly: 1970-01-01 was a Thursday", () => {
    expect(weekdayIndex("1970-01-01")).toBe(4);
    expect(weekdayName("1970-01-01")).toBe("Thursday");
  });

  it("names every day of one real week", () => {
    const week = [
      ["2026-11-15", "Sunday"],
      ["2026-11-16", "Monday"],
      ["2026-11-17", "Tuesday"],
      ["2026-11-18", "Wednesday"],
      ["2026-11-19", "Thursday"],
      ["2026-11-20", "Friday"],
      ["2026-11-21", "Saturday"],
    ] as const;
    for (const [iso, name] of week) expect(weekdayName(iso)).toBe(name);
  });

  it("works before the epoch, where a naive modulo goes negative", () => {
    expect(weekdayName("1969-12-31")).toBe("Wednesday");
    expect(weekdayIndex("1900-01-01")).toBe(1);
  });
});

describe("isNonWorkingDay", () => {
  it("flags the two dates the device check actually produced", () => {
    expect(isNonWorkingDay("2026-12-26", "hessen")).toBe(true); // Saturday
    expect(isNonWorkingDay("2027-01-02", "hessen")).toBe(true); // Saturday
  });

  it("flags Sundays", () => {
    expect(isNonWorkingDay("2026-11-15", "berlin")).toBe(true);
  });

  // The negative control (rule 16). A predicate that returned true for every
  // date would pass every assertion above while being useless.
  it("does NOT flag an ordinary weekday", () => {
    for (const iso of ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20"]) {
      expect(isNonWorkingDay(iso, "hessen")).toBe(false);
    }
  });

  it("answers the same for both Bundesländer while the holiday tables are empty", () => {
    expect(isNonWorkingDay("2026-12-25", "hessen")).toBe(isNonWorkingDay("2026-12-25", "berlin"));
  });
});

describe("the documented gap", () => {
  // THIS TEST ASSERTS A KNOWN HOLE, deliberately. 25 December 2026 is a Friday
  // and a public holiday across Germany; 1 January 2027 is a Friday and a public
  // holiday. We do not know either, because no verified holiday source has been
  // ingested — ADR-079 calls that a corpus problem, not an arithmetic one.
  //
  // When a holiday table lands, these two expectations FLIP, and that is the
  // signal to update them rather than a regression.
  it("misses public holidays that fall on a weekday", () => {
    expect(isNonWorkingDay("2026-12-25", "hessen")).toBe(false);
    expect(isNonWorkingDay("2027-01-01", "berlin")).toBe(false);
  });
});
