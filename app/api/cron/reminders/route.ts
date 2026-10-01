import { NextResponse } from "next/server";

// Route stub. Phase 7 guards this with an Authorization: Bearer CRON_SECRET check
// before doing anything at all (brief §4).
export async function GET() {
  return NextResponse.json({ error: "not_implemented", route: "cron/reminders" }, { status: 501 });
}
