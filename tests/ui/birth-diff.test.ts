// F2b's diff, and the birth-preview seam behind it.
//
// The sort order here is the defect worth guarding: the rows are sorted on the
// ISO dates BEFORE formatting, because sorting the formatted strings is silent
// and wrong - "16 Nov" sorts above "9 Feb" alphabetically, so a February
// deadline would be listed before a November one. The first version did exactly
// that.

import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/birth-preview/route";
import { BirthPreviewResponse } from "@/lib/schemas";
import type { IntakeProfile, TimelinePeriod } from "@/lib/schemas";
import { computeDateChanges, keyDate, buildTimeline } from "@/lib/timeline";
import {
  describeAllMoves,
  describeArrival,
  describeMove,
  diffHeading,
  mutterschutzNote,
  toDiffRows,
  toDiffView,
} from "@/lib/ui/birth-diff";

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

/** Derived from the clock: IntakeProfile refuses a birth_date in the future. */
const ASOF = "2026-11-06";

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

function post(body: unknown, raw?: string): Request {
  return new Request("http://localhost/api/birth-preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw ?? JSON.stringify(body),
  });
}

const period = (weeks: 8 | 12, premature: boolean): TimelinePeriod => ({
  id: "mutterschutz",
  start: "2026-10-04",
  end: "2027-01-10",
  weeks_after: weeks,
  premature,
  certainty: "confirmed",
});

describe("diff rows are ordered by date, not by formatted string", () => {
  it("puts February before November", () => {
    const rows = toDiffRows([
      { id: "b", title: "Later", from: "2026-11-01", to: "2026-11-16" },
      { id: "a", title: "Sooner", from: "2027-02-20", to: "2027-02-09" },
    ], ASOF);
    // Sorted on ISO: 2026-11-16 comes first. Sorted on "16 Nov" vs "9 Feb" it
    // would not.
    expect(rows.map((r) => r.id)).toEqual(["b", "a"]);
    expect(rows[0].to).toBe("16 Nov");
    // Carries its year, because it is not in the year the diff was made.
    expect(rows[1].to).toBe("9 Feb 2027");
  });

  it("breaks a tie on id, so the order is stable", () => {
    const rows = toDiffRows([
      { id: "z", title: "Z", from: "2026-01-01", to: "2026-03-03" },
      { id: "a", title: "A", from: "2026-01-01", to: "2026-03-03" },
    ], ASOF);
    expect(rows.map((r) => r.id)).toEqual(["a", "z"]);
  });

  it("reports how far each date moved, using the engine's day counting", () => {
    const rows = toDiffRows([{ id: "x", title: "X", from: "2026-11-22", to: "2026-11-16" }], ASOF);
    expect(rows[0].movedDays).toBe(-6);
    expect(describeMove(rows[0].movedDays)).toBe("6 days earlier");
  });
});

describe("the words under the diff", () => {
  it("describes a move in either direction, and singularises one day", () => {
    expect(describeMove(-1)).toBe("1 day earlier");
    expect(describeMove(3)).toBe("3 days later");
    expect(describeMove(0)).toBe("same day");
  });

  it("describes the arrival against the due date", () => {
    expect(describeArrival(6)).toBe("6 days early");
    expect(describeArrival(-2)).toBe("2 days late");
    expect(describeArrival(0)).toBe("on the due date");
    expect(describeArrival(1)).toBe("1 day early");
  });

  it("writes the heading in words, as the mockup does", () => {
    expect(diffHeading(9)).toBe("Nine dates will move");
    expect(diffHeading(1)).toBe("One date will move");
    expect(diffHeading(0)).toBe("No dates move");
    // Above the table it falls back to digits rather than inventing a word.
    expect(diffHeading(21)).toBe("21 dates will move");
  });
});

describe("the Mutterschutz note", () => {
  it("reports the twelve-week period when the birth was early enough", () => {
    const note = mutterschutzNote(period(8, false), period(12, true), 30, 21);
    expect(note.changed).toBe(true);
    expect(note.text).toContain("twelve weeks");
    expect(note.text).toContain("instead of eight");
    expect(note.text).toContain("MuSchG §3(2)");
  });

  it("says the period stays at eight weeks for a birth inside the normal range", () => {
    const note = mutterschutzNote(period(8, false), period(8, false), 6, 21);
    expect(note.changed).toBe(false);
    expect(note.text).toContain("stays at eight weeks");
    expect(note.text).toContain("6 days early");
    expect(note.text).toContain("inside the normal range");
  });

  it("says a late birth does not shorten the period", () => {
    const note = mutterschutzNote(period(8, false), period(8, false), -4, 21);
    expect(note.text).toContain("does not shorten it");
    expect(note.text).toContain("4 days late");
  });

  it("never predicts an amount or an entitlement", () => {
    // Rule 13. The note states the rule and cites the provision; it must not
    // say what the reader will receive or be granted.
    for (const days of [-5, 0, 6, 30]) {
      const note = mutterschutzNote(period(8, false), period(days > 21 ? 12 : 8, days > 21), days, 21);
      expect(note.text).not.toMatch(/you (will|would) (get|receive|be entitled|be granted)/i);
      expect(note.text).not.toMatch(/€|EUR|euro/i);
    }
  });
});

describe("POST /api/birth-preview", () => {
  const BIRTH = daysAgo(6);

  it("returns a body the contract accepts", async () => {
    const res = await POST(post({ profile: PROFILE, birth_date: BIRTH }));
    expect(res.status).toBe(200);
    expect(BirthPreviewResponse.safeParse(await res.json()).success).toBe(true);
  });

  it("returns exactly what computeDateChanges returns", async () => {
    // The seam must not transform the diff on the way through.
    const body = BirthPreviewResponse.parse(
      await (await POST(post({ profile: PROFILE, birth_date: BIRTH }))).json(),
    );
    const direct = computeDateChanges(PROFILE, { ...PROFILE, birth_date: BIRTH });
    expect(body.changes.map((c) => [c.id, c.from, c.to])).toEqual(
      direct.map((c) => [c.id, c.from, c.to]),
    );
  });

  it("moves at least one date for a birth before the due date", async () => {
    const body = BirthPreviewResponse.parse(
      await (await POST(post({ profile: PROFILE, birth_date: BIRTH }))).json(),
    );
    expect(body.changes.length).toBeGreaterThan(0);
    expect(body.days_early).toBeGreaterThan(0);
  });

  it("agrees with the timeline about where each moved date lands", async () => {
    // What the diff promises and what the timeline then shows must be the same
    // day, or the screen that proves the product works contradicts the next one.
    const body = BirthPreviewResponse.parse(
      await (await POST(post({ profile: PROFILE, birth_date: BIRTH }))).json(),
    );
    const after = buildTimeline({ ...PROFILE, birth_date: BIRTH });
    const byId = new Map(after.items.map((i) => [i.id, keyDate(i)]));
    for (const change of body.changes) expect(byId.get(change.id)).toBe(change.to);
  });

  it("commits nothing: the profile it was given is unchanged", async () => {
    const snapshot = JSON.stringify(PROFILE);
    await POST(post({ profile: PROFILE, birth_date: BIRTH }));
    expect(JSON.stringify(PROFILE)).toBe(snapshot);
  });

  it("refuses a birth date in the future", async () => {
    const future = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
    const res = await POST(post({ profile: PROFILE, birth_date: future }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_birth_date");
  });

  it("refuses a malformed birth date", async () => {
    const res = await POST(post({ profile: PROFILE, birth_date: "09/11/2026" }));
    expect(res.status).toBe(400);
  });

  it("refuses an invalid profile", async () => {
    const res = await POST(post({ profile: { due_date: "2026-11-15" }, birth_date: BIRTH }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_profile");
  });

  it("refuses a malformed body", async () => {
    expect((await POST(post(undefined, "{nope"))).status).toBe(400);
  });

  it("never caches", async () => {
    const res = await POST(post({ profile: PROFILE, birth_date: BIRTH }));
    expect(res.headers.get("Cache-Control") ?? "").toContain("no-store");
  });

  it("refuses GET, so a candidate birth date cannot sit in a URL", async () => {
    const res = GET();
    expect(res.status).toBe(405);
  });
});

describe("toDiffView ties it together", () => {
  it("builds heading, rows and note from one response", async () => {
    const BIRTH = daysAgo(6);
    const body = BirthPreviewResponse.parse(
      await (await POST(post({ profile: PROFILE, birth_date: BIRTH }))).json(),
    );
    const view = toDiffView(body);
    expect(view.rows.length).toBe(body.changes.length);
    expect(view.heading).toMatch(/date/);
    expect(view.arrival).toContain("early");
    expect(view.note.text).toContain("MuSchG §3(2)");
  });
});

describe("describeAllMoves checks rather than assumes", () => {
  const row = (id: string, from: string, to: string) => ({ id, title: id, from, to });

  it("states the shared move when every date moved the same distance", () => {
    const rows = toDiffRows([row("a", "2026-11-22", "2026-11-09"), row("b", "2027-01-14", "2027-01-01")], ASOF);
    expect(describeAllMoves(rows)).toBe("Every date above moved 13 days earlier.");
  });

  it("refuses to claim a shared move when they disagree", () => {
    // The claim "every date moved 13 days earlier" is false the moment one of
    // them did not, and this screen's only job is to be believable.
    const rows = toDiffRows([row("a", "2026-11-22", "2026-11-09"), row("b", "2027-01-14", "2027-01-05")], ASOF);
    expect(describeAllMoves(rows)).toBe("These dates did not all move by the same amount.");
  });

  it("uses the singular for one row", () => {
    expect(describeAllMoves(toDiffRows([row("a", "2026-11-22", "2026-11-09")], ASOF))).toBe(
      "It moved 13 days earlier.",
    );
  });

  it("says nothing when there is nothing to say", () => {
    expect(describeAllMoves([])).toBeNull();
  });

  it("never lowercases a German noun", async () => {
    // "for register the birth at the standesamt" - the earlier sentence
    // lowercased the whole title to splice it into prose, which is wrong for a
    // German noun and for a proper one.
    const body = BirthPreviewResponse.parse(
      await (await POST(post({ profile: PROFILE, birth_date: daysAgo(6) }))).json(),
    );
    const view = toDiffView(body);
    expect(view.moves ?? "").not.toMatch(/standesamt|elterngeld|kindergeld/);
  });
});

describe("a date outside the current year shows its year", () => {
  it("renders a consular item a year out as 4 Nov 2027, not 4 Nov", () => {
    // Found in the browser during the Phase 6 VERIFY: the consular rows read
    // "10 Nov -> 4 Nov" for dates in 2027, which looks like days away rather
    // than a year away.
    const rows = toDiffRows(
      [{ id: "consular", title: "Register with the mission", from: "2027-11-10", to: "2027-11-04" }],
      "2026-11-06",
    );
    expect(rows[0].from).toBe("10 Nov 2027");
    expect(rows[0].to).toBe("4 Nov 2027");
  });

  it("leaves a date in the current year unadorned", () => {
    const rows = toDiffRows(
      [{ id: "x", title: "X", from: "2026-11-17", to: "2026-11-11" }],
      "2026-11-06",
    );
    expect(rows[0].to).toBe("11 Nov");
  });

  it("marks only the side that leaves the year", () => {
    const rows = toDiffRows(
      [{ id: "x", title: "X", from: "2027-01-02", to: "2026-12-27" }],
      "2026-11-06",
    );
    expect(rows[0].from).toBe("2 Jan 2027");
    expect(rows[0].to).toBe("27 Dec");
  });
});
