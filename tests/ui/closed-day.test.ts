// ADR-079 — the deadline that lands on a Saturday.
//
// Found on a real device, 2026-11-15: both items a parent exported fell on
// Saturdays. The engine has no concept of a working day, so roughly two days in
// seven it points at a closed office, and nothing noticed across 760 tests.
//
// THE DATE IS NOT MOVED, and these tests are the guard on that. Whether a
// deadline shifts to the next working day is a legal question with a per-rule
// answer that we have not verified against any source; an engine that shifted
// it would be asserting law, which rule 4 forbids. What the product does
// instead is say the true thing beside the date, in the three places that must
// agree: the item page, the timeline row, and the calendar entry.

import { describe, expect, it } from "vitest";
import { buildTimeline } from "@/lib/timeline";
import { keyDate } from "@/lib/timeline/key-date";
import { isNonWorkingDay, weekdayName } from "@/lib/timeline/working-days";
import { closedDayLine, closedDayShort } from "@/lib/ui/item-view";
import { toView } from "@/lib/ui/timeline-rows";
import { eventDescription } from "@/lib/ics/events";
import type { IntakeProfile, TimelineItem } from "@/lib/schemas";

const SITE = "https://babysteps-germany.vercel.app";

const PROFILE: IntakeProfile = {
  due_date: "2026-12-26",
  bundesland: "hessen",
  city: "Frankfurt am Main",
  employment_status: "employed",
  insurance: "gkv",
  nationalities: ["India", "India"],
  marital_status: "married",
  first_child: true,
};

function items(): TimelineItem[] {
  return buildTimeline(PROFILE).items as TimelineItem[];
}

describe("closedDayLine", () => {
  it("says the date, the weekday, and where to check", () => {
    const line = closedDayLine("2027-01-02", "hessen");
    expect(line).toContain("2 January 2027");
    expect(line).toContain("Saturday");
    expect(line).toContain("check the opening hours");
  });

  it("carries the YEAR, because a calendar entry is read with nothing around it", () => {
    expect(closedDayLine("2027-01-02", "hessen")).toContain("2027");
  });

  it("is silent on a working day", () => {
    expect(closedDayLine("2026-11-16", "hessen")).toBeNull();
    expect(closedDayLine("2026-11-20", "berlin")).toBeNull();
  });

  it("is silent on a malformed date rather than guessing", () => {
    expect(closedDayLine("not-a-date", "hessen")).toBeNull();
    expect(closedDayLine("2026-13-01", "hessen")).toBeNull();
  });

  // THE CLAIM WE ARE NOT MAKING. We have no source for any office's opening
  // hours — nothing in the corpus carries them, and some Standesämter do open
  // on a Saturday for weddings. The sentence states a general norm and sends
  // the reader to the authority; it must never assert that a specific office is
  // shut, which would be the one thing this product never does.
  it("does not assert that a particular office is closed", () => {
    const line = closedDayLine("2027-01-02", "hessen") ?? "";
    expect(line).not.toMatch(/the office (is|will be) closed/i);
    expect(line).toMatch(/normally closed/i);
  });

  it("never tells the reader the deadline has moved", () => {
    const line = closedDayLine("2027-01-02", "hessen") ?? "";
    expect(line).not.toMatch(/moved to|next working day|extended|instead/i);
  });
});

describe("closedDayShort", () => {
  it("compresses to a clause for the row's single metadata line", () => {
    expect(closedDayShort("2027-01-02", "hessen")).toBe("falls on a Saturday");
    expect(closedDayShort("2026-11-15", "berlin")).toBe("falls on a Sunday");
  });

  it("is silent on a working day", () => {
    expect(closedDayShort("2026-11-18", "hessen")).toBeNull();
  });
});

describe("the three surfaces agree", () => {
  const weekend = () => items().filter((i) => isNonWorkingDay(keyDate(i), "hessen"));

  it("has something to test — this profile really does land items on weekends", () => {
    expect(weekend().length).toBeGreaterThan(0);
  });

  it("the timeline row carries the clause on its existing metadata line", () => {
    const view = toView(buildTimeline(PROFILE), PROFILE);
    const rows = [...view.before, ...view.after];
    for (const item of weekend()) {
      const row = rows.find((r) => r.id === item.id);
      expect(row, item.id).toBeDefined();
      expect(row!.metaLine, item.id).toContain("falls on a");
    }
  });

  // NEGATIVE CONTROL (rule 16). A clause appended unconditionally would satisfy
  // every assertion above while being wrong about five days in seven.
  it("the row says nothing when the date is a working day", () => {
    const view = toView(buildTimeline(PROFILE), PROFILE);
    const rows = [...view.before, ...view.after];
    const weekday = items().filter((i) => !isNonWorkingDay(keyDate(i), "hessen"));
    expect(weekday.length).toBeGreaterThan(0);
    for (const item of weekday) {
      const row = rows.find((r) => r.id === item.id);
      expect(row!.metaLine, item.id).not.toContain("falls on a");
    }
  });

  it("the do-next card carries it too, on its separate code path", () => {
    const view = toView(buildTimeline(PROFILE), PROFILE);
    for (const row of view.doNext) {
      const item = items().find((i) => i.id === row.id)!;
      const expected = isNonWorkingDay(keyDate(item), "hessen");
      expect(row.metaLine.includes("falls on a"), row.id).toBe(expected);
    }
  });

  it("the calendar DESCRIPTION carries the full sentence", () => {
    for (const item of weekend()) {
      const text = eventDescription(item, SITE, "hessen");
      // The actual weekday, not a hard-coded one: this profile lands items on
      // both a Saturday and a Sunday, and an assertion naming only Saturday
      // passed for the wrong reason until it met the Sunday.
      expect(text, item.id).toContain(`is a ${weekdayName(keyDate(item))}`);
      expect(text, item.id).toContain("check the opening hours");
    }
  });

  it("the calendar DESCRIPTION omits it on a working day", () => {
    const weekday = items().filter((i) => !isNonWorkingDay(keyDate(i), "hessen"));
    for (const item of weekday) {
      expect(eventDescription(item, SITE, "hessen"), item.id).not.toContain("check the opening hours");
    }
  });

  it("omits it entirely when no Bundesland was supplied, rather than guessing", () => {
    for (const item of weekend()) {
      expect(eventDescription(item, SITE)).not.toContain("check the opening hours");
    }
  });
});

describe("a marked-done row drops the clause", () => {
  // Same reasoning as the dropped countdown chip (ADR-072): the reader has told
  // us this step is finished, and "falls on a Saturday" is the product arguing
  // with them about a trip they have already made.
  it("says Marked done and nothing about the weekday", () => {
    const weekendItem = items().find((i) => isNonWorkingDay(keyDate(i), "hessen"))!;
    const view = toView(buildTimeline(PROFILE), PROFILE, [weekendItem.id]);
    const row = [...view.before, ...view.after].find((r) => r.id === weekendItem.id)!;
    expect(row.done).toBe(true);
    expect(row.metaLine).toContain("Marked done");
    expect(row.metaLine).not.toContain("falls on a");
  });
});
