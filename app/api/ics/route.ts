// POST /api/ics — the timeline, or one item of it, as a calendar file.
//
// POST and not GET, and the profile travels in the BODY. A GET URL carrying a
// due date, a Bundesland and two nationalities would put a family's personal
// data in a link that lands in server logs, browser history and anything the
// link is ever pasted into. The same reasoning as /api/timeline (ADR-069).
//
// NEVER TOUCHES THE DATABASE. Required by the 2026-11-14 ruling and true by
// construction: every date comes from buildTimeline, which reads
// data/rules/*.yaml from disk. This route keeps working while Supabase is
// paused (ADR-076), and the test that says so lives beside the pause tests.

import { NextResponse } from "next/server";
import { z } from "zod";
import { buildTimeline } from "@/lib/timeline";
import { IntakeProfile, TimelineResponse } from "@/lib/schemas";
import { buildCalendar } from "@/lib/ics/calendar";
import { toEvents } from "@/lib/ics/events";
import { siteUrlForPersistedFile } from "@/lib/site-url";

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate, private" };

const IcsRequest = z.object({
  profile: IntakeProfile,
  /** Absent for the whole timeline; an item id for a single event. */
  item: z.string().min(1).optional(),
});

function fail(error: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...extra }, { status, headers: NO_STORE });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("invalid_json", 400);
  }

  const parsed = IcsRequest.safeParse(body);
  if (!parsed.success) {
    return fail("invalid_request", 400, {
      issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }

  const { profile, item } = parsed.data;

  // Through the same contract the screen reads, so a calendar entry and the
  // timeline cannot drift apart.
  const timeline = TimelineResponse.safeParse(buildTimeline(profile));
  if (!timeline.success) return fail("timeline_invalid", 500);

  const items = item
    ? timeline.data.items.filter((i) => i.id === item)
    : timeline.data.items;

  // An id that is not on THIS profile's timeline is not an error in the file -
  // it is a request for an event that does not exist for this family.
  if (items.length === 0) return fail("not_on_your_timeline", 404);

  // `bundesland` is passed for the closed-day sentence (ADR-079), not for any
  // date: the engine has already decided every date above.
  // ADR-084. Not siteUrl(): this file outlives the deployment that wrote it.
  // In production with no alias configured the helper returns null and every
  // link is omitted, because a deployment-scoped URL answers 302 to a Vercel
  // login wall months later. The file is still served — the deadline, the date
  // and the alarm are the point of the export, and they do not need a link.
  const calendar = buildCalendar(
    toEvents(items, siteUrlForPersistedFile(), profile.bundesland),
    new Date(),
  );
  const filename = item ? `babysteps-${item}.ics` : "babysteps-timeline.ics";

  return new NextResponse(calendar, {
    status: 200,
    headers: {
      ...NO_STORE,
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
