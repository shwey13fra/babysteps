import { NextResponse } from "next/server";

// Route stub. Implemented in a later phase — see CLAUDE.md reference documents.
export async function GET() {
  return NextResponse.json({ error: "not_implemented", route: "timeline" }, { status: 501 });
}
