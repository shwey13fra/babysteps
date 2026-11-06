"use client";

// app/timeline/page.tsx
//
// The hero screen. Client-side because the profile lives in localStorage; the
// dates come from POST /api/timeline and are never computed here (ADR-069).
//
// Layout matches docs/mockup.html: a 56px date gutter with tabular figures, a
// 1px hairline rail with filled dots for confirmed dates and hollow ones for
// estimated, the today band as the only full-bleed element and the only 2px
// rule on the screen, and consular items behind a 3px violet left border.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TimelineResponse } from "@/lib/schemas";
import type { TimelineResponse as Wire } from "@/lib/schemas";
import { readProfile, type StoredProfile } from "@/lib/ui/profile-store";
import { toView, type TimelineView } from "@/lib/ui/timeline-rows";
import { DoNext, TimelineBody, TimelineHeader } from "./body";
import { ShareLink } from "./share-link";

// No "no-profile" phase: that case redirects to intake from inside the effect
// rather than becoming state. Setting state synchronously in an effect triggers
// a cascading render, and there is nothing to render for it anyway — the
// skeleton is the right thing to show while the route changes.
type State =
  | { phase: "loading" }
  | { phase: "ready"; view: TimelineView; hasBirth: boolean }
  | { phase: "failed"; reason: "offline" | "server" };

export default function TimelinePage() {
  const router = useRouter();
  const [state, setState] = useState<State>({ phase: "loading" });

  useEffect(() => {
    let cancelled = false;

    const stored: StoredProfile | null = readProfile();
    if (!stored) {
      // Absent, unparseable, or stored by an older schema — all the same answer.
      router.replace("/intake");
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/timeline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(stored.profile),
          cache: "no-store",
        });
        if (!res.ok) {
          if (!cancelled) setState({ phase: "failed", reason: "server" });
          return;
        }
        const json: unknown = await res.json();
        // The screen renders only a shape the contract accepts; anything else is
        // treated as our failure rather than drawn half-finished.
        const parsed = TimelineResponse.safeParse(json);
        if (!parsed.success) {
          if (!cancelled) setState({ phase: "failed", reason: "server" });
          return;
        }
        const wire: Wire = parsed.data;
        if (!cancelled) {
          setState({
            phase: "ready",
            view: toView(wire, stored.profile),
            hasBirth: stored.profile.birth_date !== undefined,
          });
        }
      } catch {
        // Fetch rejects on a dead connection. The timeline is not readable
        // without it, and §7 says give direction, not mood.
        if (!cancelled) setState({ phase: "failed", reason: "offline" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (state.phase === "loading") {
    return (
      <>
        <div className="head">
          <div className="state">Your timeline</div>
          <div className="sub">Working out your dates</div>
        </div>
        <div className="skeleton" aria-live="polite">
          <i />
          <i />
          <i />
          <p>Working out your dates</p>
        </div>
      </>
    );
  }

  if (state.phase === "failed") {
    return (
      <>
        <div className="head">
          <div className="state">Your timeline</div>
          <div className="sub">Could not be worked out just now</div>
        </div>
        <div className="aside" role="alert">
          <b>
            {state.reason === "offline"
              ? "This needs a connection."
              : "Something on our side failed."}
          </b>
          <p>
            {state.reason === "offline"
              ? "Your answers are saved on this phone. The dates are worked out on our server, so the timeline needs a connection to draw."
              : "Your answers are saved on this phone and nothing is lost. Please try again in a few minutes."}
          </p>
          <p style={{ margin: 0 }}>
            <Link href="/timeline">Try again</Link>
          </p>
        </div>
      </>
    );
  }

  const { view, hasBirth } = state;

  return (
    <>
      <TimelineHeader view={view} />

      <DoNext rows={view.doNext} />

      {hasBirth ? null : (
        <div className="prompt">
          <b>Has the baby arrived?</b>
          <span>
            Six of these dates are still counted from your due date. Recording the real date makes
            them exact.
          </span>
          <Link href="/birth">Record the birth</Link>
        </div>
      )}

      <TimelineBody view={view} />

      <div className="pad">
        <ShareLink />
        <p className="meta" style={{ marginTop: "14px" }}>
          <Link href="/ask">Ask a question about any of this</Link>
        </p>
      </div>

    </>
  );
}
