"use client";

// The only profile-dependent part of an item page.
//
// Everything else on the page - what this step is, what it costs to miss, the
// documents, the source and its as-of date - is a property of the rule and is
// rendered on the server. Only the DATE and its status depend on who is reading,
// so only that is a client island fetching /api/timeline (ADR-069).

import Link from "next/link";
import { chipFor, formatGutterDate } from "@/lib/ui/timeline-rows";
import { keyDate } from "@/lib/timeline/key-date";
import { anchorLine, closedDayLine, recordedLine } from "@/lib/ui/item-view";
import { useDoneState } from "./done-store";
import { useItemState } from "./item-state";

export function ItemDates({ id }: { id: string }) {
  // One reader for "where does this item fall", shared with ./add-to-calendar.
  // Two islands fetching the same fact independently is the shape of the
  // 2026-11-10 defect on this very page (ADR-072).
  const state = useItemState(id);
  // Shared with ./done-toggle.tsx so the two islands on this page cannot
  // disagree about whether the reader marked this step done.
  const done = useDoneState(id) === "done";

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
  const chip = done ? null : chipFor(state.item);
  const date = formatGutterDate(keyDate(state.item));
  const anchor = anchorLine(state.item.anchor, state.item.certainty);
  // Only where the date actually rests on what the parent told us: a
  // birth-anchored item whose date is confirmed rather than estimated.
  const recorded =
    state.item.anchor === "birth" && state.item.certainty === "confirmed"
      ? recordedLine(state.profile.birth_date, state.profile.birth_recorded_at)
      : null;
  // ADR-079. The date is NOT moved — this says the true thing beside it. Shown
  // on a done row too, unlike the timeline's short clause: the item page is
  // where someone goes to check a detail, and a fact about the date is still a
  // fact about the date.
  const closed = closedDayLine(keyDate(state.item), state.profile.bundesland);

  return (
    <>
      <p className="item-meta">
        <strong>{date}</strong> · {anchor}
        {chip ? <span className={`chip ${chip.kind}`}> {chip.text}</span> : null}
      </p>
      {closed ? <p className="sub">{closed}</p> : null}
      {recorded ? <p className="sub">{recorded}</p> : null}
    </>
  );
}
