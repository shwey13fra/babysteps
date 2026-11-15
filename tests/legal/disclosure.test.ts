// The Art. 13 disclosure must keep up with the architecture.
//
// This file exists because of a defect found on 2026-11-15 by reading the code
// against the legal pack: the pack's processor table lists five services, and
// the system calls six. `lib/rag/retrieve.ts` posts the visitor's QUESTION TEXT
// to api.openai.com to build a search vector, before anything reaches
// Anthropic. A processor that handles user-typed content and is missing from
// the disclosure is the disclosure being wrong — and nothing would have caught
// it, because a privacy page is prose and prose is not executed.
//
// So the disclosure is tested the same way everything else here is: the thing
// that must stay true is asserted, with a control proving the check can fail
// (CLAUDE.md rule 16).

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  IMPRESSUM_KEYS,
  PROCESSORS,
  SUPERVISORY_AUTHORITY,
  VERCEL_LOG_RETENTION,
  readImpressum,
} from "@/lib/legal";

const ROOT = process.cwd();

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

const SHIPPED = [join(ROOT, "app"), join(ROOT, "lib")].flatMap((d) => walk(d));
const SOURCE = SHIPPED.map((f) => readFileSync(f, "utf8")).join("\n");
const names = PROCESSORS.map((p) => p.name).join(" | ");

describe("readImpressum", () => {
  const FULL = {
    IMPRESSUM_NAME: "Erika Mustermann",
    IMPRESSUM_STREET: "Musterstraße 1",
    IMPRESSUM_CITY: "60311 Frankfurt am Main",
    IMPRESSUM_EMAIL: "kontakt@example.org",
  };

  it("returns the details when every value is present", () => {
    const r = readImpressum(FULL);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.details.city).toBe("60311 Frankfurt am Main");
  });

  it("trims surrounding whitespace", () => {
    const r = readImpressum({ ...FULL, IMPRESSUM_NAME: "  Erika Mustermann  " });
    expect(r.ok && r.details.name).toBe("Erika Mustermann");
  });

  // ALL OR NOTHING. A §5 notice that renders three of four lines looks complete,
  // so nobody notices it is not.
  it("fails entirely when any single value is missing", () => {
    for (const key of IMPRESSUM_KEYS) {
      const partial = { ...FULL, [key]: undefined };
      const r = readImpressum(partial);
      expect(r.ok, `${key} missing should make the whole set unavailable`).toBe(false);
      if (!r.ok) expect(r.missing).toContain(key);
    }
  });

  it("treats a whitespace-only value as missing", () => {
    const r = readImpressum({ ...FULL, IMPRESSUM_STREET: "   " });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing).toEqual(["IMPRESSUM_STREET"]);
  });

  it("reports every missing key, not just the first", () => {
    const r = readImpressum({});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing).toEqual([...IMPRESSUM_KEYS]);
  });
});

describe("every service the code calls is disclosed", () => {
  // marker in the source  ->  name that must appear in PROCESSORS
  const MUST_DISCLOSE: Array<[string, string]> = [
    ["api.openai.com", "OpenAI"],
    ["@anthropic-ai/sdk", "Anthropic"],
    ["@supabase/supabase-js", "Supabase"],
    ["@upstash/ratelimit", "Upstash"],
    ["@upstash/redis", "Upstash"],
    // Resend is deliberately absent from PROCESSORS while F6 is deferred. If it
    // ever appears in shipped code, this row turns the omission into a failure
    // instead of a silent gap.
    ["from \"resend\"", "Resend"],
  ];

  it("the scan has something to scan", () => {
    expect(SHIPPED.length).toBeGreaterThan(30);
    expect(SOURCE.length).toBeGreaterThan(10_000);
  });

  it("names a processor for every external service in the shipped code", () => {
    const undisclosed = MUST_DISCLOSE.filter(
      ([marker, who]) => SOURCE.includes(marker) && !names.includes(who),
    );
    expect(undisclosed.map(([m, w]) => `${m} -> ${w} missing from PROCESSORS`)).toEqual([]);
  });

  it("OpenAI is disclosed, because the question text goes there first", () => {
    // The specific defect this file was written for. Guarded explicitly so a
    // future tidy-up of PROCESSORS cannot quietly drop it.
    expect(SOURCE).toContain("api.openai.com");
    expect(names).toContain("OpenAI");
  });

  // NEGATIVE CONTROL. The check must be able to fail.
  it("the disclosure check catches an undisclosed service", () => {
    const fakeSource = 'import x from "some-tracking-sdk";';
    const rule: [string, string] = ["some-tracking-sdk", "SomeTracker"];
    const caught = fakeSource.includes(rule[0]) && !names.includes(rule[1]);
    expect(caught).toBe(true);
  });

  it("does not disclose a processor the code does not use", () => {
    // Resend: deferred, and absent from both the code and the page.
    expect(SOURCE.includes('from "resend"')).toBe(false);
    expect(names).not.toContain("Resend");
  });

  it("each processor states a role and a place", () => {
    for (const p of PROCESSORS) {
      expect(p.role.length, p.name).toBeGreaterThan(10);
      // "USA" is a complete and legitimate answer at exactly three characters.
      expect(p.place.length, p.name).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("the facts the page asserts", () => {
  it("names the Hessian supervisory authority, the controller's Bundesland", () => {
    expect(SUPERVISORY_AUTHORITY.name).toContain("Hessische");
    expect(SUPERVISORY_AUTHORITY.url).toMatch(/^https:\/\//);
  });

  it("the log-retention figure is attributed and dated, not asserted bare", () => {
    expect(VERCEL_LOG_RETENTION.plan).toBeTruthy();
    expect(VERCEL_LOG_RETENTION.checkedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
