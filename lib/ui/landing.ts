// lib/ui/landing.ts
//
// The landing sequence, as data.
//
// Everything on `/` that can be decided without a DOM lives here: the three
// screens and their copy, the storage key for "seen once", and — the reason
// this file exists at all — the animation timing table.
//
// WHY THE TIMING IS HERE AND NOT ONLY IN CSS. The session of 2026-11-17 lost a
// day to two animations that were syntactically valid, semantically inert, and
// reported success by rendering something: a `<use>` shadow tree that unhooked
// every selector, and an `animation-fill-mode: both` that painted a second baby
// hanging in the sky throughout the carry. Neither produced an error. Both
// looked finished.
//
// A number that exists in exactly one place, inside a CSS keyframe block, is
// unguardable — nothing can assert it and nothing notices when it drifts. So
// the table below is the single source of truth for every delay and duration in
// the sequence, and `tests/ui/landing.test.ts` reads app/globals.css back and
// asserts the stylesheet still agrees with it. The "6.0 seconds to the button"
// claim in the design is then arithmetic over this table rather than a thing
// somebody counted.
//
// Voice is design-system.md §7: sentence case, buttons name their effect, and
// the interface never sounds relieved or worried on the user's behalf.

import { storage } from "./storage";

/**
 * Versioned, and namespaced like `babysteps.profile.v1` so the two keys sort
 * together and a future change is detectable rather than guessed at.
 *
 * This records a cosmetic preference and nothing else. It holds no identifier,
 * is never read by a server, and is per-device — which is acceptable here
 * precisely because losing it costs a returning visitor one animation, not any
 * data. Nothing identifying is stored, so it raises no consent question.
 */
export const SEEN_KEY = "babysteps.landing.seen.v1";

/**
 * Has this browser already watched the sequence?
 *
 * §9 of the design: "seen once, then never again" — a returning visitor lands
 * on the held final frame with no animation at all. Six seconds is a welcome
 * the first time and an obstacle the second.
 *
 * Returns false when storage is unavailable, which is the safe direction: a
 * reader in private mode sees the animation again rather than being handed a
 * frame with no explanation of how it got there.
 */
export function hasSeenLanding(): boolean {
  const s = storage();
  if (!s) return false;
  try {
    return s.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

/** Records that the sequence has played. Silent when storage is unavailable. */
export function markLandingSeen(): void {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(SEEN_KEY, "1");
  } catch {
    // A cosmetic preference is never worth an error path. The reader sees the
    // animation once more; nothing else changes.
  }
}

export type ScreenId = "promise" | "boundary" | "question";

export type LandingScreen = {
  id: ScreenId;
  /** The one heading on the screen. Rendered as <h1>; only one screen is mounted at a time. */
  heading: string;
  /** Body paragraphs, in order. */
  body: readonly string[];
  /** The forward control. §7: a button names its effect. */
  forward: string;
  /** Where forward goes. `null` means "the next screen in this array". */
  href: string | null;
  /** Shown under the forward control, in --ink-3. */
  fine: string | null;
};

export const LANDING_SCREENS: readonly LandingScreen[] = [
  {
    id: "promise",
    heading: "Every deadline. Both countries. In English. Sourced.",
    body: [],
    forward: "Next",
    href: null,
    fine: "No account, no e-mail. About two minutes.",
  },
  {
    id: "boundary",
    heading: "What it does not do",
    body: [
      "It does not fill in any form.",
      "It does not contact an office on your behalf.",
      "It does not tell you what you are entitled to, or how much.",
      "It gives you the rule, the date, and the office that decides — and then you go to them.",
    ],
    forward: "Next",
    href: null,
    fine: null,
  },
  {
    id: "question",
    heading: "When is the baby due?",
    body: [
      "That is the first of seven questions. Every date is counted from it.",
      "When the baby arrives you tell us the real date, and the dates move with it.",
    ],
    // Same words as the control that has always started this flow. §7: an
    // action keeps its name across screens.
    forward: "Answer the seven questions",
    // The ruling of 2026-11-18: screen 3 HANDS OFF. /intake is the one flow
    // tested end to end on a device, and moving its first question is the only
    // part of this design with real regression risk.
    href: "/intake",
    fine: null,
  },
] as const;

export const TOTAL_SCREENS = LANDING_SCREENS.length;

export function nextIndex(i: number): number {
  return Math.min(i + 1, TOTAL_SCREENS - 1);
}

export function prevIndex(i: number): number {
  return Math.max(i - 1, 0);
}

/** Which progress dots are lit at screen `i`. Matches the intake's `dotLit`. */
export function dotLit(dot: number, screen: number): boolean {
  return dot <= screen;
}

// ---------------------------------------------------------------------------
// The timing table
// ---------------------------------------------------------------------------

export type Beat = {
  /** The CSS custom property that carries this delay into the stylesheet. */
  readonly varName: string;
  readonly delay: number;
  readonly duration: number;
};

/**
 * Every delay and duration in the sequence, in milliseconds, in the order the
 * beats happen. The numbers are read off docs/prototypes/landing-stork.html —
 * they were measured there with `getAnimations()`, not counted by eye.
 *
 * The six beats of the design (§5 of the landing spec):
 *   1 carrying   0 – 1.8s    stork enters on clouds, one baby in the sling
 *   2 drops it   1.8s        sling and baby leave together; the beak stays empty
 *   3 out        1.8 – 2.9s  the baby falls under gravity and is not seen again,
 *                            while the stork accelerates away and off the frame
 *   3b clouds    2.7 – 3.4s  the stork is gone, so the clouds go too
 *   4 paperwork  2.9 – 4.1s  eight pieces spring out of the floor, 70ms apart
 *   5 vanishes   4.2 – 4.9s  they fade out completely, drifting up
 *   6 wordmark   4.8 – 6.0s  the sheet rises, BabySteps thickens, Next lands
 *
 * The sky is EMPTY when it is over — no stork, no clouds, no paperwork. That
 * is the frame the static rules paint, so settling onto it moves nothing.
 */
export const TIMING = {
  /**
   * The stork's whole crossing: in, drop, and gone. Starts immediately.
   *
   * Shortened from 4650ms on 2026-11-18. The stork has to be out of the frame
   * before the paperwork springs at 2950ms, because the order the human asked
   * for is stork leaves THEN paperwork arrives — not both at once.
   */
  cross: { varName: "--t-cross", delay: 0, duration: 2900 },
  /**
   * The sling releases at `RELEASE_AT` of the crossing. Beat 2.
   * It shares `cross`'s duration because it is keyed to the same clock.
   */
  release: { varName: "--t-release", delay: 0, duration: 2900 },
  /**
   * Beat 3. `animation-fill-mode` here MUST be `forwards`, never `both`:
   * `both` paints frame 0 during the delay, which is what hung a second,
   * motionless baby in the sky from page load on 2026-11-17. The test asserts
   * the fill mode, because nothing else can.
   */
  fall: { varName: "--t-fall", delay: 1775, duration: 1160 },
  /**
   * Beat 3b. The clouds exist to give the stork something to fly against, so
   * they leave when it does — fading in at the start, drifting at a constant
   * rate behind it, and gone shortly after it clears the frame.
   */
  clouds: { varName: "--t-clouds", delay: 0, duration: 3400 },
  /** Beat 4. The first piece of paperwork; the rest follow at `springStep`. */
  spring: { varName: "--t-spring", delay: 2950, duration: 700 },
  /** Beat 5. */
  vanish: { varName: "--t-vanish", delay: 4180, duration: 700 },
  /** Beat 6, in five parts. The empty beat between 5 and 6 is deliberate. */
  sheet: { varName: "--t-sheet", delay: 4820, duration: 900 },
  /**
   * Lengthened from 560ms on 2026-11-18: the wordmark is asked to BLEND in
   * rather than arrive, so it resolves out of a blur over a full second. It
   * still lands before the button at 6.0s.
   */
  wordmark: { varName: "--t-wordmark", delay: 4900, duration: 1000 },
  tag: { varName: "--t-tag", delay: 5260, duration: 480 },
  next: { varName: "--t-next", delay: 5400, duration: 600 },
  fine: { varName: "--t-fine", delay: 5560, duration: 480 },
  dots: { varName: "--t-dots", delay: 5640, duration: 480 },
} as const satisfies Record<string, Beat>;

/**
 * Where in the crossing the sling opens, as a fraction of `cross.duration`.
 *
 * Load-bearing in three places that must agree or the baby teleports: the
 * `l-release` keyframe that hides the sling, the `l-cross` keyframe that fixes
 * where the stork is at that instant, and `.l-falling`'s own left/top, which
 * were computed from that position. 0.61 x 2900ms = 1769ms, against `fall`'s
 * 1775ms delay.
 */
export const RELEASE_AT = 0.61;

/** The gap between one piece of paperwork springing and the next. */
export const SPRING_STEP = 70;

/** How many pieces of paperwork spring out of the floor. */
export const PAPERWORK = 8;

/**
 * When the button has finished arriving, from the sequence's own clock.
 *
 * The design says six seconds and that number is load-bearing — it is the cost
 * the human accepted, and §9 of the design calls it "the cost nobody has paid
 * yet". So it is derived here and asserted in the tests: if any beat is retimed
 * without re-reading that paragraph, the suite goes red rather than the landing
 * quietly getting slower.
 */
export const MS_TO_BUTTON = TIMING.next.delay + TIMING.next.duration;

/** The whole sequence, including the beats that land after the button. */
export const MS_TO_REST = Math.max(
  ...Object.values(TIMING).map((b) => b.delay + b.duration),
  TIMING.spring.delay + SPRING_STEP * (PAPERWORK - 1) + TIMING.spring.duration,
);
