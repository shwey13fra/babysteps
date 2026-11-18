// The landing sequence on `/`.
//
// WHY THIS FILE IS SHAPED THE WAY IT IS. The session of 2026-11-17 shipped two
// animations that reported success by rendering something: a `<use>` shadow
// tree that silently unhooked every selector, so the wings were never flapping
// in any version shown; and an `animation-fill-mode: both` that painted a
// second, motionless baby in the sky from page load. Neither raised an error.
// Both looked finished. The lesson recorded was: a declaration that is
// syntactically valid and semantically inert is invisible to a glance, so stop
// looking and measure the property.
//
// Vitest here runs in `environment: "node"` with no DOM, so this suite cannot
// measure a rendered property — that is the VERIFY gate's job, in a browser,
// against the deployed page. What it CAN do is hold the stylesheet and the
// TypeScript timing table to each other, and hold both to the written design.
// Those are exactly the couplings that silently came apart last time.
//
// CLAUDE.md rule 16: every check below is run twice — once against the real
// file, and once against a deliberately mutated copy of it, asserting the
// check goes the other way. Three gates in this project have already been
// caught on their way to failing open, so a matcher that cannot fail is worse
// than no matcher, because it reports safety.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  LANDING_SCREENS,
  MS_TO_BUTTON,
  PAPERWORK,
  SEEN_KEY,
  SPRING_STEP,
  RELEASE_AT,
  TIMING,
  TOTAL_SCREENS,
  dotLit,
  nextIndex,
  prevIndex,
} from "@/lib/ui/landing";

const CSS = readFileSync("app/globals.css", "utf8");
const COMPONENT = readFileSync("app/landing-sequence.tsx", "utf8");
const ART = readFileSync("app/landing-art.tsx", "utf8");

/**
 * The artwork with its comments removed.
 *
 * The colour checks below must read what is drawn, not what is explained: the
 * file's own header names the two hexes it exists to avoid, and a matcher that
 * cannot tell a rejected value from a used one would fail on its own rationale.
 */
const ART_CODE = ART.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** Where the landing's own section of the stylesheet begins. */
const MARKER = "Phase 7 stage H";

function landingSection(css: string): string {
  const at = css.indexOf(MARKER);
  if (at === -1) throw new Error(`the landing CSS section (${MARKER}) is missing from globals.css`);
  // The marker lives inside the section's own banner comment, so slicing at it
  // would leave a dangling `*/` that unbalances the brace counting below.
  // Start after that banner closes.
  const afterBanner = css.indexOf("*/", at);
  if (afterBanner === -1) throw new Error("the landing CSS banner comment is unterminated");
  return css.slice(afterBanner + 2);
}

type Rule = { selector: string; body: string };

/**
 * Top-level rule blocks, brace-counted so a nested `@keyframes` body cannot be
 * mistaken for a selector. `@`-rules are returned too; callers filter them.
 */
function rules(section: string): Rule[] {
  const out: Rule[] = [];
  let depth = 0;
  let start = 0;
  let selectorEnd = -1;
  for (let i = 0; i < section.length; i++) {
    const c = section[i];
    if (c === "{") {
      if (depth === 0) selectorEnd = i;
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0) {
        out.push({
          selector: section.slice(start, selectorEnd).trim(),
          body: section.slice(selectorEnd + 1, i),
        });
        start = i + 1;
      }
    }
  }
  return out;
}

/** Strips `/* ... *\/` so a selector quoted in a comment is never matched. */
function uncommented(section: string): string {
  return section.replace(/\/\*[\s\S]*?\*\//g, "");
}

// ---------------------------------------------------------------------------
// ADR-086 — the brochure may move, the instrument may not
// ---------------------------------------------------------------------------

/**
 * Every selector that turns an animation on must be scoped to the landing.
 *
 * This is the whole enforcement of ADR-086. The fence between `/` and
 * `/timeline` is one className away from leaking, and a leak would put motion
 * on the screen a frightened person reads for a date.
 */
function unscopedAnimationSelectors(section: string): string[] {
  const bad: string[] = [];
  for (const rule of rules(uncommented(section))) {
    if (rule.selector.startsWith("@")) continue;
    if (!/(^|[;\s])animation(-name|-delay|-duration)?\s*:/.test(rule.body)) continue;
    for (const part of rule.selector.split(",")) {
      const s = part.trim();
      if (s && !s.startsWith(".landing")) bad.push(s);
    }
  }
  return bad;
}

describe("ADR-086: nothing outside the landing is allowed to move", () => {
  it("scopes every animated selector under .landing", () => {
    expect(unscopedAnimationSelectors(landingSection(CSS))).toEqual([]);
  });

  it("CONTROL: notices a single selector that escapes the scope", () => {
    const leaked = landingSection(CSS).replace(
      '.landing[data-motion="playing"] .l-bird {',
      ".l-bird, .row {",
    );
    // The mutation must actually have applied, or the control proves nothing.
    expect(leaked).not.toBe(landingSection(CSS));
    expect(unscopedAnimationSelectors(leaked)).toContain(".row");
  });

  it("CONTROL: the matcher reads animation-delay too, not only the shorthand", () => {
    const sneaky = ".timeline-row { animation-delay: 200ms; }";
    expect(unscopedAnimationSelectors(sneaky)).toContain(".timeline-row");
  });
});

// ---------------------------------------------------------------------------
// The fill mode that hung a second baby in the sky
// ---------------------------------------------------------------------------

function fallingFillMode(section: string): string | null {
  const rule = rules(uncommented(section)).find((r) => r.selector.includes(".l-falling") && /animation\s*:/.test(r.body));
  if (!rule) return null;
  const decl = /animation\s*:([^;]+);/.exec(rule.body);
  if (!decl) return null;
  if (/\bboth\b/.test(decl[1])) return "both";
  if (/\bbackwards\b/.test(decl[1])) return "backwards";
  if (/\bforwards\b/.test(decl[1])) return "forwards";
  return "none";
}

describe("the falling baby is painted only while it is falling", () => {
  it("uses fill-mode forwards, never both", () => {
    // `both` tells the browser to paint frame 0 during the 1775ms delay, which
    // is a second, motionless baby hanging in the sky from page load. It was on
    // screen in every frame that was looked at on 2026-11-17.
    expect(fallingFillMode(landingSection(CSS))).toBe("forwards");
  });

  it("CONTROL: notices the regression if `both` comes back", () => {
    const regressed = landingSection(CSS).replace(
      "animation: l-fall var(--t-fall-dur) var(--t-fall-delay) forwards;",
      "animation: l-fall var(--t-fall-dur) var(--t-fall-delay) both;",
    );
    expect(regressed).not.toBe(landingSection(CSS));
    expect(fallingFillMode(regressed)).toBe("both");
  });

  it("holds the rested frame at opacity 0 so nothing is painted without the fall", () => {
    const base = rules(uncommented(landingSection(CSS))).find((r) => r.selector === ".l-falling");
    expect(base?.body).toMatch(/opacity:\s*0\s*;/);
  });
});

// ---------------------------------------------------------------------------
// The invariant: the still frame IS the frame the sequence ends on
// ---------------------------------------------------------------------------
//
// Found by a human watching it, on 2026-11-18, after this suite was already
// green: "a stork comes and is just there on the screen". The sequence ran,
// the stork flew off the right-hand edge, and then at t=6.12s — when the
// component settles — the animation was removed and the bird SNAPPED BACK to
// whatever the static rule said. Measured: 837px against 1382px, a 545px jump
// across a 560px frame.
//
// Nothing here could have caught it, because every check measured `playing` and
// `rested` separately and the defect lives only in the step between them. The
// rule that prevents the whole class: anything that holds a position after the
// sequence must hold the SAME position the static rule gives it, and anything
// that cannot (an `infinite` animation has no final frame) must not animate.

/** The `transform` declared by a plain, un-animated rule. */
function baseTransform(section: string, selector: string): string | null {
  const rule = rules(uncommented(section)).find((r) => r.selector === selector);
  const m = rule ? /transform:\s*([^;]+);/.exec(rule.body) : null;
  return m ? m[1].trim() : null;
}

/** The `transform` at the last keyframe of a named animation. */
function finalKeyframeTransform(section: string, name: string): string | null {
  const at = section.indexOf(`@keyframes ${name}`);
  if (at === -1) return null;
  const open = section.indexOf("{", at);
  let depth = 0;
  let end = open;
  for (let i = open; i < section.length; i++) {
    if (section[i] === "{") depth++;
    else if (section[i] === "}" && --depth === 0) {
      end = i;
      break;
    }
  }
  const body = section.slice(open, end);
  const last = /(?:100%|to)\s*\{([^}]*)\}/.exec(body);
  const m = last ? /transform:\s*([^;]+);/.exec(last[1]) : null;
  return m ? m[1].trim() : null;
}

/** The `opacity` at the last keyframe of a named animation. */
function finalKeyframeOpacity(section: string, name: string): string | null {
  const at = section.indexOf(`@keyframes ${name}`);
  if (at === -1) return null;
  const open = section.indexOf("{", at);
  let depth = 0;
  let end = open;
  for (let i = open; i < section.length; i++) {
    if (section[i] === "{") depth++;
    else if (section[i] === "}" && --depth === 0) {
      end = i;
      break;
    }
  }
  const last = /(?:100%|to)\s*\{([^}]*)\}/.exec(section.slice(open, end));
  const m = last ? /opacity:\s*([^;]+)\s*;/.exec(last[1]) : null;
  return m ? m[1].trim() : null;
}

describe("settling moves nothing", () => {
  it("rests the stork exactly where the crossing leaves it", () => {
    const base = baseTransform(landingSection(CSS), ".l-bird");
    const end = finalKeyframeTransform(landingSection(CSS), "l-cross");
    expect(base).not.toBeNull();
    expect(end).not.toBeNull();
    expect(end).toBe(base);
  });

  it("CONTROL: notices the two drifting apart", () => {
    const regressed = landingSection(CSS).replace(
      "100% { transform: translate(620px, -70px); }",
      "100% { transform: translate(74px, 2px); }",
    );
    expect(regressed).not.toBe(landingSection(CSS));
    expect(finalKeyframeTransform(regressed, "l-cross")).not.toBe(baseTransform(regressed, ".l-bird"));
  });

  it("CONTROL: the two readers are not both returning null", () => {
    // Two nulls compare equal, which would pass the invariant vacuously.
    expect(baseTransform(landingSection(CSS), ".l-bird")).toMatch(/^translate\(/);
    expect(finalKeyframeTransform(landingSection(CSS), "l-cross")).toMatch(/^translate\(/);
  });

  it("runs no infinite animation, because an infinite one has no final frame", () => {
    const offenders = rules(uncommented(landingSection(CSS)))
      .filter((r) => /animation[^;]*\binfinite\b/.test(r.body))
      .map((r) => r.selector);
    expect(offenders).toEqual([]);
  });

  it("CONTROL: notices an infinite animation coming back", () => {
    const regressed = ".landing[data-motion=\"playing\"] .l-cloud-a { animation: l-drift 19s linear infinite; }";
    const offenders = rules(uncommented(regressed)).filter((r) => /animation[^;]*\binfinite\b/.test(r.body));
    expect(offenders).toHaveLength(1);
  });

  it("ends the sky empty — no stork, no clouds, no paperwork", () => {
    // The static frame a returning visitor and a reduced-motion reader get.
    const section = uncommented(landingSection(CSS));
    const cloud = rules(section).find((r) => r.selector === ".l-cloud");
    expect(cloud?.body, ".l-cloud must rest invisible").toMatch(/opacity:\s*0\s*;/);
    expect(finalKeyframeOpacity(landingSection(CSS), "l-cloud-pass")).toBe("0");
    expect(finalKeyframeOpacity(landingSection(CSS), "l-vanish")).toBe("0");
  });

  it("CONTROL: that opacity reader is not just returning null", () => {
    expect(finalKeyframeOpacity(landingSection(CSS), "l-fade-up")).toBe("1");
  });

  it("returns the wings to neutral, which is what the static rule gives them", () => {
    // `infinite alternate` stops at an arbitrary angle; the static rule has no
    // transform at all, so the wings would jump on settle.
    for (const name of ["l-flap-near", "l-flap-far"]) {
      expect(finalKeyframeTransform(landingSection(CSS), name)).toBe("rotate(0deg)");
    }
  });
});

// ---------------------------------------------------------------------------
// The stylesheet and the timing table are the same numbers
// ---------------------------------------------------------------------------

function declaredTiming(section: string): Record<string, number> {
  const rule = rules(uncommented(section)).find((r) => r.selector === ".landing");
  if (!rule) throw new Error(".landing rule not found");
  const out: Record<string, number> = {};
  for (const m of rule.body.matchAll(/(--t-[a-z]+-(?:delay|dur))\s*:\s*(\d+)ms/g)) {
    out[m[1]] = Number(m[2]);
  }
  return out;
}

describe("the CSS and lib/ui/landing.ts cannot drift apart", () => {
  const declared = declaredTiming(landingSection(CSS));

  it.each(Object.entries(TIMING))("%s has the same delay and duration in both places", (_name, beat) => {
    expect(declared[`${beat.varName}-delay`]).toBe(beat.delay);
    expect(declared[`${beat.varName}-dur`]).toBe(beat.duration);
  });

  it("declares every beat and no orphans", () => {
    const expected = Object.values(TIMING).flatMap((b) => [`${b.varName}-delay`, `${b.varName}-dur`]);
    expect(Object.keys(declared).sort()).toEqual(expected.sort());
  });

  it("CONTROL: notices a retimed beat in the stylesheet", () => {
    const retimed = landingSection(CSS).replace("--t-next-delay: 5400ms;", "--t-next-delay: 9000ms;");
    expect(retimed).not.toBe(landingSection(CSS));
    expect(declaredTiming(retimed)["--t-next-delay"]).not.toBe(TIMING.next.delay);
  });
});

// ---------------------------------------------------------------------------
// Six seconds is the cost that was agreed, so it is asserted, not counted
// ---------------------------------------------------------------------------

describe("the button arrives at six seconds", () => {
  it("is 6.0s from the sequence's own clock", () => {
    // §9 of the design calls this "the cost nobody has paid yet". If a beat is
    // retimed without re-reading that paragraph, this goes red rather than the
    // landing quietly getting slower.
    expect(MS_TO_BUTTON).toBe(6000);
  });

  it("CONTROL: the number is derived from the table, not hard-coded", () => {
    const moved = { ...TIMING.next, delay: TIMING.next.delay + 500 };
    expect(moved.delay + moved.duration).not.toBe(MS_TO_BUTTON);
  });

  it("springs all eight pieces of paperwork before they are told to vanish", () => {
    const lastSpringEnds = TIMING.spring.delay + SPRING_STEP * (PAPERWORK - 1) + TIMING.spring.duration;
    expect(lastSpringEnds).toBeLessThanOrEqual(TIMING.vanish.delay);
  });

  it("leaves the sky empty for a beat before the wordmark arrives", () => {
    // The empty beat is deliberate: it is what makes the wordmark land rather
    // than arrive in a crowd.
    const paperworkGone = TIMING.vanish.delay + TIMING.vanish.duration;
    expect(TIMING.sheet.delay).toBeGreaterThanOrEqual(paperworkGone - 100);
  });

  it("releases the sling at beat two, not at the end of the crossing", () => {
    // The fall starts where the release keyframe opens the sling. If either
    // moves alone, the baby teleports out of a beak that is somewhere else.
    const releaseAt = TIMING.cross.duration * RELEASE_AT;
    expect(Math.abs(TIMING.fall.delay - releaseAt)).toBeLessThan(20);
  });

  it("gets the stork out of the frame before the paperwork arrives", () => {
    // The order the human asked for: the stork leaves, THEN the paperwork
    // springs. Both at once is the thing this retiming fixed.
    expect(TIMING.cross.delay + TIMING.cross.duration).toBeLessThanOrEqual(TIMING.spring.delay);
  });

  it("lets the baby finish falling before the paperwork arrives", () => {
    expect(TIMING.fall.delay + TIMING.fall.duration).toBeLessThanOrEqual(TIMING.spring.delay + 50);
  });

  it("takes the clouds away with the stork, not before it", () => {
    const storkGone = TIMING.cross.delay + TIMING.cross.duration;
    const cloudsGone = TIMING.clouds.delay + TIMING.clouds.duration;
    expect(cloudsGone).toBeGreaterThanOrEqual(storkGone);
    // ...and not left hanging over the wordmark either.
    expect(cloudsGone).toBeLessThanOrEqual(TIMING.sheet.delay);
  });
});

// ---------------------------------------------------------------------------
// The skip control the prototype did not have
// ---------------------------------------------------------------------------

function skipIsAButton(source: string): boolean {
  return /<button[^>]*className="l-skip"/.test(source);
}

describe("six seconds is always escapable", () => {
  it("offers a real button, not a click handler on a div", () => {
    // docs/prototypes/landing-stork.html:300 skipped on a click anywhere on a
    // div: no keyboard path, no accessible name, no visible control.
    expect(skipIsAButton(COMPONENT)).toBe(true);
  });

  it("CONTROL: notices if it goes back to being a div", () => {
    const regressed = COMPONENT.replace(/<button([^>]*className="l-skip")/, "<div$1");
    expect(regressed).not.toBe(COMPONENT);
    expect(skipIsAButton(regressed)).toBe(false);
  });

  it("gives the skip control a 44px target", () => {
    const rule = rules(uncommented(landingSection(CSS))).find((r) => r.selector === ".l-skip");
    expect(rule?.body).toMatch(/min-height:\s*44px/);
  });

  it("settles the sequence on first keyboard focus", () => {
    // Next arrives with fill-mode `both`, so it is focusable at opacity 0 for
    // 5.4s. Without this, the first Tab puts focus on an invisible button.
    expect(COMPONENT).toMatch(/onFocusCapture=\{motion === "playing" \? settle : undefined\}/);
  });

  it("moves focus on a screen change and not on first load", () => {
    // Measured on a fresh load of `/`: document.activeElement was
    // H1.l-heading. The cause was a boolean "have we mounted" ref, which
    // SURVIVES the remount React performs in Strict Mode — so the second pass
    // read the flag as already set, concluded a screen change had happened,
    // and took focus. Comparing the screen value instead is idempotent.
    expect(COMPONENT).toMatch(/focusedFor\.current === screen\) return/);
    expect(COMPONENT).not.toMatch(/mounted\.current/);
  });

  it("CONTROL: notices the mount-flag shape coming back", () => {
    const regressed = COMPONENT.replace(
      "if (focusedFor.current === screen) return;",
      "if (!mounted.current) { mounted.current = true; return; }",
    );
    expect(regressed).not.toBe(COMPONENT);
    expect(regressed).toMatch(/mounted\.current/);
    expect(regressed).not.toMatch(/focusedFor\.current === screen\) return/);
  });

  it("never gates the forward control behind the animation", () => {
    // §4 of the design: a parent who cannot act for six seconds is the failure
    // this was built to avoid. The control is rendered unconditionally.
    expect(COMPONENT).not.toMatch(/motion === "rested" &&[\s\S]{0,80}l-next/);
    expect(COMPONENT).toMatch(/className="btn-primary l-next"/);
  });
});

// ---------------------------------------------------------------------------
// Seen once, then never again
// ---------------------------------------------------------------------------

type Store = { store: Map<string, string>; throws: boolean };

function withFakeStorage(state: Store, run: () => void): void {
  const fake = {
    getItem: (k: string) => {
      if (state.throws) throw new Error("blocked");
      return state.store.get(k) ?? null;
    },
    setItem: (k: string, v: string) => {
      if (state.throws) throw new Error("blocked");
      state.store.set(k, v);
    },
    removeItem: (k: string) => {
      if (state.throws) throw new Error("blocked");
      state.store.delete(k);
    },
  };
  const g = globalThis as { window?: unknown };
  const had = "window" in g;
  const prev = g.window;
  g.window = { localStorage: fake };
  try {
    run();
  } finally {
    if (had) g.window = prev;
    else delete g.window;
  }
}

describe("the sequence is a welcome once and an obstacle after", () => {
  it("reports unseen, then seen, once marked", async () => {
    const state: Store = { store: new Map(), throws: false };
    const { hasSeenLanding, markLandingSeen } = await import("@/lib/ui/landing");
    withFakeStorage(state, () => {
      expect(hasSeenLanding()).toBe(false);
      markLandingSeen();
      expect(hasSeenLanding()).toBe(true);
    });
    expect(state.store.get(SEEN_KEY)).toBe("1");
  });

  it("CONTROL: a browser that blocks storage plays the sequence rather than erroring", async () => {
    const state: Store = { store: new Map(), throws: true };
    const { hasSeenLanding, markLandingSeen } = await import("@/lib/ui/landing");
    withFakeStorage(state, () => {
      expect(() => markLandingSeen()).not.toThrow();
      // False is the safe direction: a reader in private mode sees the
      // animation again rather than a frame with no explanation of how it
      // got there.
      expect(hasSeenLanding()).toBe(false);
    });
  });

  it("reads storage in an effect, never during render", () => {
    // Reading localStorage in the render pass hands React a different first
    // frame on the client than the one the server sent.
    const render = COMPONENT.slice(COMPONENT.indexOf("return ("));
    expect(render).not.toContain("hasSeenLanding");
  });
});

// ---------------------------------------------------------------------------
// The screens themselves
// ---------------------------------------------------------------------------

describe("three screens, and the handoff", () => {
  it("has exactly three", () => {
    expect(TOTAL_SCREENS).toBe(3);
    expect(LANDING_SCREENS.map((s) => s.id)).toEqual(["promise", "boundary", "question"]);
  });

  it("hands off to /intake rather than restructuring it", () => {
    // Ruled 2026-11-18. /intake is the one flow tested end to end on a device.
    const last = LANDING_SCREENS[TOTAL_SCREENS - 1];
    expect(last.href).toBe("/intake");
    expect(LANDING_SCREENS.slice(0, -1).every((s) => s.href === null)).toBe(true);
  });

  it("keeps the action's name the same as the control it replaces", () => {
    // §7: an action keeps its name across screens. This is the wording the old
    // single-page landing used.
    expect(LANDING_SCREENS[2].forward).toBe("Answer the seven questions");
  });

  it("states the boundary as three things it does not do", () => {
    const boundary = LANDING_SCREENS[1];
    expect(boundary.heading).toBe("What it does not do");
    expect(boundary.body.filter((l) => l.startsWith("It does not"))).toHaveLength(3);
  });

  it("never dramatises and never soothes", () => {
    // §7: the interface never sounds relieved or worried on the user's behalf.
    const words = LANDING_SCREENS.flatMap((s) => [s.heading, s.forward, s.fine ?? "", ...s.body]).join(" ");
    expect(words).not.toMatch(/!|\bdon't worry\b|\bURGENT\b|\beasy\b|\bsimply\b/i);
  });

  it("CONTROL: that matcher would catch an exclamation mark", () => {
    expect("Start now!").toMatch(/!|\bdon't worry\b|\bURGENT\b|\beasy\b|\bsimply\b/i);
  });

  it("clamps at both ends", () => {
    expect(prevIndex(0)).toBe(0);
    expect(nextIndex(TOTAL_SCREENS - 1)).toBe(TOTAL_SCREENS - 1);
    expect(nextIndex(0)).toBe(1);
    expect(prevIndex(2)).toBe(1);
  });

  it("lights one dot per screen reached", () => {
    expect([0, 1, 2].map((d) => dotLit(d, 0))).toEqual([true, false, false]);
    expect([0, 1, 2].map((d) => dotLit(d, 2))).toEqual([true, true, true]);
  });
});

// ---------------------------------------------------------------------------
// The drawing stays inside the palette
// ---------------------------------------------------------------------------

describe("the artwork invents no colour", () => {
  it("uses no emoji as an icon", () => {
    // The prototype's eight pieces of paperwork were emoji: vendor glyphs that
    // change shape between a Pixel and an iPhone, carry their own colour, and
    // cannot take a dark-mode token.
    expect(ART_CODE).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it("CONTROL: that matcher would catch one", () => {
    expect("📅").toMatch(/\p{Extended_Pictographic}/u);
  });

  it("introduces neither of the prototype's two ad-hoc hexes", () => {
    // The landing spec §5 binds this build to "existing tokens only. Nothing
    // new invented." The prototype declared --amber and --far; §6 of the same
    // document says the far wing is --ink.
    expect(ART_CODE).not.toMatch(/#C98A14|#241C3D/i);
    expect(ART_CODE).not.toMatch(/var\(--amber\)|var\(--far\)/);
  });

  it("CONTROL: the comment stripper has not simply emptied the file", () => {
    // A matcher that passes because it was handed an empty string reports
    // safety it did not check. ART_CODE must still hold the drawing.
    expect(ART_CODE).toContain("<svg");
    expect(ART_CODE.length).toBeGreaterThan(ART.length / 2);
    expect(ART_CODE.replace(/var\(--ink\)/g, "")).not.toContain("--ink)");
  });

  it("carries no German-track green, because the landing names no track", () => {
    // The human's instruction, 2026-11-18: the landing uses the purple palette.
    // This is the check that was missing when it was first reported done — the
    // earlier sweep looked at `color` and `background`, and SVG paints with
    // `fill` and `stroke`, so it read the artwork as clean while the paperwork
    // and the quilt were still green.
    expect(ART_CODE).not.toMatch(/var\(--de(-soft)?\)/);
    expect(ART_CODE).toContain('fill="var(--in)"');
    expect(ART_CODE).toContain('fill="var(--art-far)"');
  });

  it("CONTROL: that matcher reads fill and stroke, not just colour properties", () => {
    expect('<path fill="var(--de)" />').toMatch(/var\(--de(-soft)?\)/);
    expect('<path stroke="var(--de-soft)" />').toMatch(/var\(--de(-soft)?\)/);
  });
});

// ---------------------------------------------------------------------------
// Centring, which inheritance alone cannot do here
// ---------------------------------------------------------------------------

describe("the landing's text is actually centred", () => {
  /** The selectors that a bare `text-align: center` on a parent cannot reach. */
  const DIRECTLY_TARGETED = [".l-wordmark", ".l-heading", ".l-body", ".l-fine"];

  it("names every text element instead of relying on the parent", () => {
    // §3 is enforced by `body, p, li, h1, h2, h3, h4 { text-align: left }`,
    // which matches these elements DIRECTLY — and a matching rule always beats
    // an inherited value. Centring the container therefore centres nothing.
    const section = uncommented(landingSection(CSS));
    const centred = rules(section).filter((r) => /text-align:\s*center/.test(r.body));
    const covered = centred.flatMap((r) => r.selector.split(",").map((p) => p.trim()));
    for (const sel of DIRECTLY_TARGETED) {
      expect(
        covered.some((c) => c.endsWith(sel)),
        `${sel} is not named in any text-align: center rule, so the global 'p { text-align: left }' wins`,
      ).toBe(true);
    }
  });

  it("CONTROL: notices one of them dropping out", () => {
    // CRLF-tolerant: this file is checked out with Windows line endings, and a
    // literal "\n" in the search string silently matches nothing.
    const regressed = landingSection(CSS).replace(/\.landing \.l-heading,\r?\n/, "");
    expect(regressed).not.toBe(landingSection(CSS));
    const covered = rules(uncommented(regressed))
      .filter((r) => /text-align:\s*center/.test(r.body))
      .flatMap((r) => r.selector.split(",").map((p) => p.trim()));
    expect(covered.some((c) => c.endsWith(".l-heading"))).toBe(false);
  });

  it("CONTROL: the global left-align rule that causes this is still there", () => {
    // If §3's rule were ever removed, this whole guard would be unnecessary —
    // and silently passing for the wrong reason.
    expect(uncommented(CSS)).toMatch(/h4\s*\{\s*text-align:\s*left/);
  });
});

// ---------------------------------------------------------------------------
// Hydration
// ---------------------------------------------------------------------------

describe("the first client render matches what the server sent", () => {
  it("never reads the preference as the hydration snapshot", () => {
    // `/` is prerendered static, so the server cannot know whether this
    // browser has seen the sequence. Passing `hasSeenLanding` straight into
    // useSyncExternalStore made the client's hydration render disagree with
    // the server's HTML — React reported data-motion as mismatched and said it
    // would not be patched. The snapshot must be a constant on each side; the
    // preference is read on the render AFTER hydration.
    expect(COMPONENT).toMatch(/useSyncExternalStore\(noSubscribe,\s*clientSnapshot,\s*serverSnapshot\)/);
    expect(COMPONENT).not.toMatch(/useSyncExternalStore\([^)]*hasSeenLanding/);
  });

  it("CONTROL: notices the preference being wired back in as the snapshot", () => {
    const regressed = COMPONENT.replace(
      "useSyncExternalStore(noSubscribe, clientSnapshot, serverSnapshot)",
      "useSyncExternalStore(noSubscribe, hasSeenLanding, serverSnapshot)",
    );
    expect(regressed).not.toBe(COMPONENT);
    expect(regressed).toMatch(/useSyncExternalStore\([^)]*hasSeenLanding/);
  });

  it("gates the preference behind the hydrated flag", () => {
    expect(COMPONENT).toMatch(/const seen = hydrated && hasSeenLanding\(\)/);
  });

  it("keeps the server snapshot as 'not seen', so the server always sends the sequence", () => {
    expect(COMPONENT).toMatch(/const serverSnapshot = \(\) => false/);
  });
});
