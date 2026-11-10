// app/api/birth-preview/route.ts
//
// F2b's engine half, behind the same seam as /api/timeline (ADR-069, ADR-070).
//
// "What moves if the baby was born on this day?" is answered by
// computeDateChanges on the server, because the rules live on disk and because a
// second implementation of the diff in the browser is exactly the duplication
// this project refuses. The screen renders the answer; it never derives it.
//
// NOTHING IS COMMITTED HERE. This route is a preview: the profile it receives is
// unchanged, and the birth date is only applied to a copy. The commit happens in
// the browser, in localStorage, when the user presses the button.

import { NextResponse } from "next/server";
import { IntakeProfile, BirthPreviewResponse } from "@/lib/schemas";
import { computeDateChanges } from "@/lib/timeline";
import { computeMutterschutz, PREMATURE_THRESHOLD_DAYS } from "@/lib/timeline/mutterschutz";
import { diffDays, todayISO } from "@/lib/timeline/dates";

export const dynamic = "force-dynamic";

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  Vary: "*",
} as const;

function fail(error: string, status: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error, ...extra }, { status, headers: NO_STORE });
}

/**
 * `IntakeProfile.safeParse` used to THROW rather than return success:false: its
 * `.refine` called diffDays on a birth_date the field-level z.iso.date() had
 * already rejected, and zod runs the refinement anyway. **Fixed at the root** in
 * lib/schemas.ts; tests/timeline/schemas.test.ts holds that line.
 *
 * This wrapper stays as defence in depth — see the same note in
 * app/api/timeline/route.ts. It should now be unreachable, and this route's 400
 * tests pass with or without it.
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

  if (typeof body !== "object" || body === null) return fail("invalid_request", 400);
  const { profile: rawProfile, birth_date: rawBirth } = body as Record<string, unknown>;

  const before = parseProfile(rawProfile);
  if (!before.success) {
    return fail("invalid_profile", 400, {
      issues: before.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }

  // The candidate birth date is validated by building the profile it would
  // produce, so the preview can never accept a date the commit would reject -
  // including a birth in the future, which IntakeProfile refines against.
  const after = parseProfile({ ...before.data, birth_date: rawBirth });
  if (!after.success) {
    return fail("invalid_birth_date", 400, {
      issues: after.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }

  let payload: unknown;
  try {
    // One `today` for both sides: computeDateChanges derives both timelines
    // against the same day so a status change cannot masquerade as a date
    // change. Letting it default would read the clock twice.
    payload = {
      changes: computeDateChanges(before.data, after.data),
      period_before: computeMutterschutz(before.data),
      period_after: computeMutterschutz(after.data),
      days_early: diffDays(after.data.birth_date as string, before.data.due_date),
      premature_threshold_days: PREMATURE_THRESHOLD_DAYS,
      as_of: todayISO(),
    };
  } catch {
    return fail("engine_unavailable", 503);
  }

  const response = BirthPreviewResponse.safeParse(payload);
  if (!response.success) return fail("contract_violation", 500);

  return NextResponse.json(response.data, { status: 200, headers: NO_STORE });
}

/** A candidate birth date must not sit in a URL. */
export function GET() {
  return fail("method_not_allowed", 405, { use: "POST with { profile, birth_date }" });
}
