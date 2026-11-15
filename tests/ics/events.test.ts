// What a calendar entry SAYS, asserted over every real rule rather than over
// invented examples.
//
// An .ics leaves the building. Months later it is read with none of our UI
// around it, no footer, no source chip, no "how this works" link. So the
// promises have to survive inside the entry itself, and the two that can do
// legal harm are asserted across data/rules in full:
//
//   Rule 12 — an advisory or soft deadline may never read as statutory.
//   Rule 13 — never state an entitlement, an amount, or an outcome.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { buildTimeline } from "@/lib/timeline";
import { keyDate } from "@/lib/timeline/key-date";
import { TimelineResponse } from "@/lib/schemas";
import type { IntakeProfile } from "@/lib/schemas";
import { eventDescription, eventSummary, eventUid, toEvents } from "@/lib/ics/events";
import { deadlineKindLine } from "@/lib/ui/item-view";
import { POST } from "@/app/api/ics/route";

const SITE = "https://babysteps-germany.vercel.app";
const TODAY = "2026-11-15";

const PROFILE: IntakeProfile = {
  due_date: "2026-12-26",
  bundesland: "hessen",
  city: "Frankfurt am Main",
  employment_status: "employed",
  insurance: "gkv",
  nationalities: ["India", "India"],
  marital_status: "unmarried",
  first_child: true,
};

const timeline = TimelineResponse.parse(buildTimeline(PROFILE, { today: TODAY }));
const items = timeline.items;

function post(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/ics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("rule 12 — deadline honesty survives in a calendar entry", () => {
  // Asserted on the line WE generate, not on the whole description.
  //
  // A rule's own note_en may legitimately discuss statute while denying that
  // the DATE is statutory - hebamme_search_start says "Practice, not statute.
  // Your entitlement to midwife care is statutory, but nothing in law says when
  // to start looking", which is exactly the distinction rule 12 exists to
  // preserve. A regex over the whole text flags that as a violation and would
  // push us to blunt a correct sentence. What rule 12 actually asks is whether
  // OUR label and OUR sentence claim statute.

  it("carries the shared kind line verbatim, never a paraphrase of it", () => {
    for (const item of items) {
      if (!item.deadline) continue;
      const kind = deadlineKindLine(item.deadline.kind, item.authority_en, item.deadline.note_en);
      expect(eventDescription(item, SITE)).toContain(`${kind.label}. ${kind.text}`);
    }
  });

  it("never LABELS a soft or advisory deadline as statutory", () => {
    for (const item of items) {
      if (!item.deadline || item.deadline.kind === "hard") continue;
      const kind = deadlineKindLine(item.deadline.kind, item.authority_en, item.deadline.note_en);
      expect(kind.label, `${item.id} is kind:${item.deadline.kind}`).not.toMatch(/statut/i);
      expect(kind.text).not.toMatch(/this date is set by statute/i);
    }
  });

  it("does say so where the deadline IS statutory", () => {
    const hard = items.filter((i) => i.deadline?.kind === "hard");
    expect(hard.length).toBeGreaterThan(0);
    for (const item of hard) {
      expect(eventDescription(item, SITE)).toContain("Statutory deadline");
    }
  });

  it("names who decides, on every item that carries a deadline", () => {
    for (const item of items) {
      if (!item.deadline) continue;
      expect(eventDescription(item, SITE)).toContain(item.authority_en);
    }
  });
});

describe("rule 13 — no individual case assessment leaves in a file", () => {
  it("never tells the reader what they will receive or be granted", () => {
    // Outcome PREDICTIONS about this reader. Deliberately not a ban on the word
    // "entitlement": a rule may state that an entitlement exists in law, which
    // is the rule and not this family's case. Rule 13 forbids telling them how
    // their case comes out.
    const FORBIDDEN =
      /you (will|would|should) (get|receive|be (paid|granted|awarded|entitled|eligible))|you qualify|your (application|claim) will|you are eligible for/i;
    for (const item of items) {
      const text = eventDescription(item, SITE);
      expect(FORBIDDEN.test(text), `${item.id} predicts an outcome`).toBe(false);
    }
  });

  it("carries the disclaimer, because nothing else around the entry will", () => {
    for (const item of items) {
      expect(eventDescription(item, SITE)).toContain("not legal, tax or medical advice");
    }
  });
});

describe("the rule 12 and rule 13 checks can actually fail", () => {
  // Both assertions above were LOOSENED after hebamme_search_start tripped them
  // on correct text. A loosened check that can no longer fail is worse than no
  // check, and this project has twice shipped a gate that failed open. These
  // two prove the teeth are still there.
  const base = items.find((i) => i.deadline?.kind === "hard")!;

  it("catches an outcome prediction if one is ever written into a rule", () => {
    const FORBIDDEN =
      /you (will|would|should) (get|receive|be (paid|granted|awarded|entitled|eligible))|you qualify|your (application|claim) will|you are eligible for/i;
    const violating = {
      ...base,
      consequence_en: "You will receive 1,800 euros a month once your application is approved.",
    };
    expect(FORBIDDEN.test(eventDescription(violating, SITE))).toBe(true);
    // And the real rule does not trip it.
    expect(FORBIDDEN.test(eventDescription(base, SITE))).toBe(false);
  });

  it("catches a soft deadline labelled as statutory", () => {
    const mislabelled = {
      ...base,
      deadline: { ...base.deadline!, kind: "advisory" as const },
    };
    const honest = deadlineKindLine(
      mislabelled.deadline.kind,
      mislabelled.authority_en,
      mislabelled.deadline.note_en,
    );
    expect(honest.label).not.toMatch(/statut/i);
    // The hard one, by contrast, must say it.
    const hard = deadlineKindLine("hard", base.authority_en, base.deadline!.note_en);
    expect(hard.label).toMatch(/statut/i);
  });
});

describe("provenance, including the absence of it", () => {
  it("every entry carries its source reference and URL", () => {
    for (const item of items) {
      const text = eventDescription(item, SITE);
      expect(text).toContain(item.source_ref);
      expect(text).toContain(item.source_url);
    }
  });

  it("says a source is unchecked rather than filling in a date", () => {
    const unchecked = items.filter((i) => i.verified_on === null);
    expect(unchecked.length).toBeGreaterThan(0);
    for (const item of unchecked) {
      expect(eventDescription(item, SITE)).toMatch(/not yet checked/);
    }
  });
});

describe("an estimated date says so, and offers the one thing that fixes it", () => {
  it("marks every estimated item and links to /birth", () => {
    const estimated = items.filter((i) => i.certainty === "estimated");
    expect(estimated.length).toBeGreaterThan(0);
    for (const item of estimated) {
      const text = eventDescription(item, SITE);
      expect(text.toLowerCase()).toContain("estimated");
      expect(text).toContain(`${SITE}/birth`);
    }
  });

  it("does not call a confirmed date estimated", () => {
    for (const item of items.filter((i) => i.certainty === "confirmed")) {
      expect(eventDescription(item, SITE).toLowerCase()).not.toContain("estimated");
    }
  });
});

describe("the entry and the screen cannot disagree", () => {
  it("every event falls on the engine's keyDate, the same date the gutter renders", () => {
    const events = toEvents(items, SITE);
    expect(events).toHaveLength(items.length);
    for (const [i, event] of events.entries()) {
      expect(event.date).toBe(keyDate(items[i]));
    }
  });

  it("the UID is stable when a recorded birth moves the date", () => {
    // Recording a birth moves six dates at once (ADR-070). A UID containing the
    // date would turn every one of them into a duplicate entry.
    const after = TimelineResponse.parse(
      buildTimeline({ ...PROFILE, due_date: "2026-11-15", birth_date: "2026-11-09" }, { today: TODAY }),
    );
    const before = items.find((i) => i.id === "standesamt_birth_registration");
    const moved = after.items.find((i) => i.id === "standesamt_birth_registration");
    expect(before && moved).toBeTruthy();
    expect(keyDate(moved!)).not.toBe(keyDate(before!));
    expect(eventUid(moved!.id)).toBe(eventUid(before!.id));
  });

  it("puts the German term in the summary without repeating it", () => {
    const withTerm = items.find((i) => i.term_de && !i.title_en.includes(i.term_de));
    expect(eventSummary(withTerm!)).toContain(withTerm!.term_de!);
    const inTitle = items.find((i) => i.term_de && i.title_en.includes(i.term_de));
    if (inTitle) expect(eventSummary(inTitle)).toBe(inTitle.title_en);
  });
});

describe("POST /api/ics", () => {
  it("returns a calendar file for the whole timeline", async () => {
    const res = await POST(post({ profile: PROFILE }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/calendar");
    expect(res.headers.get("Content-Disposition")).toContain("babysteps-timeline.ics");
    const text = await res.text();
    expect(text.match(/BEGIN:VEVENT/g)).toHaveLength(items.length);
  });

  it("returns a single event when an item is named", async () => {
    const res = await POST(post({ profile: PROFILE, item: "standesamt_birth_registration" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toContain(
      "babysteps-standesamt_birth_registration.ics",
    );
    expect((await res.text()).match(/BEGIN:VEVENT/g)).toHaveLength(1);
  });

  it("is never cached — it carries a family's dates", async () => {
    const res = await POST(post({ profile: PROFILE }));
    expect(res.headers.get("Cache-Control")).toContain("no-store");
  });

  it("rejects a profile the schema rejects", async () => {
    const res = await POST(post({ profile: { ...PROFILE, bundesland: "bayern" } }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_request");
  });

  it("rejects malformed JSON without throwing", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/ics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{not json",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("says so when an id is not on THIS family's timeline", async () => {
    // A consular step for a couple with no Indian parent is not an error in
    // the file — it is an event that does not exist for them.
    const res = await POST(post({ profile: PROFILE, item: "no_such_rule" }));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("not_on_your_timeline");
  });
});

describe("the calendar file does not need the database (ADR-076)", () => {
  const KEYS = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });
  afterEach(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it("builds a full calendar with no database configured at all", async () => {
    const res = await POST(post({ profile: PROFILE }));
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("BEGIN:VCALENDAR");
  });
});
