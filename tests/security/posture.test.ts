// Stage D — the §4 checklist, as assertions rather than as a checklist.
//
// Every item here was previously a command someone had to remember to run. A
// grep in a runbook is a check that fails open the first time nobody runs it,
// and this project has now caught three gates on their way to doing exactly
// that (CLAUDE.md rule 16).
//
// Two of these guard a claim made in next.config.ts. The CSP there allows
// 'unsafe-inline' for scripts, and the reasoning that makes that acceptable is
// "there is no HTML-injection vector in this application". That sentence stops
// being true the moment someone adds `dangerouslySetInnerHTML`, so the sentence
// is tested rather than trusted.

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { devRoutesEnabled } from "@/lib/dev-routes";

const ROOT = process.cwd();

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === ".git") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

const SHIPPED = [join(ROOT, "app"), join(ROOT, "lib")].flatMap((d) => walk(d));
const read = (f: string) => readFileSync(f, "utf8");

describe("the shipped tree is non-empty", () => {
  // The denominator. Every assertion below is "no file does X", which passes
  // trivially over an empty list — the exact shape of a check that reports
  // safety it never measured.
  it("found files to check", () => {
    expect(SHIPPED.length).toBeGreaterThan(30);
    expect(SHIPPED.some((f) => f.endsWith("route.ts"))).toBe(true);
    expect(SHIPPED.some((f) => f.endsWith(".tsx"))).toBe(true);
  });
});

describe("rule 7 — the service-role client never reaches the browser", () => {
  const clientComponents = SHIPPED.filter((f) => read(f).includes('"use client"'));

  it("there are client components to check", () => {
    expect(clientComponents.length).toBeGreaterThan(5);
  });

  it("none of them imports lib/supabase/server", () => {
    const offenders = clientComponents.filter((f) => /supabase\/server/.test(read(f)));
    expect(offenders.map((f) => f.replace(ROOT, ""))).toEqual([]);
  });

  it("nothing client-reachable names the service-role key", () => {
    const offenders = clientComponents.filter((f) => read(f).includes("SERVICE_ROLE"));
    expect(offenders.map((f) => f.replace(ROOT, ""))).toEqual([]);
  });
});

describe("no HTML-injection vector — the premise the CSP rests on", () => {
  it("dangerouslySetInnerHTML appears nowhere in app/ or lib/", () => {
    const offenders = SHIPPED.filter((f) => read(f).includes("dangerouslySetInnerHTML"));
    expect(offenders.map((f) => f.replace(ROOT, ""))).toEqual([]);
  });

  it("no dynamic evaluation of anything (brief §4)", () => {
    const offenders = SHIPPED.filter((f) => /\beval\(|new Function\(/.test(read(f)));
    expect(offenders.map((f) => f.replace(ROOT, ""))).toEqual([]);
  });

  // NEGATIVE CONTROL. Both matchers above must be able to fail, or they are
  // decoration over a tree that happens to be clean.
  it("the matchers actually catch what they are looking for", () => {
    expect("<div dangerouslySetInnerHTML={{__html: x}} />").toContain("dangerouslySetInnerHTML");
    expect(/\beval\(|new Function\(/.test("const f = new Function('return 1')")).toBe(true);
    expect(/\beval\(|new Function\(/.test("safeParse(input)")).toBe(false);
    // `retrieval(` and `medieval(` must not trip the \beval\( word boundary.
    expect(/\beval\(/.test("const r = retrieval(x)")).toBe(false);
  });
});

describe("NEXT_PUBLIC_ is limited to what CLAUDE.md allows", () => {
  // The Supabase URL and anon key can read nothing (RLS denies anon). The site
  // URL was added by ruling on 2026-11-15. Anything else in this list is a
  // secret that has been compiled into the browser bundle.
  const ALLOWED = new Set([
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SITE_URL",
  ]);

  it("names no public variable outside the allow-list", () => {
    const found = new Set<string>();
    for (const file of SHIPPED) {
      for (const m of read(file).matchAll(/NEXT_PUBLIC_[A-Z0-9_]+/g)) found.add(m[0]);
    }
    expect([...found].filter((v) => !ALLOWED.has(v))).toEqual([]);
  });

  it("the allow-list check can fail", () => {
    expect(ALLOWED.has("NEXT_PUBLIC_ANTHROPIC_API_KEY")).toBe(false);
  });
});

describe(".env.example documents every variable the code reads", () => {
  // Written after a real mistake on 2026-11-15: the production variable list
  // was quoted from this template rather than from the code, and came out as 13
  // when the answer is 12 — the template listed an anon key that nothing reads.
  // A template that drifts from the code misstates which secrets a deployment
  // needs, which is a worse failure than having no template.
  const example = readFileSync(join(ROOT, ".env.example"), "utf8");

  // Supplied by the platform, not by us.
  const PLATFORM = new Set(["NODE_ENV", "VERCEL_URL"]);
  // Read by a library from the environment, so it appears in no source file.
  const IMPLICIT = ["ANTHROPIC_API_KEY"];

  const referenced = new Set<string>();
  for (const file of SHIPPED) {
    for (const m of read(file).matchAll(/process\.env\.([A-Z_][A-Z0-9_]*)/g)) referenced.add(m[1]);
    // lib/legal.ts and lib/share/token.ts name their keys as string literals.
    for (const m of read(file).matchAll(/"(IMPRESSUM_[A-Z_]+|SHARE_LINK_HMAC_SECRET)"/g)) {
      referenced.add(m[1]);
    }
  }

  it("found variables to check", () => {
    expect(referenced.size).toBeGreaterThan(8);
    expect(referenced.has("SUPABASE_SERVICE_ROLE_KEY")).toBe(true);
  });

  it("every variable the code reads is documented", () => {
    const undocumented = [...referenced, ...IMPLICIT]
      .filter((name) => !PLATFORM.has(name))
      .filter((name) => !new RegExp(`^${name}=`, "m").test(example));
    expect(undocumented).toEqual([]);
  });

  it("the check can fail", () => {
    expect(/^NOT_A_REAL_VARIABLE=/m.test(example)).toBe(false);
  });

  it("the anon key is documented as NOT read by the application", () => {
    // If a browser-side Supabase client is ever added, this flips and the
    // template's "do not add to Vercel" section becomes wrong.
    expect(referenced.has("NEXT_PUBLIC_SUPABASE_ANON_KEY")).toBe(false);
    expect(example).toMatch(/NOT READ BY THE APPLICATION/);
  });
});

describe("development routes default to denied", () => {
  it("renders in development and test", () => {
    expect(devRoutesEnabled("development")).toBe(true);
    expect(devRoutesEnabled("test")).toBe(true);
  });

  it("is hidden in production", () => {
    expect(devRoutesEnabled("production")).toBe(false);
  });

  // The direction of this mistake is one-way: a missing or misspelt NODE_ENV
  // must hide the route, never expose it.
  it("is hidden when NODE_ENV is absent or unrecognised", () => {
    expect(devRoutesEnabled(undefined)).toBe(false);
    expect(devRoutesEnabled("")).toBe(false);
    expect(devRoutesEnabled("Production")).toBe(false);
    expect(devRoutesEnabled("staging")).toBe(false);
    expect(devRoutesEnabled("dev")).toBe(false);
  });

  it("every route under app/dev is covered by the guarding layout", () => {
    const devFiles = walk(join(ROOT, "app", "dev"));
    const pages = devFiles.filter((f) => f.endsWith("page.tsx"));
    expect(pages.length).toBeGreaterThan(0);
    // One layout at the root of the subtree covers every page beneath it, so
    // a dev route added later is guarded without anyone remembering to do it.
    const layout = join(ROOT, "app", "dev", "layout.tsx");
    expect(devFiles).toContain(layout);
    expect(read(layout)).toContain("devRoutesEnabled");
    expect(read(layout)).toContain("notFound");
  });
});
