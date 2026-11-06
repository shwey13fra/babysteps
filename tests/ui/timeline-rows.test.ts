// The Phase 6 regression requirement:
//
//   "timeline screen dates must be identical to /dev/timeline engine output for
//    the same profile — add a test."
//
// /dev/timeline is a JSON dump of buildTimeline for a hardcoded profile, so
// asserting the screen's rows against buildTimeline output for that same profile
// IS asserting them against /dev/timeline. The profile below is copied from
// app/dev/timeline/page.tsx - the playbook's hand-verification case.
//
// This is the test that stops the screen and the engine diverging later. It is
// deliberately not a browser assertion: the row model is a pure function, so the
// check costs milliseconds and runs on every commit.

import { describe, expect, it } from "vitest";
import { buildTimeline, keyDate } from "@/lib/timeline";
import { IntakeProfile as IntakeProfileSchema, TimelineResponse } from "@/lib/schemas";
import type { IntakeProfile } from "@/lib/schemas";
import {
  chipFor,
  dateNoteFor,
  dotFor,
  formatGutterDate,
  formatLongDate,
  pregnancyWeek,
  stateFor,
  termToShow,
  toRow,
  toView,
  DO_NEXT_LIMIT,
} from "@/lib/ui/timeline-rows";

/** Copied verbatim from app/dev/timeline/page.tsx. */
const PROFILE: IntakeProfile = {
  due_date: "2026-11-15",
  bundesland: "hessen",
  city: "Frankfurt am Main",
  employment_status: "employed",
  insurance: "gkv",
  nationalities: ["India", "India"],
  marital_status: "unmarried",
  first_child: true,
};

/** Pinned, because a test that reads the clock measures the day it ran. */
const TODAY = "2026-10-04";
const BIRTH = "2026-11-09";
/**
 * A birth is recorded AFTER it happens, so the birth cases pin a today that
 * follows it. The first version of this ran the birth case against TODAY, five
 * weeks before the birth it had supposedly recorded - the assertions still held,
 * because they are about date propagation, but the fixture described a situation
 * that cannot occur and would have misled anyone reading it next.
 */
const TODAY_AFTER_BIRTH = "2026-11-10";

describe("the profile the engine is verified against is valid", () => {
  it("parses as an IntakeProfile", () => {
    // Guards every assertion below: a profile the schema rejects would make the
    // engine's own behaviour undefined.
    expect(IntakeProfileSchema.safeParse(PROFILE).success).toBe(true);
  });
});

describe("engine output satisfies the wire contract", () => {
  it("buildTimeline output parses as TimelineResponse", () => {
    // The screen renders from JSON that crossed /api/timeline. If the engine's
    // shape and the wire schema drift, this fails here rather than in a browser.
    const parsed = TimelineResponse.safeParse(buildTimeline(PROFILE, { today: TODAY }));
    expect(parsed.success).toBe(true);
  });

  it("holds for a recorded birth too", () => {
    const withBirth = { ...PROFILE, birth_date: BIRTH };
    expect(
      TimelineResponse.safeParse(buildTimeline(withBirth, { today: TODAY_AFTER_BIRTH })).success,
    ).toBe(true);
  });
});

describe("screen dates are identical to engine dates", () => {
  const cases: Array<{ label: string; profile: IntakeProfile; today: string }> = [
    { label: "due date only", profile: PROFILE, today: TODAY },
    {
      label: "birth recorded",
      profile: { ...PROFILE, birth_date: BIRTH },
      today: TODAY_AFTER_BIRTH,
    },
  ];

  for (const { label, profile, today } of cases) {
    describe(label, () => {
      const timeline = buildTimeline(profile, { today });

      it("produces rows at all, so the assertions below are not vacuous", () => {
        expect(timeline.items.length).toBeGreaterThan(5);
      });

      it("renders exactly one row per engine item, no drops and no duplicates", () => {
        const view = toView(
          TimelineResponse.parse(timeline),
          profile,
        );
        const rowIds = [...view.before, ...view.after].map((r) => r.id).sort();
        const itemIds = timeline.items.map((i) => i.id).sort();
        expect(rowIds).toEqual(itemIds);
      });

      it.each(timeline.items.map((i) => [i.id, i] as const))(
        "%s: the gutter ISO is the engine's keyDate",
        (_id, item) => {
          expect(toRow(item, timeline.as_of).iso).toBe(keyDate(item));
        },
      );

      it.each(timeline.items.map((i) => [i.id, i] as const))(
        "%s: the displayed date formats that same ISO, with no timezone drift",
        (_id, item) => {
          const row = toRow(item, timeline.as_of);
          const [, m, d] = row.iso.split("-");
          // Rebuilt from the ISO parts independently of the formatter under test.
          const expected = `${Number(d)} ${
            ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][Number(m) - 1]
          }`;
          expect(row.date).toBe(expected);
        },
      );
    });
  }

  it("the birth moves the rows by exactly the days the engine says", () => {
    // Ties the screen to the engine across a profile change, which is what
    // /birth will render in stage C.
    const before = buildTimeline(PROFILE, { today: TODAY });
    const after = buildTimeline({ ...PROFILE, birth_date: BIRTH }, { today: TODAY });
    const beforeRows = new Map(before.items.map((i) => [i.id, toRow(i, before.as_of)]));

    let moved = 0;
    for (const item of after.items) {
      const prev = beforeRows.get(item.id);
      if (!prev) continue;
      const row = toRow(item, after.as_of);
      if (row.iso !== prev.iso) moved += 1;
      // Whatever the row shows must equal what the engine computed, moved or not.
      expect(row.iso).toBe(keyDate(item));
    }
    expect(moved).toBeGreaterThan(0);
  });
});

describe("formatGutterDate does not go through Date()", () => {
  it.each([
    ["2026-01-01", "1 Jan"],
    ["2026-11-09", "9 Nov"],
    ["2026-12-31", "31 Dec"],
    ["2027-03-07", "7 Mar"],
  ])("%s renders as %s", (iso, expected) => {
    expect(formatGutterDate(iso)).toBe(expected);
  });

  it("renders the first of the month as the first, not the last of the previous one", () => {
    // The trap this avoids: `new Date("2026-01-01")` is midnight UTC, and in any
    // timezone west of UTC `getDate()` returns 31 December. A date gutter that
    // silently shifts a deadline by a day is the worst defect this screen could
    // have, and it would only appear for users in some timezones.
    expect(formatGutterDate("2026-01-01")).toBe("1 Jan");
    expect(formatLongDate("2026-01-01")).toBe("1 January");
  });
});

describe("pregnancyWeek", () => {
  it("puts the due date at the end of week 40", () => {
    expect(pregnancyWeek("2026-11-15", "2026-11-15")).toBe(40);
  });

  it("counts back a week at a time", () => {
    expect(pregnancyWeek("2026-11-15", "2026-11-08")).toBe(39);
    expect(pregnancyWeek("2026-11-15", "2026-10-04")).toBe(34);
  });

  it("returns null where a number would be noise rather than state", () => {
    expect(pregnancyWeek("2026-11-15", "2025-01-01")).toBeNull();
    expect(pregnancyWeek("2026-11-15", "2027-06-01")).toBeNull();
  });
});

describe("chips carry a number, never an exclamation mark", () => {
  const base = buildTimeline(PROFILE, { today: TODAY }).items[0];

  it("gives an overdue item a red chip reading how late it is", () => {
    const chip = chipFor({ ...base, status: "overdue", days_until_deadline: -3 });
    expect(chip).toEqual({ kind: "stop", text: "was due 3 days ago" });
  });

  it("singularises one day", () => {
    expect(chipFor({ ...base, status: "overdue", days_until_deadline: -1 })?.text).toBe(
      "was due 1 day ago",
    );
    expect(chipFor({ ...base, status: "urgent", days_until_deadline: 1 })?.text).toBe("in 1 day");
  });

  it("gives an urgent item an amber chip with the day count", () => {
    expect(chipFor({ ...base, status: "urgent", days_until_deadline: 9 })).toEqual({
      kind: "warn",
      text: "in 9 days",
    });
  });

  it("says due today rather than in 0 days", () => {
    expect(chipFor({ ...base, status: "urgent", days_until_deadline: 0 })?.text).toBe("due today");
  });

  it("gives an UPCOMING item no chip, even with a deadline inside fourteen days", () => {
    // status.ts ranks upcoming above urgent precisely so that Standesamt
    // registration does not show an amber countdown a week before the birth.
    // A chip driven by the day count instead of the status would undo that and
    // alarm a pregnant person about a deadline she cannot act on yet.
    expect(chipFor({ ...base, status: "upcoming", days_until_deadline: 7 })).toBeNull();
  });

  it("gives current and past items no chip", () => {
    expect(chipFor({ ...base, status: "current", days_until_deadline: undefined })).toBeNull();
    expect(chipFor({ ...base, status: "past", days_until_deadline: undefined })).toBeNull();
  });

  it("never renders an exclamation mark or the word urgent", () => {
    for (const status of ["overdue", "urgent"] as const) {
      for (const days of [-30, -1, 0, 1, 14]) {
        const text = chipFor({ ...base, status, days_until_deadline: days })?.text ?? "";
        expect(text).not.toContain("!");
        expect(text.toLowerCase()).not.toContain("urgent");
      }
    }
  });
});

describe("dots, borders and the estimated state", () => {
  const base = buildTimeline(PROFILE, { today: TODAY }).items[0];

  it("hollows the dot for an estimated date and fills it for a confirmed one", () => {
    expect(dotFor({ ...base, certainty: "estimated", status: "upcoming" })).toBe("hollow");
    expect(dotFor({ ...base, certainty: "confirmed", status: "upcoming" })).toBe("filled");
  });

  it("marks a past item done whatever its certainty", () => {
    expect(dotFor({ ...base, status: "past", certainty: "estimated" })).toBe("done");
    expect(stateFor({ ...base, status: "past" })).toBe("done");
  });

  it("gives only the current item the bordered card", () => {
    expect(stateFor({ ...base, status: "current" })).toBe("current");
    for (const status of ["urgent", "overdue", "upcoming"] as const) {
      expect(stateFor({ ...base, status })).toBe("plain");
    }
  });

  it("notes est. on an estimated row in the current year and the year otherwise", () => {
    const estThisYear = { ...base, certainty: "estimated" as const, window_open: "2026-12-01" };
    expect(dateNoteFor({ ...estThisYear, deadline: undefined }, "2026-10-04")).toBe("est.");
    const nextYear = { ...base, certainty: "estimated" as const, window_open: "2027-11-15" };
    expect(dateNoteFor({ ...nextYear, deadline: undefined }, "2026-10-04")).toBe("2027");
  });
});

describe("the view as a whole", () => {
  const timeline = TimelineResponse.parse(buildTimeline(PROFILE, { today: TODAY }));
  const view = toView(timeline, PROFILE);

  it("splits rows on the engine's as_of, not on a fresh clock reading", () => {
    for (const row of view.before) expect(row.iso < timeline.as_of).toBe(true);
    for (const row of view.after) expect(row.iso >= timeline.as_of).toBe(true);
    expect(view.before.length + view.after.length).toBe(timeline.items.length);
  });

  it("shows at most three actions in the do-next card", () => {
    expect(view.doNext.length).toBeLessThanOrEqual(DO_NEXT_LIMIT);
  });

  it("names both tracks for two Indian passports", () => {
    expect(view.header.profileLine).toContain("Indian consulate");
    expect(view.header.profileLine).toContain("Hessen");
  });

  it("drops the consular track when neither parent is Indian", () => {
    const german = { ...PROFILE, nationalities: ["Germany", "Germany"] as [string, string] };
    const v = toView(TimelineResponse.parse(buildTimeline(german, { today: TODAY })), german);
    expect(v.header.profileLine).not.toContain("Indian consulate");
  });

  it("keeps the due date visible after the birth is recorded", () => {
    // Human ruling, 2026-11-06: show both. Every pre-birth item is still
    // anchored to the due date, so replacing it hides what those rows count
    // from.
    const withBirth = { ...PROFILE, birth_date: BIRTH };
    const v = toView(
      TimelineResponse.parse(buildTimeline(withBirth, { today: TODAY_AFTER_BIRTH })),
      withBirth,
    );
    expect(v.header.dueDate).toBe("15 November");
    expect(v.header.birthDate).toBe("9 November");
  });

  it("reports no birth date before one is recorded", () => {
    expect(view.header.birthDate).toBeNull();
  });

  it("every metadata line says what the date is counted from", () => {
    // design-system.md rule 1: nothing on screen without provenance.
    for (const row of [...view.before, ...view.after]) {
      expect(row.metaLine).toMatch(/counted from (your due date|the birth)/);
    }
  });
});

describe("the German term is shown only when the title does not already carry it", () => {
  it("drops a term the English title already contains", () => {
    // "Register the birth at the Standesamt" + term_de "Standesamt" rendered as
    // "...at the Standesamt Standesamt" on both the timeline and the item page.
    expect(termToShow("Register the birth at the Standesamt", "Standesamt")).toBeNull();
  });

  it("keeps a term the title does not contain", () => {
    expect(termToShow("Start looking for a midwife", "Hebamme")).toBe("Hebamme");
  });

  it("returns null when a rule has no German term, as consular rules do not", () => {
    expect(termToShow("Register the birth with the consulate", undefined)).toBeNull();
  });

  it.each(
    buildTimeline(PROFILE, { today: TODAY }).items.map((i) => [i.id, i] as const),
  )("%s never renders its German term twice", (_id, item) => {
    const shown = termToShow(item.title_en, item.term_de);
    if (shown !== null) expect(item.title_en).not.toContain(shown);
  });
});
