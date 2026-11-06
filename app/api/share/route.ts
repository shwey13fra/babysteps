// app/api/share/route.ts
//
// Mints a signed, read-only share link for a partner.
//
// The signing secret never leaves the server, so this cannot be done in the
// browser. The profile arrives in the POST body because it lives in
// localStorage; nothing about it is stored here, and the response is the token
// and nothing else.

import { NextResponse } from "next/server";
import { IntakeProfile } from "@/lib/schemas";
import { createShareToken, sharingConfigured } from "@/lib/share/token";

export const dynamic = "force-dynamic";

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  Vary: "*",
} as const;

function fail(error: string, status: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error, ...extra }, { status, headers: NO_STORE });
}

export async function POST(request: Request) {
  if (!sharingConfigured()) {
    // A deployment state, not a user error, and never a reason to hand back an
    // unsigned link.
    return fail("sharing_unavailable", 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("invalid_json", 400);
  }

  let profile;
  try {
    profile = IntakeProfile.safeParse(body);
  } catch {
    return fail("invalid_profile", 400);
  }
  if (!profile.success) return fail("invalid_profile", 400);

  const token = createShareToken(profile.data, new Date().toISOString());
  if (!token) return fail("sharing_unavailable", 503);

  return NextResponse.json({ token }, { status: 200, headers: NO_STORE });
}

export function GET() {
  return fail("method_not_allowed", 405, { use: "POST with an IntakeProfile body" });
}
