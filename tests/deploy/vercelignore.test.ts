// .vercelignore must never exclude the application.
//
// Written after the first Vercel deployment failed, 2026-11-15. The line
// `supabase/` was meant for the root migrations directory. In .gitignore
// syntax a pattern with no internal slash matches a name AT ANY DEPTH, so it
// also excluded `lib/supabase/` — the only database client the application
// has. The build failed with "module not found: ./lib/supabase/server", traced
// through app/api/ask and app/api/ics.
//
// WHY NOTHING CAUGHT IT. .vercelignore is not applied to a local build, so
// `npm run build` was green every single time, including the run immediately
// before the deploy. The file is configuration that only takes effect on
// someone else's machine — the same shape as the dev-origin bug in ADR-081,
// where the failure could not be reproduced locally either.
//
// So the invariant is asserted on the FILE rather than on a build: every
// pattern is anchored to the repo root, and nothing under app/ or lib/ is
// matched. The second check uses git's own matcher in a scratch repository,
// because re-implementing gitignore semantics here would reproduce exactly the
// misunderstanding that caused the outage.

import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync } from "node:fs";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

const ROOT = process.cwd();
const FILE = join(ROOT, ".vercelignore");
const raw = readFileSync(FILE, "utf8");

const patterns = raw
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l.length > 0 && !l.startsWith("#"));

describe(".vercelignore patterns", () => {
  it("has patterns to check", () => {
    expect(patterns.length).toBeGreaterThan(10);
  });

  // The rule that would have prevented the outage, stated as an invariant.
  it("anchors every pattern to the repo root with a leading slash", () => {
    const unanchored = patterns.filter((p) => !p.startsWith("/") && !p.startsWith("!"));
    expect(
      unanchored,
      "an unanchored pattern matches that name at ANY depth — see the header of .vercelignore",
    ).toEqual([]);
  });

  it("the anchoring check can fail", () => {
    const bad = ["supabase/", "/tests/"].filter((p) => !p.startsWith("/"));
    expect(bad).toEqual(["supabase/"]);
  });
});

describe("nothing the application needs is excluded", () => {
  // Paths that must survive: the app itself, the database client that was
  // actually lost, and the four directories read from disk at runtime.
  const MUST_SHIP = [
    "app/api/ask/route.ts",
    "app/api/ics/route.ts",
    "app/layout.tsx",
    "app/impressum/page.tsx",
    "app/datenschutz/page.tsx",
    "lib/supabase/server.ts",
    "lib/timeline/rules.ts",
    "lib/prompts/answer.v1.md",
    "data/rules/.keep",
    "data/consular/.keep",
    "data/glossary.de-en.yaml",
  ];

  // Paths that must NOT ship, so the test proves the file still does its job.
  const MUST_NOT_SHIP = [
    "supabase/migrations/0001_initial_schema.sql",
    "scripts/ingest/fetch.ts",
    "tests/timeline/dates.test.ts",
    "docs/design-system.md",
    "data/golden/golden_set_v1.1.csv",
    "CLAUDE.md",
  ];

  function ignoredIn(scratch: string, paths: string[]): string[] {
    const out: string[] = [];
    for (const p of paths) {
      const full = join(scratch, p);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, "x");
    }
    for (const p of paths) {
      try {
        execFileSync("git", ["check-ignore", "-q", "--", p], { cwd: scratch });
        out.push(p); // exit 0 means ignored
      } catch {
        /* exit 1 means not ignored */
      }
    }
    return out;
  }

  it("git's own matcher agrees: app/ and lib/ survive, developer files do not", () => {
    const scratch = mkdtempSync(join(tmpdir(), "vercelignore-"));
    try {
      execFileSync("git", ["init", "-q", "."], { cwd: scratch });
      // The patterns under test, evaluated by git itself rather than by a
      // hand-rolled matcher — the hand-rolled understanding is what failed.
      copyFileSync(FILE, join(scratch, ".gitignore"));

      const wronglyExcluded = ignoredIn(scratch, MUST_SHIP);
      expect(wronglyExcluded, "these are the application and must reach the edge").toEqual([]);

      const correctlyExcluded = ignoredIn(scratch, MUST_NOT_SHIP);
      // The denominator: if this came back empty the file would be doing
      // nothing at all, and the check above would pass for the wrong reason.
      expect(correctlyExcluded.sort()).toEqual([...MUST_NOT_SHIP].sort());
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
});
