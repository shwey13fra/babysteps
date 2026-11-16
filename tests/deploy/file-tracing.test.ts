// The four paths read from disk at RUNTIME must be named in the trace config.
//
// WHY THIS TEST EXISTS. Nothing imports data/rules, data/consular,
// data/glossary.de-en.yaml or lib/prompts. They are read with readFileSync /
// readdirSync from process.cwd(), so no bundler follows them by dependency.
// Measured 2026-11-16: /api/timeline traced 657 files — the entire repository,
// tests and docs and eval included — because Turbopack cannot resolve
// `readdirSync(dir)` and includes everything as insurance. data/rules shipped
// inside that, as a side effect of a warning we would like to silence.
//
// So the deployment worked for a reason nobody had chosen, and any narrowing of
// the trace would have silently removed the data. That is the failure shape
// .vercelignore's header warns about in capitals: builds green, throws on the
// first request.
//
// This asserts the requirement is DECLARED, independently of whether the
// over-tracing happens to be covering it today.
//
// It reads the real config object rather than matching the file's text —
// past-mistakes 2026-11-16: "when testing a config format, never write your own
// parser for it; the parser is the thing you got wrong."

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import nextConfig from "@/next.config";

const ROOT = process.cwd();

/** Every path this application reads from disk at runtime, and who reads it. */
const RUNTIME_PATHS = [
  { path: "data/rules", reader: "lib/timeline/rules.ts" },
  { path: "data/consular", reader: "lib/rag/consular.ts" },
  { path: "data/glossary.de-en.yaml", reader: "lib/rag/expand.ts, lib/rag/guards.ts" },
  { path: "lib/prompts", reader: "lib/rag/generate.ts, lib/rag/guards.ts" },
] as const;

const includes = nextConfig.outputFileTracingIncludes ?? {};
const allGlobs = Object.values(includes).flat() as string[];

/**
 * Does this glob cover that path, on a PATH BOUNDARY?
 *
 * Written after a mutation test caught the naive version: `g.includes("data/rules")`
 * also matched `./data/rules-RENAMED/**` — a directory that does not exist — so
 * renaming the rules directory would have left this file green while the
 * deployment lost its data. A substring is not a path.
 */
function covers(glob: string, path: string): boolean {
  const g = glob.replace(/^\.\//, "");
  return g === path || g.startsWith(`${path}/`);
}

const declares = (path: string) => allGlobs.some((g) => covers(g, path));

describe("output file tracing declares every runtime-read path", () => {
  it("has a tracing config at all", () => {
    expect(Object.keys(includes).length).toBeGreaterThan(0);
  });

  for (const { path, reader } of RUNTIME_PATHS) {
    it(`names ${path} (read by ${reader})`, () => {
      expect(declares(path)).toBe(true);
    });
  }

  it("names a route for every timeline consumer", () => {
    // Anything reaching lib/timeline needs data/rules on its own function.
    const rulesRoutes = Object.entries(includes)
      .filter(([, globs]) => (globs as string[]).some((g) => covers(g, "data/rules")))
      .map(([route]) => route);
    for (const route of ["/api/timeline", "/api/ics", "/api/birth-preview"]) {
      expect(rulesRoutes).toContain(route);
    }
    // `/item/*` matches the literal route path `/item/[id]`.
    expect(rulesRoutes.some((r) => r.startsWith("/item/"))).toBe(true);
  });
});

describe("the declared paths actually exist on disk", () => {
  // A glob naming a path that has been renamed is a declaration that silently
  // covers nothing — the failure mode this whole file is about, one level up.
  it("data/rules holds the yaml the engine loads", () => {
    const files = readdirSync(join(ROOT, "data", "rules")).filter((f) => f.endsWith(".yaml"));
    expect(files.length).toBeGreaterThan(0);
  });

  it("the glossary and the prompts are where the config says", () => {
    expect(readFileSync(join(ROOT, "data/glossary.de-en.yaml"), "utf8").length).toBeGreaterThan(0);
    expect(readdirSync(join(ROOT, "lib/prompts")).filter((f) => f.endsWith(".md")).length)
      .toBeGreaterThan(0);
  });
});

describe("negative controls (CLAUDE.md rule 16)", () => {
  // Three gates have reached production able only to pass.
  it("a path that is NOT declared is reported as undeclared", () => {
    expect(declares("data/not-a-real-directory")).toBe(false);
  });

  it("the route check would fail for a route that is absent", () => {
    const rulesRoutes = Object.entries(includes)
      .filter(([, globs]) => (globs as string[]).some((g) => covers(g, "data/rules")))
      .map(([route]) => route);
    expect(rulesRoutes).not.toContain("/api/this-route-does-not-exist");
  });

  it("the glob list is non-empty, so every `.some()` above can fail", () => {
    expect(allGlobs.length).toBeGreaterThan(0);
  });

  // The bug this file actually had. A mutation test renamed the config's glob
  // to ./data/rules-RENAMED/**/*.yaml and all eleven assertions stayed green,
  // because `"data/rules-RENAMED".includes("data/rules")` is true. The guard
  // reported safety for a directory that did not exist.
  it("a renamed directory does NOT count as declared", () => {
    expect(covers("./data/rules-RENAMED/**/*.yaml", "data/rules")).toBe(false);
    expect(covers("./data/rulesX", "data/rules")).toBe(false);
    expect(covers("./data/glossary.de-en.yaml.bak", "data/glossary.de-en.yaml")).toBe(false);
  });

  it("and the matcher still accepts the real shapes", () => {
    expect(covers("./data/rules/**/*.yaml", "data/rules")).toBe(true);
    expect(covers("data/rules/german_federal.yaml", "data/rules")).toBe(true);
    expect(covers("./data/glossary.de-en.yaml", "data/glossary.de-en.yaml")).toBe(true);
  });
});
