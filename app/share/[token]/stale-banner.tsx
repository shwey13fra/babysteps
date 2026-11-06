"use client";

// "This view predates the birth."
//
// A client island because the only way to know a shared view is stale is to
// compare it with a profile stored in THIS browser. The server has no record of
// the owner - that is the whole privacy posture - so staleness is not something
// it can be asked about.
//
// HONEST LIMIT, stated here because it matters: this can only fire on a device
// that has done intake. The partner's phone has no profile, so the banner will
// not appear there, which is exactly the case it was wanted for. What it DOES
// catch is the owner opening their own old link and seeing that it is out of
// date before they send it again. Making it work on the partner's device would
// mean the server keeping a record of the owner, which is the trade this
// product has already refused.

import { useEffect, useState } from "react";
import { readProfile } from "@/lib/ui/profile-store";

export function StaleBanner({ sharedHasBirth }: { sharedHasBirth: boolean }) {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = readProfile();
      const ownerHasBirth = stored?.profile.birth_date !== undefined;
      if (!cancelled) setStale(!sharedHasBirth && ownerHasBirth);
    })();
    return () => {
      cancelled = true;
    };
  }, [sharedHasBirth]);

  if (!stale) return null;

  return (
    <div className="banner stale" role="status">
      <b>This view predates the birth.</b>
      <span>
        The dates below are still counted from the due date. On this device the birth has been
        recorded, so the real dates have moved — make a new link to share them.
      </span>
    </div>
  );
}
