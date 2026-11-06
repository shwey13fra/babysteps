// POST /api/timeline — the seam between the engine and the screen (ADR-069).
//
// The route handler is a plain function of a Request, so it is tested directly
// rather than through a running server. What is checked here is everything the
// human ruling asked for and nothing a browser would reveal more cheaply:
// validation on BOTH sides of the wire, no caching that could serve one
// profile's dates to another, and POST-only so a profile never reaches a URL.

import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/timeline/route";
import { TimelineResponse } from "@/lib/schemas";
import type { IntakeProfile } from "@/lib/schemas";
import { buildTimeline, keyDate } from "@/lib/timeline";

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

function post(body: unknown, raw?: string): Request {
  return new Request("http://localhost/api/timeline", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw ?? JSON.stringify(body),
  });
}

describe("a valid profile gets a timeline", () => {
  it("returns 200 and a body the contract accepts", async () => {
    const res = await POST(post(PROFILE));
    expect(res.status).toBe(200);
    const json: unknown = await res.json();
    expect(TimelineResponse.safeParse(json).success).toBe(true);
  });

  it("returns items, the Mutterschutz period and the as_of it derived against", async () => {
    const body = TimelineResponse.parse(await (await POST(post(PROFILE))).json());
    expect(body.items.length).toBeGreaterThan(5);
    expect(body.period.id).toBe("mutterschutz");
    expect(body.as_of).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns the same dates the engine computes, item for item", async () => {
    // The seam must not transform a date on the way through. This is the same
    // guarantee tests/ui/timeline-rows.test.ts makes for the screen, one layer
    // lower.
    const body = TimelineResponse.parse(await (await POST(post(PROFILE))).json());
    const engine = buildTimeline(PROFILE, { today: body.as_of });
    const wire = new Map(body.items.map((i) => [i.id, keyDate(i)]));
    expect(wire.size).toBe(engine.items.length);
    for (const item of engine.items) expect(wire.get(item.id)).toBe(keyDate(item));
  });

  it("carries a recorded birth through", async () => {
    // Derived from the clock, not hardcoded: IntakeProfile refuses a birth_date
    // in the future against todayISO(), so a literal date here would pass or
    // fail depending on the day the suite runs. It already did - a fixed
    // 2026-11-09 was rejected as future-dated three days before it.
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
    const withBirth = { ...PROFILE, birth_date: threeDaysAgo };
    const body = TimelineResponse.parse(await (await POST(post(withBirth))).json());
    const confirmed = body.items.filter((i) => i.certainty === "confirmed");
    expect(confirmed.length).toBeGreaterThan(0);
  });
});

describe("one profile's dates can never be served to another", () => {
  it("sends no-store on a success", async () => {
    const res = await POST(post(PROFILE));
    const cc = res.headers.get("Cache-Control") ?? "";
    expect(cc).toContain("no-store");
    expect(cc).toContain("private");
  });

  it("sends no-store on a rejection too", async () => {
    // A cached 400 is less dangerous but still wrong, and a header applied on
    // only one path is the kind of thing that drifts.
    const res = await POST(post({ due_date: "nope" }));
    expect(res.headers.get("Cache-Control") ?? "").toContain("no-store");
  });

  it("returns different dates for different profiles in sequence", async () => {
    const a = TimelineResponse.parse(await (await POST(post(PROFILE))).json());
    const b = TimelineResponse.parse(
      await (await POST(post({ ...PROFILE, due_date: "2027-03-01" }))).json(),
    );
    const firstA = keyDate(a.items[0]);
    const firstB = keyDate(b.items.find((i) => i.id === a.items[0].id) ?? b.items[0]);
    expect(firstA).not.toBe(firstB);
  });
});

describe("the input is validated before it reaches the engine", () => {
  it("rejects a malformed body with 400, not a 500", async () => {
    const res = await POST(post(undefined, "{not json"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_json");
  });

  it("rejects a profile that is missing a field", async () => {
    const { city: _city, ...incomplete } = PROFILE;
    const res = await POST(post(incomplete));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_profile");
    expect(body.issues.some((i: { path: string }) => i.path === "city")).toBe(true);
  });

  it("rejects a Bundesland the corpus does not cover", async () => {
    const res = await POST(post({ ...PROFILE, bundesland: "bayern" }));
    expect(res.status).toBe(400);
  });

  it("rejects private insurance rather than silently treating it as statutory", async () => {
    const res = await POST(post({ ...PROFILE, insurance: "pkv" }));
    expect(res.status).toBe(400);
  });

  it("rejects a birth date in the future", async () => {
    // IntakeProfile refines this, and the route must not bypass the refinement.
    const future = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    const res = await POST(post({ ...PROFILE, birth_date: future }));
    expect(res.status).toBe(400);
  });

  it("answers a malformed birth date with 400, not a 500", async () => {
    // IntakeProfile's refine calls diffDays, which THROWS on a date that is not
    // ISO, and zod runs the refinement even after the field check failed - so
    // safeParse throws instead of returning success:false. Without the guard in
    // the route this request crashes the handler. Root cause is in
    // lib/schemas.ts and is reported, not patched here.
    const res = await POST(post({ ...PROFILE, birth_date: "09/11/2026" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_profile");
  });

  it("names the offending field, so the screen can say which answer to fix", async () => {
    const res = await POST(post({ ...PROFILE, due_date: "15-11-2026" }));
    const body = await res.json();
    expect(body.issues.map((i: { path: string }) => i.path)).toContain("due_date");
  });
});

describe("the profile never reaches a URL", () => {
  it("refuses GET with 405 and says what to use instead", async () => {
    const res = GET();
    expect(res.status).toBe(405);
    const body = await res.json();
    expect(body.error).toBe("method_not_allowed");
    expect(body.use).toContain("POST");
  });
});
