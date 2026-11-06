// Phase 6 stage A: the design tokens, the type scale, and the font wiring.
//
// Every invariant here is driven by something that fails SILENTLY, per the house
// rule that a checker which cannot fail is not a check:
//
//   - a mistyped hex in globals.css produces a slightly wrong colour nobody
//     notices, so the tokens are read out of docs/design-system.md itself rather
//     than hardcoded here. If the doc changes, this test changes with it.
//   - a Google font URL is a live Abmahnung risk (docs/legal-compliance-pack.md)
//     and item 7 of the Phase 6 VERIFY gate is pass/fail on it. A browser Network
//     tab catches it once; this catches it on every run.
//   - a `src` path in fonts.ts that does not exist on disk fails the build, but a
//     font file that exists and is never referenced ships bytes for nothing.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const CSS = readFileSync(join(ROOT, "app/globals.css"), "utf8");
const FONTS_TS = readFileSync(join(ROOT, "app/fonts.ts"), "utf8");
const DESIGN = readFileSync(join(ROOT, "docs/design-system.md"), "utf8");

/**
 * Source with comments removed.
 *
 * The structural checks below are about what the CODE does. `app/fonts.ts`
 * deliberately explains in prose that a fonts.googleapis.com request is an
 * Abmahnung risk, and a comment saying why we never call Google is the opposite
 * of calling Google — scanning raw text flagged that comment as a violation.
 * Line comments are matched only when they begin a line, so the `//` inside a
 * `https://` string literal survives and would still be caught.
 */
function code(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((l) => !l.trimStart().startsWith("//"))
    .join("\n");
}

const FONTS_CODE = code(FONTS_TS);

/**
 * The §2 colour table, parsed from the design system. Rows look like:
 *   | `--paper` | `#F4F7F7` | Page ground |
 */
function tokensFromDesignSystem(): Array<{ token: string; hex: string }> {
  const out: Array<{ token: string; hex: string }> = [];
  for (const line of DESIGN.split("\n")) {
    const m = line.match(/^\|\s*`(--[a-z0-9-]+)`\s*\|\s*`(#[0-9A-Fa-f]{6})`\s*\|/);
    if (m) out.push({ token: m[1], hex: m[2] });
  }
  return out;
}

describe("design tokens come from design-system.md §2", () => {
  const tokens = tokensFromDesignSystem();

  it("finds the colour table at all", () => {
    // Guards the parser: if the table moves or its formatting changes, every
    // assertion below would vacuously pass on an empty list.
    expect(tokens.length).toBe(15);
  });

  it.each(tokensFromDesignSystem())("declares $token as $hex", ({ token, hex }) => {
    const decl = CSS.match(new RegExp(`${token}\\s*:\\s*(#[0-9A-Fa-f]{6})`));
    expect(decl, `${token} is not declared in app/globals.css`).not.toBeNull();
    expect(decl?.[1]?.toLowerCase()).toBe(hex.toLowerCase());
  });

  it("sets the 56px date gutter and the 560px measure from §4", () => {
    expect(CSS).toMatch(/--gutter:\s*56px/);
    expect(CSS).toMatch(/--measure:\s*560px/);
  });
});

describe("type scale and German handling, design-system.md §3", () => {
  it("puts tabular-nums on the body, so the date gutter stays aligned", () => {
    expect(CSS).toMatch(/font-variant-numeric:\s*tabular-nums/);
  });

  it("sets hyphens: auto and targets [lang=de]", () => {
    expect(CSS).toMatch(/hyphens:\s*auto/);
    expect(CSS).toMatch(/\[lang="de"\]/);
  });

  it("uses the §3 sizes for the three text roles", () => {
    expect(CSS).toMatch(/font:\s*600\s+27px\/32px/); // screen title
    expect(CSS).toMatch(/font:\s*500\s+17px\/24px/); // item title
    expect(CSS).toMatch(/font:\s*400\s+15px\/24px/); // body
    expect(CSS).toMatch(/font:\s*400\s+13px\/18px/); // metadata and § ref
  });

  it("reserves the mono stack for the § reference, not for body text", () => {
    expect(CSS).toMatch(/--mono:/);
    // The body font shorthand must resolve to the sans stack.
    const body = CSS.match(/body\s*\{[\s\S]*?\}/)?.[0] ?? "";
    expect(body).toContain("var(--sans)");
    expect(body).not.toContain("var(--mono)");
  });

  it("honours prefers-reduced-motion, per §6", () => {
    expect(CSS).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  });
});

describe("no font is ever requested from a Google domain", () => {
  const appFiles: string[] = [];
  (function walk(dir: string) {
    for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(rel);
      else if (/\.(ts|tsx|css)$/.test(entry.name)) appFiles.push(rel);
    }
  })("app");

  it("reads some app files, so the scan below is not vacuous", () => {
    expect(appFiles.length).toBeGreaterThan(4);
  });

  it.each(["googleapis.com", "gstatic.com", "fonts.google.com", "next/font/google"])(
    "never mentions %s anywhere under app/",
    (needle) => {
      const offenders = appFiles.filter((f) =>
        code(readFileSync(join(ROOT, f), "utf8")).includes(needle),
      );
      expect(offenders, `${needle} found in ${offenders.join(", ")}`).toEqual([]);
    },
  );

  it("loads fonts through next/font/local only", () => {
    expect(FONTS_CODE).toContain('from "next/font/local"');
  });
});

describe("the committed font files and fonts.ts agree", () => {
  const dir = "app/fonts";
  const onDisk = readdirSync(join(ROOT, dir)).filter((f) => f.endsWith(".woff2"));

  it("commits exactly the eight faces the design system asks for", () => {
    // Sans 400/500/600 and Mono 400, each in latin and latin-ext. Nothing else:
    // every extra weight is bytes on a phone in a waiting room.
    expect(onDisk.sort()).toEqual(
      [
        "plex-mono-latin-400.woff2",
        "plex-mono-latin-ext-400.woff2",
        "plex-sans-latin-400.woff2",
        "plex-sans-latin-500.woff2",
        "plex-sans-latin-600.woff2",
        "plex-sans-latin-ext-400.woff2",
        "plex-sans-latin-ext-500.woff2",
        "plex-sans-latin-ext-600.woff2",
      ].sort(),
    );
  });

  it.each(readdirSync(join(ROOT, "app/fonts")).filter((f) => f.endsWith(".woff2")))(
    "references %s from fonts.ts",
    (file) => {
      expect(FONTS_TS).toContain(file);
    },
  );

  it("every src path in fonts.ts exists on disk", () => {
    const paths = [...FONTS_TS.matchAll(/path:\s*"\.\/(fonts\/[^"]+)"/g)].map((m) => m[1]);
    expect(paths.length).toBe(8);
    for (const p of paths) expect(existsSync(join(ROOT, "app", p)), p).toBe(true);
  });

  it("does not preload the latin-ext faces", () => {
    // Measured in the build output: without this, all 8 files land in
    // <link rel="preload"> and a German or English page pulls 164 KB instead of
    // the 84 KB it needs.
    const extBlocks = FONTS_CODE.split("export const").filter((b) =>
      b.includes('"./fonts/plex-sans-latin-ext-400.woff2"') ||
      b.includes('"./fonts/plex-mono-latin-ext-400.woff2"'),
    );
    expect(extBlocks.length).toBe(2);
    for (const b of extBlocks) expect(b).toMatch(/preload:\s*false/);
  });

  it("keeps @fontsource out of the dependency tree entirely", () => {
    // The .woff2 files were extracted once and committed; nothing may resolve a
    // font at build time.
    const pkg = readFileSync(join(ROOT, "package.json"), "utf8");
    expect(pkg).not.toContain("fontsource");
  });
});
