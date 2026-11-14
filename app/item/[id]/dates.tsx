"use client";

// The only profile-dependent part of an item page.
//
// Everything else on the page - what this step is, what it costs to miss, the
// documents, the source and its as-of date - is a property of the rule and is
// rendered on the server. Only the DATE and its status depend on who is reading,
// so only that is a client island fetching /api/timeline (ADR-069).

import { useEffect, useState } from "react";
import Link from "next/link";
import { TimelineResponse } from "@/lib/schemas";
import { readProfile } from "@/lib/ui/profile-store";
import { chipFor, formatGutterDate } from "@/lib/ui/timeline-rows";
import { keyDate } from "@/lib/timeline/key-date";
import { anchorLine, recordedLine } from "@/lib/ui/item-view";
import { useDoneState } from "./done-store";

type State =
  | { phase: "loading" }
  | { phase: "none" }
  | { phase: "not-in-timeline" }
  | {
      phase: "ready";
      date: string;
      anchor: string;
      chip: { kind: "warn" | "stop"; text: string } | null;
      /** Provenance, only on a date derived from a birth the parent recorded. */
      recorded: string | null;
    }
  | { phase: "failed" };

export function ItemDates({ id }: { id: string }) {
  const [state, setState] = useState<State>({ phase: "loading" });
  // Shared with ./done-toggle.tsx so the two islands on this page cannot
  // disagree about whether the reader marked this step done.
  const done = useDoneState(id) === "done";

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const stored = readProfile();
      if (!stored) {
        if (!cancelled) setState({ phase: "none" });
        return;
      }
      try {
        const res = await fetch("/api/timeline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(stored.profile),
          cache: "no-store",
        });
        if (!res.ok) {
          if (!cancelled) setState({ phase: "failed" });
          return;
        }
        const parsed = TimelineResponse.safeParse(await res.json());
        if (!parsed.success) {
          if (!cancelled) setState({ phase: "failed" });
          return;
        }
        const item = parsed.data.items.find((i) => i.id === id);
        if (!item) {
          // The rule exists but is out of scope for this profile - a consular
          // step for a couple with no Indian parent, say. Saying so is better
          // than showing a date that does not apply to them.
          if (!cancelled) setState({ phase: "not-in-timeline" });
          return;
        }
        if (!cancelled) {
          setState({
            phase: "ready",
            date: formatGutterDate(keyDate(item)),
            anchor: anchorLine(item.anchor, item.certainty),
            chip: chipFor(item),
            // Only where the date actually rests on what the parent told us:
            // a birth-anchored item whose date is confirmed rather than
            // estimated from the due date.
            recorded:
              item.anchor === "birth" && item.certainty === "confirmed"
                ? recordedLine(stored.profile.birth_date, stored.profile.birth_recorded_at)
                : null,
          });
        }
      } catch {
        if (!cancelled) setState({ phase: "failed" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state.phase === "loading") {
    return <p className="item-meta">Working out your date…</p>;
  }

  if (state.phase === "none") {
    return (
      <p className="item-meta">
        <Link href="/intake">Answer the seven questions</Link> to see when this falls for you.
      </p>
    );
  }

  if (state.phase === "not-in-timeline") {
    return (
      <p className="item-meta">
        This step is not on your timeline — it does not apply to the answers you gave.
      </p>
    );
  }

  if (state.phase === "failed") {
    return <p className="item-meta">Your date could not be worked out just now.</p>;
  }

  // The same rule the timeline row follows (ADR-072): a countdown chip is
  // dropped once the reader has marked the step done. "was due 163 days ago" in
  // red, six lines above their own "Marked done", is the page arguing with them.
  // The DATE stays, because the obligation is still dated and we are not in a
  // position to certify it discharged.
  const chip = done ? null : state.chip;

  return (
    <>
      <p className="item-meta">
        <strong>{state.date}</strong> · {state.anchor}
        {chip ? <span className={`chip ${chip.kind}`}> {chip.text}</span> : null}
      </p>
      {state.recorded ? <p className="sub">{state.recorded}</p> : null}
    </>
  );
}
