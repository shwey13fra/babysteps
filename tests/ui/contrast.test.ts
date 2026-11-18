// Every colour pairing the design system claims, computed from the stylesheet.
//
// WHY THIS EXISTS. design-system.md §2 carried the sentence "Every text-on-fill
// pairing above clears WCAG AA at body size" for three weeks while it was
// false: --ink-3 was at 3.13:1 and --done at 2.35:1 against --paper. It was a
// claim, written down, that nothing checked. ADR-073 fixed the two values and
// recorded the lesson; it did not add a test, so the same sentence was still
// unguarded on 2026-11-18 when a whole second colour scheme was added under it.
//
// So the ratios are not asserted here, they are COMPUTED — from the tokens as
// they actually appear in app/globals.css, in both schemes. If anyone changes a
// hex, this goes red with the pairing and the number.
//
// CLAUDE.md rule 16: the arithmetic is itself checked against known fixed
// points (black on white is 21:1, a colour on itself is 1:1), and the parser is
// checked against the possibility that it quietly found nothing — a loop over
// an empty list passes every assertion in it.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const CSS = readFileSync("app/globals.css", "utf8");

// --- WCAG 2.1 relative luminance -------------------------------------------

function channels(hex: string): [number, number, number] {
  const s = hex.replace("#", "").trim();
  const n = s.length === 3 ? s.split("").map((c) => c + c).join("") : s;
  if (!/^[0-9a-f]{6}$/i.test(n)) throw new Error(`not a hex colour: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16)) as [number, number, number];
}

function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
}

// --- the tokens, as the stylesheet actually declares them -------------------

function tokensIn(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    out[m[1].slice(2)] = m[2];
  }
  return out;
}

/** The first `:root { … }`, which is the light scheme. */
function lightBlock(css: string): string {
  const at = css.indexOf(":root {");
  const end = css.indexOf("\n}", at);
  return css.slice(at, end);
}

/** The `:root` nested inside the dark media query. */
function darkBlock(css: string): string {
  const at = css.indexOf("@media (prefers-color-scheme: dark)");
  if (at === -1) throw new Error("there is no dark colour scheme in globals.css");
  const end = css.indexOf("\n  }", at);
  return css.slice(at, end);
}

const LIGHT = tokensIn(lightBlock(CSS));
const DARK = { ...LIGHT, ...tokensIn(darkBlock(CSS)) };

/** Every token that is ever set as text colour on a page ground. */
const TEXT = ["ink", "ink-2", "ink-3", "done", "de", "in", "warn", "stop"] as const;
/** §5: a chip is a colour on its own soft fill. */
const CHIPS = [
  ["warn", "warn-soft"],
  ["stop", "stop-soft"],
  ["de", "de-soft"],
  ["in", "in-soft"],
] as const;

const SCHEMES = [
  ["light", LIGHT],
  ["dark", DARK],
] as const;

// --- the arithmetic is right before it is trusted ---------------------------

describe("CONTROL: the ratio function itself", () => {
  it("puts black on white at 21:1", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 2);
  });

  it("puts a colour on itself at 1:1", () => {
    expect(contrast("#4c5f68", "#4c5f68")).toBeCloseTo(1, 6);
  });

  it("reproduces the two failures ADR-073 measured with axe-core", () => {
    // The values as they were BEFORE the fix. If this method disagreed with
    // the browser's, these would not come out at the recorded numbers.
    expect(contrast("#7b8f96", "#f4f7f7")).toBeCloseTo(3.13, 1);
    expect(contrast("#93a6ab", "#f4f7f7")).toBeCloseTo(2.35, 1);
  });

  it("rejects something that is not a colour", () => {
    expect(() => luminance("#zzz")).toThrow();
  });
});

describe("CONTROL: the parser found the tokens", () => {
  it("reads a full set from each scheme", () => {
    // A loop over an empty list passes every assertion inside it.
    expect(Object.keys(tokensIn(lightBlock(CSS))).length).toBeGreaterThanOrEqual(15);
    expect(Object.keys(tokensIn(darkBlock(CSS))).length).toBeGreaterThanOrEqual(15);
  });

  it("reads the two schemes as actually different", () => {
    expect(DARK.paper).not.toBe(LIGHT.paper);
    expect(DARK.ink).not.toBe(LIGHT.ink);
  });

  it("covers every token the pairings below name", () => {
    for (const name of [...TEXT, "paper", "surface", "on-de", "accent", "on-accent", ...CHIPS.flat()]) {
      expect(LIGHT[name], `--${name} missing from :root`).toMatch(/^#[0-9a-fA-F]{3,8}$/);
      expect(DARK[name], `--${name} missing from the dark scheme`).toMatch(/^#[0-9a-fA-F]{3,8}$/);
    }
  });
});

// --- the claim in design-system.md §2 ---------------------------------------

describe.each(SCHEMES)("%s scheme clears WCAG AA at body size", (scheme, t) => {
  it.each(TEXT)(`--%s reads on both grounds`, (name) => {
    for (const ground of ["paper", "surface"] as const) {
      const r = contrast(t[name], t[ground]);
      expect(r, `--${name} on --${ground} in ${scheme} is ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(CHIPS)("--%s reads on --%s", (fg, bg) => {
    const r = contrast(t[fg], t[bg]);
    expect(r, `--${fg} on --${bg} in ${scheme} is ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
  });

  it("reads the label on the accent, which every button in the product uses", () => {
    const r = contrast(t["on-accent"], t.accent);
    expect(r, `--on-accent on --accent in ${scheme} is ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
  });

  it("reads the accent as a link colour on every ground it appears on", () => {
    for (const ground of ["paper", "surface", "in-soft"] as const) {
      const r = contrast(t.accent, t[ground]);
      expect(r, `--accent on --${ground} in ${scheme} is ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keeps the action colour visibly apart from both track colours", () => {
    // The whole reason --accent exists. If it drifted onto --in, a violet
    // button would sit on a timeline where violet already means "consular".
    const h = (x: string) => {
      const [r, g, b] = channels(x).map((v) => v / 255);
      const mx = Math.max(r, g, b);
      const mn = Math.min(r, g, b);
      const d = mx - mn;
      if (!d) return 0;
      const raw = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return ((raw * 60) + 360) % 360;
    };
    const gap = Math.abs(h(t.accent) - h(t.in));
    expect(gap, `${scheme}: --accent is only ${gap.toFixed(0)}deg from --in`).toBeGreaterThanOrEqual(15);
  });

  it("reads the text the landing puts on the violet sky", () => {
    // A THIRD ground, added 2026-11-18. The landing blends its content into
    // --in-soft instead of standing it on a white card, so every token placed
    // there needs checking against it — and one of them failed when it was.
    for (const name of ["ink", "ink-2", "in"] as const) {
      const r = contrast(t[name], t["in-soft"]);
      expect(r, `--${name} on --in-soft in ${scheme} is ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("reads the primary button's own label", () => {
    // The pairing a dark scheme cannot inherit: in dark, --de is a light teal
    // and the white that was hard-coded here would read at about 1.4:1.
    const r = contrast(t["on-de"], t.de);
    expect(r, `--on-de on --de in ${scheme} is ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps --done within one step of --ink-3, so colour never marks a done row", () => {
    // ADR-072. The hollow dot and the dropped chip carry that meaning; if
    // --done drifted away from --ink-3 it would start carrying it alone.
    const gap = Math.abs(luminance(t.done) - luminance(t["ink-3"]));
    expect(gap, `${scheme}: --done and --ink-3 differ by ${gap.toFixed(4)} in luminance`).toBeLessThan(0.05);
  });
});

describe("the fine print may not use --ink-3 on the violet sky", () => {
  it("is why .l-fine is --ink-2", () => {
    // --ink-3 clears AA on --paper (4.53) and on --surface (4.88), which were
    // the only grounds it had ever been checked against. On --in-soft it is
    // 4.03 and fails. Moving one line of text onto the sky was enough.
    expect(contrast(LIGHT["ink-3"], LIGHT["in-soft"])).toBeLessThan(4.5);
    const section = CSS.slice(CSS.indexOf("Phase 7 stage H"));
    const fine = /(?:^|\})\s*\.l-fine\s*\{([^}]*)\}/m.exec(section);
    expect(fine?.[1]).toMatch(/color:\s*var\(--ink-2\)/);
  });

  it("CONTROL: notices --ink-3 coming back to that rule", () => {
    const section = CSS.slice(CSS.indexOf("Phase 7 stage H"));
    const fine = /(?:^|\})\s*\.l-fine\s*\{([^}]*)\}/m.exec(section);
    expect(fine, ".l-fine rule not found").not.toBeNull();
    const regressedBody = fine![1].replace("var(--ink-2)", "var(--ink-3)");
    expect(regressedBody).not.toBe(fine![1]);
    expect(regressedBody).not.toMatch(/color:\s*var\(--ink-2\)/);
  });
});

describe("CONTROL: the suite would notice a regression", () => {
  it("fails the pairing that ADR-073 fixed, if it came back", () => {
    const regressed: Record<string, string> = { ...LIGHT, "ink-3": "#7b8f96" };
    expect(contrast(regressed["ink-3"], regressed.paper)).toBeLessThan(4.5);
  });

  it("fails white on the dark scheme's primary button", () => {
    expect(contrast("#ffffff", DARK.de)).toBeLessThan(4.5);
  });
});

// --- the scheme has to be declared, not only defined ------------------------

/**
 * Hard-coded colours in `color:` / `background:` declarations, excluding the
 * two regions that are legitimately exempt: `@media print` (always white
 * paper) and the landing's illustration (a white stork on a coloured sky).
 *
 * Exclusion is by character range rather than by slicing and re-joining, so a
 * mistake in the ranges shows up as a hit rather than as silence.
 */
function hardCodedInterfaceColours(css: string): string[] {
  const exempt: Array<[number, number]> = [];
  const printAt = css.indexOf("@media print");
  if (printAt !== -1) exempt.push([printAt, css.indexOf("\n}", css.indexOf("\n  }", printAt)) + 2]);
  const landingAt = css.indexOf("Phase 7 stage H");
  if (landingAt !== -1) exempt.push([landingAt, css.length]);

  const out: string[] = [];
  for (const m of css.matchAll(/(?:color|background(?:-color)?):\s*(#[0-9a-fA-F]{3,6})/g)) {
    const i = m.index ?? 0;
    if (exempt.some(([a, b]) => i >= a && i < b)) continue;
    out.push(m[1]);
  }
  return out;
}

describe("the browser is told both schemes are real", () => {
  it("declares color-scheme on the root", () => {
    // Without it the UA picks its own colours for the date picker on /intake
    // and /birth, the scrollbars, and the flash before first paint.
    expect(CSS).toMatch(/color-scheme:\s*light dark/);
  });

  it("leaves no hard-coded colour in the interface", () => {
    // @media print is always on white paper and is exempt; the landing's
    // illustration is allowed its own white stork and white clouds. Everything
    // else must be a token, or dark mode simply will not reach it.
    expect(hardCodedInterfaceColours(CSS)).toEqual([]);
  });

  it("CONTROL: that matcher catches one", () => {
    const regressed = CSS.replace("color: var(--on-accent);", "color: #fff;");
    expect(regressed).not.toBe(CSS);
    expect(hardCodedInterfaceColours(regressed)).toContain("#fff");
  });

  it("CONTROL: it is looking at the interface, not at an empty string", () => {
    // The exempt regions are exempt because they really do contain such
    // colours. If the scanner were pointed at nothing, this would be empty too.
    expect(CSS.slice(CSS.indexOf("@media print"))).toMatch(/color:\s*#000/);
    expect(hardCodedInterfaceColours("a { color: #123456; }")).toEqual(["#123456"]);
  });
});

// ---------------------------------------------------------------------------
// Control feedback
// ---------------------------------------------------------------------------

/**
 * `:hover` rules that are NOT nested inside an `@media (hover: hover)` block.
 *
 * On a touch screen `:hover` sticks after the tap, so the last control touched
 * stays looking pressed until something else is. Brace-counted rather than
 * line-matched, because the guard is a wrapper and a regex cannot see nesting.
 */
function unguardedHoverRules(css: string): string[] {
  const out: string[] = [];
  const stack: boolean[] = [];
  let depth = 0;
  let chunkStart = 0;
  for (let i = 0; i < css.length; i++) {
    if (css[i] === "{") {
      const head = css.slice(chunkStart, i).replace(/\/\*[\s\S]*?\*\//g, "").trim();
      const guarded = stack.some(Boolean) || /@media[^{]*\(\s*hover\s*:\s*hover\s*\)/.test(head);
      if (head.includes(":hover") && !head.startsWith("@") && !guarded) {
        out.push(head.split("\n").pop()!.trim());
      }
      stack.push(guarded);
      depth++;
      chunkStart = i + 1;
    } else if (css[i] === "}") {
      stack.pop();
      depth--;
      chunkStart = i + 1;
    }
  }
  return out;
}

describe("a hover rule never sticks on a touch screen", () => {
  it("guards every one of them", () => {
    expect(unguardedHoverRules(CSS)).toEqual([]);
  });

  it("CONTROL: notices an unguarded one", () => {
    expect(unguardedHoverRules(".btn-primary:hover { color: red; }")).toEqual([".btn-primary:hover"]);
  });

  it("CONTROL: and accepts a guarded one", () => {
    expect(unguardedHoverRules("@media (hover: hover) { .btn-primary:hover { color: red; } }")).toEqual([]);
  });

  it("CONTROL: the scanner is actually finding the real rules", () => {
    // If it found nothing at all, the first assertion would pass vacuously.
    expect(CSS.match(/:hover/g)?.length ?? 0).toBeGreaterThanOrEqual(5);
  });

  it("gives every control a pressed state, which is the only feedback a thumb gets", () => {
    expect(CSS).toMatch(/:active[\s\S]{0,120}transform:\s*scale\(/);
  });
});
