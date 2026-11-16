"use client";

// Add this one deadline to the parent's own calendar.
//
// With no reminder loop in the beta (ruling 2026-11-15, option B), the calendar
// IS the reminder: their own app notifies them, better than we would. So this
// control is not a convenience, it is the substitute, and it has to be honest
// about what it is handing over.
//
// AN ESTIMATED DATE MUST SAY SO HERE AND IN THE FILE. A parent who imports a
// date counted from a due date, and sees no flag in their calendar months
// later, has exactly the silent staleness F2b exists to prevent - one layer
// out, and past the point where we can correct it. The VEVENT description
// carries the same sentence (lib/ics/events.ts).

import { useState } from "react";
import { useItemState } from "./item-state";

type Phase = "idle" | "working" | "failed";

export function AddToCalendar({ id }: { id: string }) {
  const state = useItemState(id);
  const [phase, setPhase] = useState<Phase>("idle");

  // Nothing to add until we know this item is on their timeline at all.
  if (state.phase !== "ready") return null;

  const estimated = state.item.certainty === "estimated";

  async function download() {
    if (state.phase !== "ready") return;
    setPhase("working");
    try {
      const res = await fetch("/api/ics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: state.profile, item: id }),
        cache: "no-store",
      });
      if (!res.ok) {
        setPhase("failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `babysteps-${id}.ics`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Revoked on the next tick: Safari needs the object to outlive the click.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setPhase("idle");
    } catch {
      setPhase("failed");
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn-ghost"
        style={{ width: "100%", marginTop: "14px" }}
        onClick={download}
        disabled={phase === "working"}
      >
        {phase === "working" ? "Preparing…" : "Add to calendar"}
      </button>

      {/*
        Stage F, 2026-11-16: a parent downloaded this, mailed it to themselves,
        opened it on their phone and nothing happened. The file is valid — the
        gap is that tapping a calendar file in a mail app does not reliably
        import it, and Google Calendar's import lives on a computer.

        With no reminder loop in the beta the calendar IS the reminder, so a
        file that never reaches a calendar is a feature that silently does not
        exist. Until Phase 7 decides whether to add a direct calendar link, the
        honest fix is to say where the file goes. Direction, not mood (§7).
      */}
      <p className="sub" style={{ marginTop: "8px" }}>
        This saves a calendar file. On iPhone, open it from Mail to add it. In Google Calendar,
        add it on a computer under Settings → Import &amp; export.
      </p>

      {estimated ? (
        <p className="sub" style={{ marginTop: "8px" }}>
          This date is estimated from your due date. The calendar entry says so, and it will not
          update itself — record the birth here and add it again.
        </p>
      ) : null}

      {phase === "failed" ? (
        <p className="sub" style={{ marginTop: "8px" }}>
          The calendar file could not be made just now. Your timeline is unaffected.
        </p>
      ) : null}
    </>
  );
}
