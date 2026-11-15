// The one alert per event, and what it is allowed to say.
//
// WHY THIS EXISTS AT ALL. The button deliberately promises no reminders, and
// for a while the file carried no VALARM either. The 2026-11-15 device check
// measured what that actually produces, and the two engines disagreed: Apple
// showed `Alert: None`, Google applied its own account default and scheduled an
// e-mail at **11:30pm the night before**. Neither was ours. With no reminder
// loop in the beta the calendar IS the reminder, so "whatever the client does"
// is not a design — it is an absence being mistaken for one.
//
// Three things are asserted here, and the third is the one that can do harm:
//   1. ONE alarm per event. Twelve events firing twice is how a parent mutes
//      the whole calendar, and a muted calendar reminds nobody of anything.
//   2. It fires at 09:00 on the day the window OPENS, not on the deadline.
//   3. It says nothing alarming, nothing that reads as statutory on an advisory
//      item (rule 12), and never states an outcome (rule 13).

import { describe, expect, it } from "vitest";
import { buildTimeline } from "@/lib/timeline";
import { keyDate } from "@/lib/timeline/key-date";
import { diffDays } from "@/lib/timeline/dates";
import type { IntakeProfile, TimelineItem } from "@/lib/schemas";
import { buildCalendar, icsDuration } from "@/lib/ics/calendar";
import { eventAlarm, eventSummary, toEvents } from "@/lib/ics/events";

const SITE = "https://babysteps-germany.vercel.app";
const NOW = new Date("2026-11-15T12:00:00Z");

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

function unfold(ics: string): string {
  return ics.replace(/\r\n[ \t]/g, "");
}

describe("icsDuration", () => {
  it("renders the day/hour form real calendars emit", () => {
    expect(icsDuration(-159)).toBe("-P6DT15H"); // 09:00, seven days before
    expect(icsDuration(9)).toBe("PT9H"); // 09:00 on the day itself
    expect(icsDuration(-24)).toBe("-P1D");
    expect(icsDuration(-168)).toBe("-P7D");
    expect(icsDuration(-15)).toBe("-PT15H");
  });

  it("never emits a bare P, which is not a valid duration", () => {
    expect(icsDuration(0)).toBe("PT0S");
    for (const h of [-168, -159, -24, -15, -1, 0, 9, 25, 48]) {
      expect(icsDuration(h)).toMatch(/^-?P(\d+D)?(T\d+[HS])?$/);
      expect(icsDuration(h)).not.toBe("P");
      expect(icsDuration(h)).not.toBe("-P");
    }
  });
});

describe("one alarm, correctly timed", () => {
  it("gives every event exactly one VALARM", () => {
    const ics = unfold(buildCalendar(toEvents(items(), SITE, "hessen"), NOW));
    const events = (ics.match(/BEGIN:VEVENT/g) ?? []).length;
    const begins = (ics.match(/BEGIN:VALARM/g) ?? []).length;
    const ends = (ics.match(/END:VALARM/g) ?? []).length;

    expect(events).toBeGreaterThan(5);
    expect(begins).toBe(events);
    expect(ends).toBe(events);
  });

  it("carries the fields RFC 5545 §3.6.6 requires on a DISPLAY alarm", () => {
    const ics = unfold(buildCalendar(toEvents(items(), SITE, "hessen"), NOW));
    const blocks = ics.split("BEGIN:VALARM").slice(1).map((b) => b.split("END:VALARM")[0]);
    expect(blocks.length).toBeGreaterThan(5);
    for (const block of blocks) {
      expect(block).toContain("ACTION:DISPLAY");
      expect(block).toMatch(/TRIGGER;RELATED=START:-?P/);
      expect(block).toMatch(/DESCRIPTION:\S/);
    }
  });

  it("fires at 09:00 on the day the window opens, not on the deadline", () => {
    for (const item of items()) {
      const daysBefore = diffDays(item.window_open, keyDate(item));
      // DTSTART is midnight on keyDate. Going back `daysBefore` days lands on
      // window_open at 00:00; +9h is 09:00 that morning.
      expect(eventAlarm(item).offsetHours).toBe(9 - daysBefore * 24);
    }
  });

  // Every one of the twelve rules currently carries a deadline, so the
  // coincident-date branch is defensive rather than reachable. Asserted on a
  // synthetic item, and the population fact is pinned below so that if a rule
  // without a deadline is ever added, the pin fails and someone reads this.
  it("uses a plain +9h when window_open and the key date coincide", () => {
    const sameDay = { window_open: "2027-01-02", deadline: undefined } as unknown as TimelineItem;
    expect(eventAlarm({ ...sameDay, certainty: "confirmed", title_en: "T" } as TimelineItem).offsetHours).toBe(9);
  });

  it("pins the fact that every current rule has a deadline and a positive window", () => {
    for (const item of items()) {
      expect(item.deadline).toBeDefined();
      expect(diffDays(item.window_open, keyDate(item))).toBeGreaterThan(0);
    }
  });

  it("puts the alarm BEFORE the event for anything with a real window", () => {
    const withWindow = items().filter((i) => diffDays(i.window_open, keyDate(i)) > 0);
    expect(withWindow.length).toBeGreaterThan(0);
    for (const item of withWindow) expect(eventAlarm(item).offsetHours).toBeLessThan(0);
  });
});

describe("what the alert is allowed to say", () => {
  // The vocabulary a reminder must never reach for. This product's register is
  // the same everywhere: name the thing, name who decides, never push.
  const URGENCY =
    /\b(urgent|hurry|immediately|asap|act now|last chance|don't miss|do not miss|final notice|warning|critical)\b/i;

  it("names the thing and nothing more, on a confirmed date", () => {
    const confirmed = items().filter((i) => i.certainty === "confirmed");
    for (const item of confirmed) {
      expect(eventAlarm(item).description).toBe(eventSummary(item));
    }
  });

  it("says the date is estimated when it is", () => {
    const estimated = items().filter((i) => i.certainty === "estimated");
    expect(estimated.length).toBeGreaterThan(0);
    for (const item of estimated) {
      const text = eventAlarm(item).description;
      expect(text).toContain(eventSummary(item));
      expect(text).toContain("estimated");
      // An alert on a guessed date must offer the thing that makes it exact.
      expect(text).toContain("will move when the birth is recorded");
    }
  });

  it("uses no urgency language on any item", () => {
    for (const item of items()) {
      expect(eventAlarm(item).description).not.toMatch(URGENCY);
    }
  });

  // NEGATIVE CONTROL (CLAUDE.md rule 16). The matcher above must be able to
  // fail, or the assertion before it is decoration.
  it("the urgency matcher actually catches urgency", () => {
    expect("Act now — last chance to file").toMatch(URGENCY);
    expect("URGENT: your deadline").toMatch(URGENCY);
    expect("Register the birth at the Standesamt").not.toMatch(URGENCY);
  });

  it("never calls an advisory or soft deadline statutory (rule 12)", () => {
    const soft = items().filter((i) => i.deadline && i.deadline.kind !== "hard");
    expect(soft.length).toBeGreaterThan(0);
    for (const item of soft) {
      expect(eventAlarm(item).description).not.toMatch(/statutory|required by law|legal deadline/i);
    }
  });

  // NEGATIVE CONTROL for rule 12's matcher.
  it("the rule-12 matcher actually catches the forbidden words", () => {
    expect("This is a statutory deadline").toMatch(/statutory|required by law|legal deadline/i);
    expect("Practice, not law").not.toMatch(/statutory|required by law|legal deadline/i);
  });

  it("states no entitlement, amount or outcome (rule 13)", () => {
    for (const item of items()) {
      expect(eventAlarm(item).description).not.toMatch(/you (will|would) (get|receive|be paid)|€\s?\d|you qualify|you are entitled/i);
    }
  });
});

describe("the alarm survives serialisation", () => {
  it("appears inside the VEVENT, after TRANSP and before END:VEVENT", () => {
    const ics = unfold(buildCalendar(toEvents(items().slice(0, 1), SITE, "hessen"), NOW));
    const vevent = ics.split("BEGIN:VEVENT")[1].split("END:VEVENT")[0];
    expect(vevent.indexOf("TRANSP:TRANSPARENT")).toBeLessThan(vevent.indexOf("BEGIN:VALARM"));
    expect(vevent).toContain("END:VALARM");
  });

  it("escapes a description containing a comma or semicolon", () => {
    const ics = unfold(
      buildCalendar(
        [
          {
            uid: "x@babysteps-germany",
            date: "2027-01-02",
            summary: "S",
            description: "D",
            alarm: { offsetHours: 9, description: "One, two; three" },
          },
        ],
        NOW,
      ),
    );
    expect(ics).toContain("DESCRIPTION:One\\, two\\; three");
  });

  it("writes no VALARM when the event has none", () => {
    const ics = buildCalendar(
      [{ uid: "x@babysteps-germany", date: "2027-01-02", summary: "S", description: "D" }],
      NOW,
    );
    expect(ics).not.toContain("VALARM");
  });
});
