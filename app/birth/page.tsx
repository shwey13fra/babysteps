"use client";

// app/birth/page.tsx — F2b.
//
// The proof. A parent types one date and the estimated deadlines move to where
// they really are, in front of them. design-system.md §6 gives this interaction
// the entire motion budget of the product: "the dates that changed animate from
// old value to new over 400ms. Nothing else moves."
//
// The diff is NOT computed here. POST /api/birth-preview runs the engine's
// computeDateChanges (ADR-070); this file formats what comes back. Nothing is
// committed until the button is pressed, and the commit is a localStorage write.

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BirthPreviewResponse } from "@/lib/schemas";
import type { IntakeProfile } from "@/lib/schemas";
import { readProfile, writeProfile } from "@/lib/ui/profile-store";
import { formatLongDate } from "@/lib/ui/timeline-rows";
import { toDiffView, type DiffView } from "@/lib/ui/birth-diff";

/**
 * Whether this person has asked for less motion.
 *
 * Checked in JS rather than left to the CSS rule in globals.css, because the
 * two renderings are structurally different: the animated one stacks the old
 * and new values in an overflow-hidden box, and simply freezing its transitions
 * would leave the new value hidden underneath. The reduced version is the
 * mockup's static `22 Nov → 16 Nov`.
 */
function usePrefersReducedMotion(): boolean {
  // useSyncExternalStore, not an effect: matchMedia IS an external store, and
  // subscribing to it this way avoids a setState during mount. The server
  // snapshot is `true` - assume less motion until the browser says otherwise,
  // so the static before/after is what renders if JS never arrives.
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
}

type Preview =
  | { phase: "idle" }
  | { phase: "working" }
  | { phase: "ready"; view: DiffView; birthDate: string }
  | { phase: "rejected"; message: string }
  | { phase: "failed" };

export default function BirthPage() {
  const router = useRouter();
  const reduced = usePrefersReducedMotion();

  const [profile, setProfile] = useState<IntakeProfile | null>(null);
  const [birthDate, setBirthDate] = useState("");
  const [preview, setPreview] = useState<Preview>({ phase: "idle" });
  const [animate, setAnimate] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    let cancelled = false;
    // Inside the async body so the state transition is not a synchronous
    // cascade during mount, which is the same shape /timeline uses.
    void (async () => {
      const stored = readProfile();
      if (!stored) {
        router.replace("/intake");
        return;
      }
      if (!cancelled) setProfile(stored.profile);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const runPreview = useCallback(
    async (candidate: string, current: IntakeProfile) => {
      const mine = ++requestId.current;
      setAnimate(false);
      setPreview({ phase: "working" });
      try {
        const res = await fetch("/api/birth-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile: current, birth_date: candidate }),
          cache: "no-store",
        });
        if (requestId.current !== mine) return; // a newer date was typed
        if (res.status === 400) {
          const body = await res.json();
          setPreview({
            phase: "rejected",
            message:
              body.error === "invalid_birth_date"
                ? "That date cannot be right — a birth date cannot be in the future."
                : "That date could not be read. Use the date picker.",
          });
          return;
        }
        if (!res.ok) {
          setPreview({ phase: "failed" });
          return;
        }
        const parsed = BirthPreviewResponse.safeParse(await res.json());
        if (!parsed.success) {
          setPreview({ phase: "failed" });
          return;
        }
        if (requestId.current !== mine) return;
        setPreview({ phase: "ready", view: toDiffView(parsed.data), birthDate: candidate });
      } catch {
        if (requestId.current === mine) setPreview({ phase: "failed" });
      }
    },
    [],
  );

  // The one transition in the product. Started a frame after the rows exist, so
  // the browser has painted the OLD values first — animating from a value the
  // user never saw would defeat the point of showing the move at all.
  useEffect(() => {
    if (preview.phase !== "ready" || reduced) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setAnimate(true)));
    return () => cancelAnimationFrame(id);
  }, [preview.phase, reduced]);

  function onDateChange(value: string) {
    setBirthDate(value);
    setSaveFailed(false);
    if (!profile) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      setPreview({ phase: "idle" });
      return;
    }
    void runPreview(value, profile);
  }

  function onSave() {
    if (!profile || preview.phase !== "ready") return;
    const stored = writeProfile({ ...profile, birth_date: preview.birthDate });
    if (!stored) {
      setSaveFailed(true);
      return;
    }
    router.push("/timeline");
  }

  const dueLine = useMemo(
    () => (profile ? formatLongDate(profile.due_date) : null),
    [profile],
  );

  return (
    <>
      <div className="head">
        <div className="state">Record the birth</div>
        <div className="sub">
          {preview.phase === "ready"
            ? `${preview.view.rows.length} ${preview.view.rows.length === 1 ? "date is" : "dates are"} counted from this day`
            : "Several deadlines are counted from this day"}
        </div>
      </div>

      <div className="pad">
        <h1 className="title">When was the baby born?</h1>
        <p className="lede">
          {dueLine
            ? `Until now these dates were estimated from your due date of ${dueLine}. Once you set the real date they become exact, and anything counted from the birth moves with them.`
            : "Until now these dates were estimated from your due date."}
        </p>

        <label className="field">
          <span>Date of birth</span>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => onDateChange(e.target.value)}
            aria-describedby={preview.phase === "rejected" ? "birth-error" : undefined}
            aria-invalid={preview.phase === "rejected"}
          />
          {preview.phase === "rejected" ? (
            <span className="err" id="birth-error">
              {preview.message}
            </span>
          ) : null}
        </label>

        {preview.phase === "working" ? (
          <div className="skeleton" style={{ margin: "0 0 16px" }} aria-live="polite">
            <i />
            <i />
            <i />
            <p>Working out what moves</p>
          </div>
        ) : null}

        {preview.phase === "failed" ? (
          <div className="aside" style={{ margin: "0 0 16px" }} role="alert">
            <b>We could not work out what moves.</b>
            <p style={{ margin: 0 }}>
              Nothing has been changed. Your timeline is still as it was — please try again in a
              few minutes.
            </p>
          </div>
        ) : null}

        {preview.phase === "ready" ? (
          <>
            <h2 className="sub-title">{preview.view.heading}</h2>

            {preview.view.rows.length > 0 ? (
              <div className={`diff${animate ? " animate" : ""}`} aria-live="polite">
                {preview.view.rows.map((row) => (
                  <div className="r" key={row.id}>
                    <span className="n">{row.title}</span>
                    {reduced ? (
                      <span className="v">
                        <s>{row.from}</s> → <b>{row.to}</b>
                      </span>
                    ) : (
                      /* Animates from the old value to the new one and SETTLES
                         on the mockup's static form. The struck-through old
                         date and the arrow fade in as the value moves, so the
                         end state still shows what the date moved from - which
                         is the whole proof this screen exists to give. */
                      <span className="v" title={`${row.from} → ${row.to}`}>
                        <span className="was" aria-hidden="true">
                          <s>{row.from}</s> →{" "}
                        </span>
                        <span className="moving">
                          <span className="old" aria-hidden="true">
                            {row.from}
                          </span>
                          <span className="new">{row.to}</span>
                        </span>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="lede">
                Nothing moves. Every date on your timeline was already counted from something other
                than the birth.
              </p>
            )}

            {preview.view.rows.length > 0 ? (
              <p className="meta">
                The baby arrived {preview.view.arrival}. {preview.view.moves}
              </p>
            ) : null}

            <p className="meta">
              <span lang="de" className="term">
                Mutterschutz
              </span>{" "}
              <span className="gloss">(statutory maternity protection period)</span>:{" "}
              {preview.view.note.text}
            </p>

            {saveFailed ? (
              <div className="aside" style={{ margin: "0 0 16px" }} role="alert">
                <b>This browser will not let us save the date.</b>
                <p style={{ margin: 0 }}>
                  That usually means private browsing, or site data is blocked.
                </p>
              </div>
            ) : null}

            <button type="button" className="btn-primary" onClick={onSave}>
              Save the birth date
            </button>
          </>
        ) : null}

        <p className="meta" style={{ marginTop: "18px" }}>
          Nothing here is sent anywhere. The date is worked out on our server and kept on this
          phone. <Link href="/timeline">Back to the timeline</Link>
        </p>
      </div>
    </>
  );
}
