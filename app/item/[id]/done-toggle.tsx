"use client";

// The one control that marks an item done. ADR-072.
//
// WHY IT IS HERE AND NOWHERE ELSE. "Done" is the reader's own claim about a
// legal deadline, so it is taken on the page that explains what the step is,
// what it costs to miss it and who decides — not from a timeline row, where a
// mistaken tap would be one pixel from a link and would grey out a statutory
// obligation without the parent having read a word about it. design-system.md
// §5 gives the item row a date, a dot, a title and ONE metadata line; a control
// is not among them.
//
// It is a client island for the same reason ./dates.tsx is: the answer lives in
// this browser's localStorage and the page itself is static (ADR-069).
//
// Reversible in one tap, so there is no confirmation step. A confirm dialog on a
// checkmark would be the product treating its own grey text as consequential,
// and the thing that IS consequential — the deadline — does not move either way.

import { useState } from "react";
import { setItemDone } from "@/lib/ui/profile-store";
import { notifyDoneChanged, useDoneState } from "./done-store";

export function DoneToggle({ id }: { id: string }) {
  /** Not from the store: whether OUR last write was refused. */
  const [refused, setRefused] = useState(false);
  const state = useDoneState(id);

  // No profile in this browser: ./dates.tsx already tells the reader where to
  // go, and there is nothing to mark against.
  if (state === "absent") return null;

  const done = state === "done";

  function toggle() {
    const stored = setItemDone(id, !done);
    setRefused(stored === null);
    notifyDoneChanged();
  }

  return (
    <div className="donebox">
      {/* Printed, unlike the button: a sheet handed to a clerk should carry what
          the parent said about this step. @media print hides .btn-ghost. */}
      {done ? <p className="donenote">Marked done</p> : null}

      <button
        type="button"
        className="btn-ghost"
        style={{ width: "100%" }}
        aria-pressed={done}
        onClick={toggle}
      >
        {done ? "Mark this not done" : "Mark this done"}
      </button>

      {refused ? (
        <p className="donenote" role="alert">
          This phone is not keeping the answer. The date above is unaffected.
        </p>
      ) : null}
    </div>
  );
}
