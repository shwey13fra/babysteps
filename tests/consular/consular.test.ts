// Integrity of the hand-curated consular data, and of the loader that guards it.
//
// Every invariant below is tested by feeding the validator something KNOWN BROKEN and
// requiring it to say so. past-mistakes 2026-10-23: a checker that extracts nothing
// passes everything, and the dangerous test is the one that cannot fail. A suite that
// only ever asserts the real file is valid proves nothing about the guard.

import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  loadConsular,
  parseConsularFile,
  staleEntries,
  MAX_REVIEW_DAYS,
} from "@/lib/rag/consular";

const entries = loadConsular();

/** Minimum valid entry, so a test can vary exactly one field. */
function valid(overrides: Record<string, string> = {}): string {
  const base: Record<string, string> = {
    id: "probe",
    mission: "federal",
    topic: "birth_registration",
    title_en: "Probe",
    text_en: "What the page says.",
    source_url: "https://www.mea.gov.in/probe",
    source_title: "Probe page",
    method: "human_transcription",
    checked_on: "2026-10-01",
    checked_by: "a human",
    review_after: "2026-12-01",
    authority_en: "The mission covering your place of residence",
    ...overrides,
  };
  return Object.entries(base)
    .filter(([, v]) => v !== "")
    .map(([k, v]) => `  ${k}: ${JSON.stringify(v)}`)
    .join("\n")
    .replace(/^ {2}/, "- ");
}

const parseOne = (y: string) => parseConsularFile(y, "probe.yaml");

describe("the guard rejects what it exists to reject", () => {
  it("accepts the minimum valid entry", () => {
    expect(parseOne(valid())).toHaveLength(1);
  });

  it("rejects a placeholder source_url", () => {
    expect(() => parseOne(valid({ source_url: "TBD — no verified source yet" }))).toThrow();
  });

  it("rejects a non-http scheme", () => {
    expect(() => parseOne(valid({ source_url: "ftp://mea.gov.in/x" }))).toThrow(/http\(s\)/);
  });

  it("rejects a checked_on in the future", () => {
    expect(() => parseOne(valid({ checked_on: "2099-01-01", review_after: "2099-02-01" }))).toThrow(
      /future/,
    );
  });

  it("rejects review_after on or before checked_on", () => {
    expect(() => parseOne(valid({ review_after: "2026-10-01" }))).toThrow(/after checked_on/);
    expect(() => parseOne(valid({ review_after: "2026-09-01" }))).toThrow(/after checked_on/);
  });

  it("rejects a review window past the 90-day consular ceiling", () => {
    // 2026-10-01 + 91 days
    expect(() => parseOne(valid({ review_after: "2026-12-31" }))).toThrow(/ceiling is 90/);
  });

  it("admits a review window of exactly the ceiling", () => {
    // 2026-10-01 + 90 days
    expect(parseOne(valid({ review_after: "2026-12-30" }))).toHaveLength(1);
  });

  it("requires robots_checked_on on a permitted_fetch, and forbids it otherwise", () => {
    expect(() => parseOne(valid({ method: "permitted_fetch" }))).toThrow(/robots_checked_on/);
    expect(() =>
      parseOne(valid({ method: "human_transcription", robots_checked_on: "2026-10-01" })),
    ).toThrow(/needs no robots check/);
  });

  it("rejects a missing authority_en — rule 13 has no opt-out", () => {
    expect(() => parseOne(valid({ authority_en: "" }))).toThrow();
  });

  it("rejects a mapping where a sequence belongs", () => {
    expect(() => parseOne("id: probe")).toThrow(/sequence/);
  });

  it("treats an empty file as zero entries, not as an error", () => {
    expect(parseConsularFile("", "empty.yaml")).toEqual([]);
  });
});

describe("loadConsular guards what the parser cannot see", () => {
  /** A real directory, because uniqueness is a property of the load, not of one parse. */
  function dirWith(files: Record<string, string>): string {
    const d = mkdtempSync(join(tmpdir(), "babysteps-consular-"));
    for (const [name, body] of Object.entries(files)) writeFileSync(join(d, name), body, "utf8");
    return d;
  }

  it("rejects the same id appearing twice in one file", () => {
    const d = dirWith({ "a.yaml": valid({ id: "dup" }) + "\n" + valid({ id: "dup" }) });
    expect(() => loadConsular(d)).toThrow(/Duplicate consular entry id/);
  });

  it("rejects the same id appearing across two files", () => {
    const d = dirWith({ "a.yaml": valid({ id: "dup" }), "b.yaml": valid({ id: "dup" }) });
    expect(() => loadConsular(d)).toThrow(/Duplicate consular entry id/);
  });

  it("accepts distinct ids across two files", () => {
    const d = dirWith({ "a.yaml": valid({ id: "a" }), "b.yaml": valid({ id: "b" }) });
    expect(loadConsular(d).map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("ignores non-yaml files in the directory", () => {
    const d = dirWith({ "a.yaml": valid({ id: "a" }), "README.md": "not data" });
    expect(loadConsular(d)).toHaveLength(1);
  });
});

describe("staleness is computed, not described", () => {
  const one = parseOne(valid({ checked_on: "2026-10-01", review_after: "2026-12-01" }));

  it("reports nothing before the review date", () => {
    expect(staleEntries(one, "2026-11-30")).toHaveLength(0);
  });

  it("reports nothing on the review date itself", () => {
    expect(staleEntries(one, "2026-12-01")).toHaveLength(0);
  });

  it("reports the entry the day after, with the overdue count", () => {
    const s = staleEntries(one, "2026-12-02");
    expect(s).toHaveLength(1);
    expect(s[0].days_overdue).toBe(1);
    expect(s[0].entry.id).toBe("probe");
  });

  it("sorts worst first", () => {
    const two = [
      ...parseOne(valid({ id: "a", review_after: "2026-12-01" })),
      ...parseOne(valid({ id: "b", review_after: "2026-11-01" })),
    ];
    expect(staleEntries(two, "2026-12-15").map((s) => s.entry.id)).toEqual(["b", "a"]);
  });
});

describe("the data actually in data/consular/", () => {
  it("loads, and every id is unique", () => {
    expect(entries.length).toBeGreaterThan(0);
    expect(new Set(entries.map((e) => e.id)).size).toBe(entries.length);
  });

  it("gives every entry a real citable URL", () => {
    for (const e of entries) {
      expect(e.source_url, e.id).toMatch(/^https?:\/\//);
    }
  });

  it("names a deciding authority on every entry", () => {
    for (const e of entries) {
      expect(e.authority_en.length, e.id).toBeGreaterThan(0);
    }
  });

  it("keeps every review window inside the consular ceiling", () => {
    for (const e of entries) {
      const span =
        (Date.parse(`${e.review_after}T00:00:00Z`) - Date.parse(`${e.checked_on}T00:00:00Z`)) /
        86_400_000;
      expect(span, e.id).toBeGreaterThan(0);
      expect(span, e.id).toBeLessThanOrEqual(MAX_REVIEW_DAYS);
    }
  });

  it("records a robots check on anything we fetched ourselves", () => {
    for (const e of entries) {
      if (e.method === "permitted_fetch") expect(e.robots_checked_on, e.id).toBeDefined();
    }
  });
});
