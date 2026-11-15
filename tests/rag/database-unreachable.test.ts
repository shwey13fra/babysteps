// The database being unreachable is a known operating condition, not an incident.
//
// Supabase pauses a free project after ~7 days of low activity and REMOVES ITS
// SUBDOMAIN FROM DNS, so the client fails at the transport layer and never
// returns an HTTP status. Observed end to end on 2026-11-14. ADR-076.
//
// THE DEFECT THIS FILE EXISTS TO PREVENT is not the pause - it is reporting the
// wrong cause for it. At string level a paused database is INDISTINGUISHABLE
// from an OpenAI or Anthropic transport failure: `embedQuestion` calls OpenAI
// with a raw fetch and throws the identical `TypeError: fetch failed`, inside
// the same retrieve() call the route wraps. Telling a reader "the database is
// unavailable" when the model is down would be ADR-067's swallowed error - four
// causes, one message - rebuilt in a new place.
//
// What keeps them apart is STRUCTURAL: only the Supabase wrappers raise
// DatabaseUnreachableError, and the route branches on `instanceof`, never on a
// string. The test that matters is therefore the one below where retrieve
// throws a plain `TypeError: fetch failed` and the route must NOT call it a
// database outage.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DatabaseUnreachableError, isUnreachableError } from "@/lib/supabase/server";

vi.mock("@/lib/rag/guards", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/rag/guards")>();
  return { ...actual, classifyMedical: vi.fn(async () => ({ medical: false }) as never) };
});
vi.mock("@/lib/rag/retrieve", () => ({ retrieve: vi.fn() }));

const { retrieve } = await import("@/lib/rag/retrieve");
const { POST } = await import("@/app/api/ask/route");

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

function post(): NextRequest {
  return new NextRequest("http://localhost/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "When must we register the birth?", profile: PROFILE }),
  });
}

describe("isUnreachableError — scoped to the Supabase client's own errors", () => {
  it("matches transport-level failure, not only DNS", () => {
    for (const message of [
      "TypeError: fetch failed",
      "Failed to fetch",
      "getaddrinfo ENOTFOUND db.example.supabase.co",
      "getaddrinfo EAI_AGAIN db.example.supabase.co",
      "connect ECONNREFUSED 127.0.0.1:5432",
      "read ECONNRESET",
      "connect ETIMEDOUT",
      "socket hang up",
      "network error",
    ]) {
      expect(isUnreachableError(new Error(message))).toBe(true);
    }
  });

  it("reads a bare code as well as a message", () => {
    expect(isUnreachableError({ message: "", code: "ENOTFOUND" })).toBe(true);
  });

  it("does NOT match a query that arrived and failed", () => {
    // These reached the database. Calling them "unreachable" would send a
    // reader away from a bug that is ours to fix.
    for (const message of [
      "permission denied for table corpus_chunks",
      'relation "corpus_chunks" does not exist',
      'column "cosine" does not exist',
      "JWT expired",
      "duplicate key value violates unique constraint",
    ]) {
      expect(isUnreachableError(new Error(message))).toBe(false);
    }
  });

  it("is silent on empty or absent input rather than guessing", () => {
    expect(isUnreachableError(undefined)).toBe(false);
    expect(isUnreachableError(null)).toBe(false);
    expect(isUnreachableError(new Error(""))).toBe(false);
  });
});

describe("/api/ask tells a database outage apart from a model outage", () => {
  beforeEach(() => {
    vi.mocked(retrieve).mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("answers 503 with a message that promises no recovery time", async () => {
    vi.mocked(retrieve).mockRejectedValue(
      new DatabaseUnreachableError("TypeError: fetch failed"),
    );
    const res = await POST(post());
    expect(res.status).toBe(503);

    const body = await res.json();
    expect(body.error).toBe("database_unavailable");
    expect(body.message).toContain("temporarily unavailable");
    // Says the true, reassuring thing.
    expect(body.message.toLowerCase()).toContain("still work");
    // Promises nothing. Recovery from a pause is manual; nothing self-heals.
    for (const forbidden of ["waking", "wake", "shortly", "minutes", "soon", "back up"]) {
      expect(body.message.toLowerCase()).not.toContain(forbidden);
    }
  });

  it("logs what was OBSERVED, not what it means", async () => {
    // DNS removal cannot tell a paused project from a deleted one (ADR-067).
    vi.mocked(retrieve).mockRejectedValue(
      new DatabaseUnreachableError("getaddrinfo ENOTFOUND x.supabase.co"),
    );
    await POST(post());
    expect(console.error).toHaveBeenCalledWith(
      "[ask] database unreachable",
      expect.objectContaining({ observed: "getaddrinfo ENOTFOUND x.supabase.co" }),
    );
  });

  it("does NOT blame the database for an embedding or model outage with the identical message", async () => {
    // THE TEST THIS FILE IS FOR. Byte-identical text, different cause: a plain
    // Error is what embedQuestion and the model calls throw.
    vi.mocked(retrieve).mockRejectedValue(new TypeError("fetch failed"));
    const res = await POST(post());

    expect(res.status).not.toBe(503);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.kind).toBe("refused");
    expect(body.reason).toBe("unavailable");
    expect(JSON.stringify(body)).not.toContain("database");
  });

  it("does not blame the database for a query that arrived and failed", async () => {
    vi.mocked(retrieve).mockRejectedValue(new Error("match_chunks failed: permission denied"));
    const res = await POST(post());
    expect(res.status).toBe(200);
    expect((await res.json()).reason).toBe("unavailable");
  });

  it("keeps the three failures distinguishable", async () => {
    // Ruling 2026-11-14: a tester who hits the daily limit must not read a
    // message implying our infrastructure failed.
    vi.mocked(retrieve).mockRejectedValue(new DatabaseUnreachableError("fetch failed"));
    const unreachable = await POST(post());

    vi.mocked(retrieve).mockRejectedValue(new Error("something else"));
    const broken = await POST(post());

    expect(unreachable.status).toBe(503);
    expect(broken.status).toBe(200);
    // Rate limiting is the third, and is decided before retrieval is reached -
    // it returns 429 from the limiter, which is why it cannot collide with
    // either of these two.
    expect(unreachable.status).not.toBe(429);
    expect(broken.status).not.toBe(429);
  });
});

describe("what keeps working while the database is unreachable", () => {
  // The user-facing message says "your timeline, your dates and everything
  // saved on this phone still work". That is a promise, so it is tested.
  const ENV_KEYS = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ];
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of ENV_KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });
  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it("the engine builds a full timeline with no database configured at all", async () => {
    const { buildTimeline } = await import("@/lib/timeline");
    const timeline = buildTimeline(PROFILE as never, { today: "2026-11-15" });
    expect(timeline.items.length).toBeGreaterThan(0);
    expect(timeline.items.every((i) => typeof i.window_open === "string")).toBe(true);
  });

  it("/api/timeline answers with no database configured at all", async () => {
    const { POST: timelinePost } = await import("@/app/api/timeline/route");
    const res = await timelinePost(
      new NextRequest("http://localhost/api/timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(PROFILE),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items.length).toBeGreaterThan(0);
  });
});
