// POST /api/ask — the validation boundary, and nothing past it.
//
// Every case here is answered by the FIRST two steps of the handler: the JSON
// parse and `AskRequest.safeParse`. None of them reaches the rate limiter, the
// medical guard, the embedding call or the model, so this file costs $0 to run
// and makes no network request. That ordering is deliberate in the route
// (validation is free, so it runs first) and this suite is what keeps it that
// way: if a malformed body ever started reaching the guard, these tests would
// start trying to call a provider and fail.
//
// WHY THIS FILE EXISTS. `IntakeProfile.safeParse` used to THROW rather than
// return success:false, because its object-level refinement called diffDays on a
// birth_date the field check had already rejected. On a public POST endpoint
// that is not a validation error, it is a 500 — an unhandled exception out of
// the first line of the handler. The root cause is fixed in lib/schemas.ts; this
// suite is the regression at the route, because that is where the consequence
// was.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/ask/route";

const PROFILE = {
  due_date: "2026-11-15",
  bundesland: "hessen",
  city: "Frankfurt am Main",
  employment_status: "employed",
  insurance: "gkv",
  nationalities: ["India", "India"],
  marital_status: "unmarried",
  first_child: true,
};

const QUESTION = "When do I have to register the birth?";

function post(body: unknown, raw?: string): NextRequest {
  return new NextRequest("http://localhost/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw ?? JSON.stringify(body),
  });
}

beforeEach(() => {
  // The kill switch is read from the environment at request time. Without this
  // the suite's verdict would depend on whoever last exported ASK_DISABLED.
  vi.stubEnv("ASK_DISABLED", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("a malformed request is rejected, not raised", () => {
  it("answers a malformed birth date with 400 and does not throw", async () => {
    // The case that used to escape validation entirely. "09/11/2026" is what a
    // German-shaped date entry produces, so it is the one a real user types.
    const res = await POST(post({ question: QUESTION, profile: { ...PROFILE, birth_date: "09/11/2026" } }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_request");
  });

  it("names profile.birth_date in the issues, so the caller can see what to fix", async () => {
    const res = await POST(post({ question: QUESTION, profile: { ...PROFILE, birth_date: "09/11/2026" } }));
    const body = await res.json();
    expect(JSON.stringify(body.issues)).toContain("birth_date");
  });

  it("answers every malformed birth-date shape with 400", async () => {
    for (const birth_date of ["2026-02-30", "2026-11-09T00:00:00Z", "yesterday", "", 42, null]) {
      const res = await POST(post({ question: QUESTION, profile: { ...PROFILE, birth_date } }));
      expect(res.status, `birth_date: ${JSON.stringify(birth_date)}`).toBe(400);
    }
  });

  it("rejects a body that is not JSON", async () => {
    const res = await POST(post(undefined, "{not json"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_json");
  });

  it("rejects a question that is missing or empty", async () => {
    expect((await POST(post({ profile: PROFILE }))).status).toBe(400);
    expect((await POST(post({ question: "", profile: PROFILE }))).status).toBe(400);
  });

  it("rejects an oversized question before anything is paid for", async () => {
    // Brief §4: 8 000 characters is the cap, and the cap is worth nothing if it
    // is enforced after the embedding call.
    const res = await POST(post({ question: "x".repeat(8_001), profile: PROFILE }));
    expect(res.status).toBe(400);
  });

  it("rejects a profile the timeline would also reject", async () => {
    // One schema, both endpoints: a profile /api/timeline refuses must not be
    // answerable here, or the Q&A would answer about a jurisdiction the corpus
    // does not cover.
    expect((await POST(post({ question: QUESTION, profile: { ...PROFILE, bundesland: "bayern" } }))).status).toBe(400);
    expect((await POST(post({ question: QUESTION, profile: { ...PROFILE, insurance: "pkv" } }))).status).toBe(400);
    const { city: _city, ...incomplete } = PROFILE;
    expect((await POST(post({ question: QUESTION, profile: incomplete }))).status).toBe(400);
  });

  it("rejects a well-formed birth date in the future", async () => {
    const future = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    const res = await POST(post({ question: QUESTION, profile: { ...PROFILE, birth_date: future } }));
    expect(res.status).toBe(400);
  });
});

describe("the kill switch answers before validation", () => {
  it("returns 503 and a maintenance message when ASK_DISABLED=1", async () => {
    vi.stubEnv("ASK_DISABLED", "1");
    const res = await POST(post({ question: QUESTION, profile: PROFILE }));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("maintenance");
  });
});
