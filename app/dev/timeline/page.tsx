// app/dev/timeline/page.tsx
//
// Engine output as JSON for a hardcoded profile. No design, no components — this
// page exists so the dates can be read and checked against a calendar before any
// UI exists to hide them.
//
//   /dev/timeline
//   /dev/timeline?birth=2026-11-09        record a birth date
//   /dev/timeline?birth=2026-11-09&diff=1 what moved when it landed
//
// The profile below is the playbook's hand-verification case: due 2026-11-15,
// Hessen, both Indian, unmarried.

import type { IntakeProfile } from "@/lib/schemas";
import { buildTimeline, computeDateChanges } from "@/lib/timeline";

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

export const dynamic = "force-dynamic";

export default async function DevTimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ birth?: string; diff?: string; today?: string }>;
}) {
  const { birth, diff, today } = await searchParams;

  const profile: IntakeProfile = birth ? { ...PROFILE, birth_date: birth } : PROFILE;
  const options = today ? { today } : {};

  let payload: unknown;
  try {
    payload =
      diff && birth
        ? { changes: computeDateChanges(PROFILE, profile, options) }
        : buildTimeline(profile, options);
  } catch (error) {
    payload = { error: error instanceof Error ? error.message : String(error) };
  }

  return (
    <main>
      <pre style={{ fontFamily: "monospace", fontSize: 12, whiteSpace: "pre-wrap" }}>
        {JSON.stringify(payload, null, 2)}
      </pre>
    </main>
  );
}
