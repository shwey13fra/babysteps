// F5 — the calendar file, against RFC 5545 rather than against my memory of it.
//
// This file leaves the building. Months later a parent opens their calendar
// with none of our UI around the entry, so every promise the product makes has
// to survive inside a DESCRIPTION: what the date is, what kind of deadline it
// is (rule 12), that it is estimated if it is, and where it came from.
//
// The folding tests are the ones that matter most. Folding is counted in
// OCTETS, and this product's content is German: a character-counting fold is
// silently correct in English and silently wrong on "Vaterschaftsanerkennung
// für das Kind". That is the defect most likely to make a real calendar reject
// the file, and the device check is the expensive place to discover it.

import { describe, expect, it } from "vitest";
import {
  buildCalendar,
  escapeText,
  foldLine,
  toIcsDate,
  toIcsTimestamp,
  type IcsEvent,
} from "@/lib/ics/calendar";

const NOW = new Date("2026-11-15T10:30:00.000Z");

const EVENT: IcsEvent = {
  uid: "standesamt_birth_registration@babysteps-germany",
  date: "2026-11-22",
  summary: "Register the birth at the Standesamt",
  description: "First paragraph.\n\nSecond paragraph.",
  url: "http://localhost:3000/item/standesamt_birth_registration",
};

function octets(s: string): number {
  return new TextEncoder().encode(s).length;
}

describe("escaping, per RFC 5545 §3.3.11", () => {
  it("escapes the backslash FIRST, or it escapes its own escapes", () => {
    expect(escapeText("a\\b")).toBe("a\\\\b");
    expect(escapeText("a;b")).toBe("a\\;b");
    expect(escapeText("a,b")).toBe("a\\,b");
  });

  it("turns real newlines into the literal \\n a DESCRIPTION carries", () => {
    expect(escapeText("one\ntwo")).toBe("one\\ntwo");
    expect(escapeText("one\r\ntwo")).toBe("one\\ntwo");
  });

  it("leaves German text alone", () => {
    expect(escapeText("Vaterschaftsanerkennung")).toBe("Vaterschaftsanerkennung");
    expect(escapeText("für das Kind")).toBe("für das Kind");
  });
});

describe("folding, counted in octets and never inside a character", () => {
  it("leaves a short line untouched", () => {
    expect(foldLine("SUMMARY:short")).toBe("SUMMARY:short");
  });

  it("never emits a line over 75 octets", () => {
    const line = "DESCRIPTION:" + "a".repeat(400);
    for (const part of foldLine(line).split("\r\n")) {
      expect(octets(part)).toBeLessThanOrEqual(75);
    }
  });

  it("continuation lines begin with exactly one space", () => {
    const folded = foldLine("DESCRIPTION:" + "a".repeat(200)).split("\r\n");
    expect(folded.length).toBeGreaterThan(1);
    for (const part of folded.slice(1)) expect(part.startsWith(" ")).toBe(true);
  });

  it("folds German by OCTETS, so an umlaut line is not left over-long", () => {
    // 70 "ä" is 70 characters but 140 octets. A character-counting fold would
    // return this unchanged and produce a line no strict parser accepts.
    const line = "SUMMARY:" + "ä".repeat(70);
    expect(line.length).toBeLessThan(80);
    expect(octets(line)).toBeGreaterThan(75);
    for (const part of foldLine(line).split("\r\n")) {
      expect(octets(part)).toBeLessThanOrEqual(75);
    }
  });

  it("never splits a multi-byte character across a fold", () => {
    const folded = foldLine("SUMMARY:" + "ä".repeat(120));
    // A split UTF-8 sequence survives a round trip only as U+FFFD.
    expect(folded).not.toContain("�");
    expect(folded.replace(/\r\n /g, "")).toBe("SUMMARY:" + "ä".repeat(120));
  });

  it("rejoins to exactly the original content", () => {
    const line = "DESCRIPTION:" + "Geburtsurkunde und Vaterschaftsanerkennung ".repeat(12);
    expect(foldLine(line).replace(/\r\n /g, "")).toBe(line);
  });
});

describe("dates and stamps", () => {
  it("renders an all-day DATE from the ISO parts", () => {
    expect(toIcsDate("2026-11-22")).toBe("20261122");
  });

  it("renders DTSTAMP as a UTC basic-format timestamp", () => {
    expect(toIcsTimestamp(NOW)).toBe("20261115T103000Z");
  });
});

describe("the calendar as a whole", () => {
  const ics = buildCalendar([EVENT], NOW);

  it("is wrapped and versioned", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("PRODID:-//BabySteps Germany//Timeline//EN");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("uses CRLF everywhere, including the last line", () => {
    expect(ics.split("\n").every((l, i, a) => i === a.length - 1 || l.endsWith("\r"))).toBe(true);
  });

  it("carries every property RFC 5545 requires on a VEVENT", () => {
    for (const required of ["BEGIN:VEVENT", "UID:", "DTSTAMP:", "DTSTART;VALUE=DATE:", "END:VEVENT"]) {
      expect(ics).toContain(required);
    }
  });

  it("is an all-day event with no DTEND, so no client draws it across two days", () => {
    expect(ics).toContain("DTSTART;VALUE=DATE:20261122");
    expect(ics).not.toContain("DTEND");
  });

  it("does not block the parent's calendar", () => {
    expect(ics).toContain("TRANSP:TRANSPARENT");
  });

  it("every line in a generated file is within 75 octets", () => {
    const long: IcsEvent = {
      ...EVENT,
      summary: "Vaterschaftsanerkennung für das Kind beim Standesamt erklären",
      description: "Ohne Geburtsurkunde geht nichts weiter. ".repeat(20),
    };
    for (const line of buildCalendar([long], NOW).split("\r\n")) {
      expect(octets(line)).toBeLessThanOrEqual(75);
    }
  });

  it("emits one VEVENT per item", () => {
    const two = buildCalendar([EVENT, { ...EVENT, uid: "b@x", date: "2027-01-14" }], NOW);
    expect(two.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(two.match(/END:VEVENT/g)).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// ADR-085 — no METHOD property. Ruled 2026-11-16 after Stage F.
// ---------------------------------------------------------------------------
//
// There was no test here at all. `METHOD:PUBLISH` was written by one line in
// lib/ics/calendar.ts and asserted by nothing, so neither its removal nor its
// return would have been noticed. That is the gap this block closes.
describe("the calendar declares no iTIP method", () => {
  const event = {
    uid: "x@babysteps-germany",
    date: "2027-06-08",
    summary: "Register the birth",
    description: "A deadline, not a meeting.",
    url: "https://example.invalid/item/x",
  };
  const ics = buildCalendar([event], new Date("2026-11-16T09:00:00Z"));
  const lines = ics.split("\r\n");

  it("writes no METHOD line", () => {
    // METHOD belongs to iTIP (RFC 5546) and marks a file as scheduling traffic
    // between an organiser and attendees. This file names no organiser and
    // invites nobody, so claiming to be one was wrong on its own terms.
    expect(lines.filter((l) => l.startsWith("METHOD"))).toEqual([]);
  });

  it("names no ORGANIZER and no ATTENDEE either, which is why METHOD was wrong", () => {
    expect(lines.filter((l) => l.startsWith("ORGANIZER"))).toEqual([]);
    expect(lines.filter((l) => l.startsWith("ATTENDEE"))).toEqual([]);
  });

  it("still carries everything RFC 5545 requires of a VCALENDAR", () => {
    // METHOD is optional (§3.7.2). PRODID and VERSION are not.
    expect(lines).toContain("BEGIN:VCALENDAR");
    expect(lines).toContain("VERSION:2.0");
    expect(lines.some((l) => l.startsWith("PRODID:"))).toBe(true);
    expect(lines).toContain("CALSCALE:GREGORIAN");
    expect(lines).toContain("END:VCALENDAR");
    expect(lines.some((l) => l.startsWith("UID:"))).toBe(true);
    expect(lines.some((l) => l.startsWith("DTSTAMP:"))).toBe(true);
  });

  // Negative control (CLAUDE.md rule 16). Four gates have now been caught on
  // their way to failing open, so a matcher that cannot go red is not accepted.
  it("the METHOD matcher can still fail", () => {
    const withMethod = ["BEGIN:VCALENDAR", "METHOD:PUBLISH", "END:VCALENDAR"];
    expect(withMethod.filter((l) => l.startsWith("METHOD"))).not.toEqual([]);
  });
});
