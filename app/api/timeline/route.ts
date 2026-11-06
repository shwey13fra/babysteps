// app/api/timeline/route.ts
//
// The seam between the engine and the screen (ADR-069).
//
// `buildTimeline` reads data/rules/*.yaml from disk, so it is server-only. The
// profile lives in localStorage under an anonymous UUID, so it is client-only.
// This route is the only place they meet. The browser never receives the rules
// file and never does date arithmetic - a second copy of the offsets in the
// client is the one thing that could silently break what Phase 1 hand-verified
// against statute (CLAUDE.md rule 4).
//
// POST, not GET, for two reasons: a profile is personal data and must never sit
// in a URL or a query string, and a GET would be cacheable by something between
// us and the user. Every response is explicitly no-store.

import { NextResponse } from "next/server";
import { IntakeProfile, TimelineResponse } from "@/lib/schemas";
import { buildTimeline } from "@/lib/timeline";

/** Never statically rendered, never reused across requests. */
export const dynamic = "force-dynamic";

/**
 * A profile's dates must never be served to another profile. `force-dynamic`
 * stops Next caching the route; this stops anything between us and the browser
 * from holding the body.
 */
const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  Vary: "*",
} as const;

function fail(error: string, status: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error, ...extra }, { status, headers: NO_STORE });
}

/**
 * `IntakeProfile.safeParse` can THROW rather than return success:false.
 *
 * Its `.refine` calls diffDays(todayISO(), birth_date), and diffDays ->
 * assertISODate throws on a malformed date; zod runs the refinement even when
 * the field-level z.iso.date() has already failed, so the exception escapes
 * safeParse. A route must never answer malformed input with a 500, so the parse
 * is wrapped here.
 *
 * This is a defence, not the fix. The root cause is in lib/schemas.ts and is
 * reported rather than changed under scope lock (CLAUDE.md rules 1 and 3).
 */
function parseProfile(value: unknown) {
  try {
    return IntakeProfile.safeParse(value);
  } catch (e) {
    return {
      success: false as const,
      error: { issues: [{ path: ["birth_date"], message: (e as Error).message }] },
    };
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("invalid_json", 400);
  }

  // The profile is validated before it reaches the engine. buildTimeline
  // assumes a well-formed profile and is not the place to discover otherwise.
  const profile = parseProfile(body);
  if (!profile.success) {
    return fail("invalid_profile", 400, {
      issues: profile.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }

  let timeline: unknown;
  try {
    timeline = buildTimeline(profile.data);
  } catch {
    // A malformed rule file or a missing data/rules directory is our outage,
    // not the caller's error, and must not be reported as a bad profile.
    return fail("engine_unavailable", 503);
  }

  // Validated on the way out too. The screen renders from this wire format, so
  // the output contract carries as much weight as the input one; a shape the UI
  // cannot render is a 500 here rather than a broken timeline there.
  const response = TimelineResponse.safeParse(timeline);
  if (!response.success) return fail("contract_violation", 500);

  return NextResponse.json(response.data, { status: 200, headers: NO_STORE });
}

/**
 * Explicitly not available on GET. A GET would put the profile in the query
 * string, which the privacy rules forbid, and would be cacheable.
 */
export function GET() {
  return fail("method_not_allowed", 405, { use: "POST with an IntakeProfile body" });
}
