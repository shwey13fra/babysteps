"use client";

// app/landing-sequence.tsx
//
// The three screens of `/`: the promise, the boundary, and the handoff to the
// seven questions. One route, client state, no deep link into the middle of a
// pitch.
//
// WHAT IS AND IS NOT ALLOWED TO MOVE. ADR-086: the brochure may move, the
// instrument may not. Everything animated here is scoped under `.landing`, and
// tests/ui/landing.test.ts fails if a selector escapes that scope — because the
// fence between this screen and `/timeline` is otherwise one className away
// from leaking.
//
// THREE WAYS TO NOT WATCH SIX SECONDS. The animation is a welcome once and an
// obstacle every time after, so: a real Skip button (keyboard reachable, which
// the prototype's click-anywhere div was not), a click anywhere as well because
// tired thumbs use it, and `babysteps.landing.seen.v1` so a returning visitor
// lands on the rested frame with no animation at all. `prefers-reduced-motion`
// takes the same rested frame, enforced in CSS so it cannot be bypassed by a
// state bug here.
//
// THE BUTTON NEVER WAITS. §4 of the design calls a parent who cannot act for
// six seconds the failure this would have shipped with. `Next` is in the DOM
// and focusable from the first frame; the animation only changes how it looks
// arriving. Nothing here gates it.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  LANDING_SCREENS,
  PAPERWORK,
  SPRING_STEP,
  TIMING,
  TOTAL_SCREENS,
  dotLit,
  hasSeenLanding,
  markLandingSeen,
  nextIndex,
} from "@/lib/ui/landing";
import { FallingBundle, Paperwork, Stork } from "./landing-art";
import BackButton from "./back-button";

/** `playing` runs the sequence; `rested` is the held frame, with nothing moving. */
type Motion = "playing" | "rested";

/** The preference never changes while the page is open, so there is nothing to subscribe to. */
const noSubscribe = () => () => {};
/** On the client, once React is past hydration. */
const clientSnapshot = () => true;
/** On the server, and during the hydration render itself. */
const serverSnapshot = () => false;

export default function LandingSequence() {
  const [screen, setScreen] = useState(0);
  const [settled, setSettled] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  // The screen this component last moved focus for.
  //
  // NOT a "have we mounted yet" flag. That was the first attempt and it was
  // wrong: a ref survives the remount React runs in Strict Mode, so the second
  // pass saw the flag already set, decided a screen change had happened, and
  // focused the heading on page load — measured, `document.activeElement` was
  // `H1.l-heading` on a fresh load of `/`. Comparing the VALUE instead is
  // idempotent: re-running the effect for the same screen is a no-op however
  // many times it happens.
  const focusedFor = useRef(screen);

  // Seen-once, deferred until after hydration.
  //
  // The snapshot here is NOT the preference — it is simply "has React finished
  // hydrating", a constant on each side. Passing `hasSeenLanding` as the
  // snapshot directly was the first attempt and it produced a real hydration
  // error: the server had prerendered `data-motion="playing"` (it cannot read
  // localStorage) while the client rendered `"rested"`, and React reported the
  // attribute as mismatched and unpatched.
  //
  // Reading a constant instead means the hydration render is identical on both
  // sides by construction, and the preference is only consulted on the render
  // AFTER hydration, where differing from the server is not an error but the
  // whole point.
  const hydrated = useSyncExternalStore(noSubscribe, clientSnapshot, serverSnapshot);
  const seen = hydrated && hasSeenLanding();

  const motion: Motion = settled || seen ? "rested" : "playing";

  /** Stop the sequence and remember that it has played. Idempotent. */
  const settle = useCallback(() => {
    setSettled(true);
    markLandingSeen();
  }, []);

  // The sequence finishing is also a settle, so a reader who simply watches it
  // through is not shown it again on their next visit.
  useEffect(() => {
    if (motion !== "playing") return;
    const done = window.setTimeout(settle, TIMING.dots.delay + TIMING.dots.duration);
    return () => window.clearTimeout(done);
  }, [motion, settle]);

  // The browser's Back button is the only back there is: the in-page control
  // calls history.back() too, so there is exactly one path through this state.
  useEffect(() => {
    function onPop(e: PopStateEvent) {
      const to = (e.state as { landing?: number } | null)?.landing ?? 0;
      setScreen(Math.max(0, Math.min(to, TOTAL_SCREENS - 1)));
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Moving between screens is a navigation to anyone using a screen reader, so
  // focus lands on the new heading rather than staying on a button that no
  // longer exists.
  useEffect(() => {
    if (focusedFor.current === screen) return;
    focusedFor.current = screen;
    headingRef.current?.focus();
  }, [screen]);

  function advance() {
    const to = nextIndex(screen);
    if (to === screen) return;
    settle();
    setScreen(to);
    // No URL change: the pitch is not deep-linkable, but Back still works.
    window.history.pushState({ landing: to }, "");
  }

  const current = LANDING_SCREENS[screen];
  const isPromise = screen === 0;

  return (
    <div
      className="landing"
      data-motion={motion}
      data-screen={current.id}
      // A click anywhere settles the sequence. This is a convenience on top of
      // the Skip button, never the only way out — a div cannot be tabbed to.
      onClick={motion === "playing" ? settle : undefined}
      // AND SO DOES THE FIRST KEYBOARD FOCUS, which is not a convenience.
      // `Next` arrives with fill-mode `both`, so for the first 5.4s it is in
      // the DOM and focusable at opacity 0. A keyboard user who tabs in during
      // the sequence would otherwise be holding focus on a button nobody can
      // see — WCAG 2.4.7, and a worse failure than the six seconds itself.
      // Settling on focus means the first Tab lands on a visible control.
      onFocusCapture={motion === "playing" ? settle : undefined}
    >
      <div className="l-sky" aria-hidden="true">
        <span className="l-cloud l-cloud-a" />
        <span className="l-cloud l-cloud-b" />
        <div className="l-stage">
          <Stork />
          <FallingBundle />
          <div className="l-swarm">
            {Array.from({ length: PAPERWORK }, (_, i) => (
              <span
                key={i}
                className="l-bit"
                style={
                  {
                    "--d": `${TIMING.spring.delay + i * SPRING_STEP}ms`,
                  } as React.CSSProperties
                }
              >
                <Paperwork index={i} />
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Top-left, mirroring Skip on the right. It uses history.back() rather
          than its own state so there is still exactly one path backwards. */}
      {screen > 0 ? (
        <BackButton onClick={() => window.history.back()} label="Back to the previous screen" />
      ) : null}

      {isPromise && motion === "playing" ? (
        <button type="button" className="l-skip" onClick={settle}>
          Skip
        </button>
      ) : null}

      <div className="l-sheet">
        {isPromise ? <p className="l-wordmark">BabySteps</p> : null}

        <h1 className="l-heading" ref={headingRef} tabIndex={-1}>
          {current.heading}
        </h1>

        {current.body.map((line) => (
          <p className="l-body" key={line}>
            {line}
          </p>
        ))}

        {current.href ? (
          <Link className="btn-primary l-next" href={current.href}>
            {current.forward}
          </Link>
        ) : (
          <button type="button" className="btn-primary l-next" onClick={advance}>
            {current.forward}
          </button>
        )}

        {current.fine ? <p className="l-fine">{current.fine}</p> : null}

        <div className="l-nav">
          <div
            className="dots l-dots"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={TOTAL_SCREENS}
            aria-valuenow={screen + 1}
            aria-label={`Screen ${screen + 1} of ${TOTAL_SCREENS}`}
          >
            {LANDING_SCREENS.map((s, i) => (
              <i key={s.id} className={dotLit(i, screen) ? "on" : ""} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
