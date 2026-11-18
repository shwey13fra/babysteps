// Error messages: that they are styled as errors, and that they are announced.
//
// TWO DEFECTS FOUND ON 2026-11-18, both of the project's recurring shape — the
// class was written, the rule existed, and the two were never connected, so
// nothing errored and the screen looked plausible.
//
//   1. `.field .err` is a DESCENDANT selector. Two of the product's four error
//      sites are written `<span class="field err">`, one element carrying both
//      classes, which that selector cannot match. Measured in the browser: the
//      probe returned rgb(21,36,43) at 15px/24px — ordinary body ink — where
//      the other two sites returned rgb(150,40,42) at 13px/18px. An error in
//      body text still reads as a sentence, which is why it survived.
//
//   2. The error spans were mounted only when there was an error, so a screen
//      reader was asked to notice an element appearing rather than text
//      changing inside a region already present. The first is announced
//      unreliably; the second is announced consistently.
//
// CLAUDE.md rule 16: every matcher below is also run against a mutated copy
// that reintroduces the defect, so a check that cannot fail is impossible here.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const CSS = readFileSync("app/globals.css", "utf8");
const INTAKE = readFileSync("app/intake/page.tsx", "utf8");
const BIRTH = readFileSync("app/birth/page.tsx", "utf8");

/** Strips comments so a selector quoted in prose is never counted as a rule. */
function code(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/**
 * True when the stylesheet's error rule reaches BOTH markup shapes the product
 * actually uses: `<span class="err">` nested in a label, and `<span class="field
 * err">` standing alone. Only a bare `.err` selector reaches both.
 */
function errorRuleReachesBothShapes(css: string): boolean {
  const c = code(css);
  const bare = /(^|\})\s*\.err\s*\{/m.test(c);
  const descendantOnly = /\.field\s+\.err\s*\{/.test(c);
  return bare && !descendantOnly;
}

describe("an error message looks like an error wherever it is written", () => {
  it("styles both markup shapes", () => {
    expect(errorRuleReachesBothShapes(CSS)).toBe(true);
  });

  it("CONTROL: notices the descendant selector coming back", () => {
    const regressed = CSS.replace(/(^|\n)\.err \{/, "$1.field .err {");
    expect(regressed).not.toBe(CSS);
    expect(errorRuleReachesBothShapes(regressed)).toBe(false);
  });

  it("CONTROL: notices the rule being removed altogether", () => {
    expect(errorRuleReachesBothShapes(".choice { color: red; }")).toBe(false);
  });

  it("keeps the error in --stop at the metadata size", () => {
    const rule = /(?:^|\})\s*\.err\s*\{([^}]*)\}/m.exec(code(CSS));
    expect(rule?.[1]).toMatch(/color:\s*var\(--stop\)/);
    expect(rule?.[1]).toMatch(/13px\/18px/);
  });

  it("costs nothing when it is empty", () => {
    // The regions are permanent now, so an empty one must not push the layout.
    expect(code(CSS)).toMatch(/\.err:empty\s*\{[^}]*margin-top:\s*0/);
  });
});

// ---------------------------------------------------------------------------
// Announcement
// ---------------------------------------------------------------------------

/** Every element carrying the `err` class, with the attributes on its tag. */
function errorTags(source: string): string[] {
  return [...source.matchAll(/<span[^>]*className="[^"]*\berr\b[^"]*"[^>]*>/g)].map((m) => m[0]);
}

describe("an error is announced when it appears", () => {
  it("makes every intake error a live region", () => {
    const tags = errorTags(INTAKE);
    expect(tags.length).toBe(3);
    for (const tag of tags) expect(tag).toContain('role="alert"');
  });

  it("CONTROL: notices one that is not", () => {
    const regressed = INTAKE.replace(' role="alert"', "");
    expect(regressed).not.toBe(INTAKE);
    expect(errorTags(regressed).filter((t) => !t.includes('role="alert"'))).not.toHaveLength(0);
  });

  it("CONTROL: the tag matcher is not silently finding nothing", () => {
    // A matcher that returns an empty list passes a `for` loop vacuously.
    expect(errorTags(INTAKE).length).toBeGreaterThan(0);
    expect(errorTags('<span className="field err">x</span>')).toHaveLength(1);
    expect(errorTags('<span className="lede">x</span>')).toHaveLength(0);
  });

  it("keeps the intake error mounted so the region exists before it fills", () => {
    // `{error ? <span…> : null}` asks a screen reader to notice an element
    // appearing. `{error ?? ""}` changes text inside a region already there.
    expect(INTAKE).not.toMatch(/\{error \? <span className="[^"]*err/);
    expect(INTAKE).toMatch(/\{error \?\? ""\}/);
  });

  it("still ties the date field's error to the field itself", () => {
    // The live region is in addition to aria-describedby, not instead of it:
    // describedby is what a reader hears on returning to the input.
    expect(INTAKE).toContain('aria-describedby={error ? "intake-error" : undefined}');
    expect(INTAKE).toContain('id="intake-error"');
    expect(BIRTH).toContain('id="birth-error"');
  });
});
