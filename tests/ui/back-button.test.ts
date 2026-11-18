// The way back, as an arrow rather than the word "Back".
//
// An icon-only control is the one case where the thing a sighted person reads
// and the thing a screen reader reads are entirely separate, so nothing about
// the rendered page reveals that the second one is missing. A bare chevron in
// the corner looks finished either way — which is the shape of defect this
// project keeps meeting, and the reason this file exists at all.
//
// CLAUDE.md rule 16: every check also runs against a mutated copy.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const COMPONENT = readFileSync("app/back-button.tsx", "utf8");
const CSS = readFileSync("app/globals.css", "utf8");
const INTAKE = readFileSync("app/intake/page.tsx", "utf8");
const LANDING = readFileSync("app/landing-sequence.tsx", "utf8");

function hasAccessibleName(source: string): boolean {
  const tag = /<button[\s\S]*?>/.exec(source);
  return tag ? /aria-label=\{/.test(tag[0]) : false;
}

describe("the arrow says what it is", () => {
  it("carries an accessible name", () => {
    expect(hasAccessibleName(COMPONENT)).toBe(true);
  });

  it("CONTROL: notices the name being dropped", () => {
    const regressed = COMPONENT.replace(" aria-label={label}", "");
    expect(regressed).not.toBe(COMPONENT);
    expect(hasAccessibleName(regressed)).toBe(false);
  });

  it("hides the glyph itself, which is decoration once the button is named", () => {
    expect(COMPONENT).toMatch(/<svg[^>]*aria-hidden="true"/);
  });

  it("is a real button, not a clickable div", () => {
    expect(COMPONENT).toMatch(/<button type="button"/);
  });

  it("requires the label rather than defaulting it", () => {
    // A default of "Back" would let a caller silently ship the vaguest
    // possible name on a screen where going back means something specific.
    expect(COMPONENT).toMatch(/label:\s*string;/);
    expect(COMPONENT).not.toMatch(/label\s*=\s*"Back"/);
  });
});

describe("every caller names it for its own screen", () => {
  it("is used by intake and by the landing", () => {
    expect(INTAKE).toContain("<BackButton");
    expect(LANDING).toContain("<BackButton");
  });

  it("gives a label that says where back goes", () => {
    for (const [name, source] of [
      ["intake", INTAKE],
      ["landing", LANDING],
    ] as const) {
      for (const m of source.matchAll(/<BackButton[\s\S]*?\/>/g)) {
        expect(m[0], `${name}: a BackButton with no label`).toMatch(/label=/);
        expect(m[0], `${name}: a bare "Back" label`).not.toMatch(/label="Back"\s*\/?>/);
      }
    }
  });

  it("CONTROL: that matcher would catch a bare label", () => {
    const bare = '<BackButton onClick={x} label="Back" />';
    expect(bare).toMatch(/label="Back"\s*\/?>/);
  });

  it("leaves no written Back button behind", () => {
    expect(INTAKE).not.toMatch(/className="back"/);
    expect(LANDING).not.toMatch(/className="back"/);
  });
});

describe("the target is big enough to hit", () => {
  it("is 44px square", () => {
    const rule = /\.back-arrow\s*\{([^}]*)\}/.exec(CSS.replace(/\/\*[\s\S]*?\*\//g, ""));
    expect(rule, ".back-arrow rule not found").not.toBeNull();
    expect(rule![1]).toMatch(/width:\s*44px/);
    expect(rule![1]).toMatch(/height:\s*44px/);
  });

  it("keeps the row even when there is nothing to go back to", () => {
    // Otherwise the progress bar jumps up on question one and down again on
    // question two, which reads as the page twitching.
    const rule = /\.topbar\s*\{([^}]*)\}/.exec(CSS.replace(/\/\*[\s\S]*?\*\//g, ""));
    expect(rule![1]).toMatch(/min-height:\s*48px/);
  });

  it("CONTROL: those readers are not returning an empty body", () => {
    const rule = /\.back-arrow\s*\{([^}]*)\}/.exec(CSS.replace(/\/\*[\s\S]*?\*\//g, ""));
    expect(rule![1].length).toBeGreaterThan(40);
    expect(/\.back-arrow\s*\{([^}]*)\}/.exec(".back-arrow { width: 10px; }")![1]).toContain("10px");
  });
});
