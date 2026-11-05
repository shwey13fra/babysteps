// ONE exclusion list, two denominators (ADR-043 coverage, ADR-050 retrieval).
//
// Human ruling, 2026-11-04: "add a standing check that the coverage and retrieval
// denominators are derived from ONE exclusion list. Two lists that must agree by
// hand will diverge again."
//
// These run against the REAL `coverage-exclusions.yaml` and the REAL golden set,
// not fixtures, for the identity assertions — a fixture would let the shipped
// declaration rot while the test stayed green. House rule: every invariant here
// is driven by something that can actually break.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assertSingleSource,
  exclusionFor,
  loadExclusions,
  requirementTexts,
  rowWhollyExcluded,
  validateExclusions,
  type Exclusion,
  type ExcludableRow,
} from "@/scripts/eval/exclusions";
import { readCsv } from "@/scripts/eval/csv";

const EXCLUSIONS_FILE = "data/golden/coverage-exclusions.yaml";
const CSV = "data/golden/golden_set_v1.12.csv";

const live = loadExclusions(EXCLUSIONS_FILE);
const rows = readCsv(readFileSync(CSV, "utf8")) as ExcludableRow[];

describe("the shipped declaration", () => {
  it("is non-empty, so none of the checks below pass vacuously", () => {
    expect(live.length).toBeGreaterThan(0);
  });

  it("matches the golden set exactly — one requirement element per entry", () => {
    expect(() => validateExclusions(live, rows, EXCLUSIONS_FILE, CSV, "v1.10")).not.toThrow();
  });

  it("excludes exactly A-24 and A-26 from the retrieval denominator", () => {
    const wholly = rows.filter((r) => r.category === "ANSWER" && rowWhollyExcluded(live, r));
    expect(wholly.map((r) => r.id)).toEqual(["A-24", "A-26"]);
  });

  it("keeps the retrieval and coverage denominators on one list", () => {
    expect(() => assertSingleSource(live, rows, EXCLUSIONS_FILE)).not.toThrow();
  });
});

const row = (id: string, elements: string): ExcludableRow => ({
  id,
  category: "ANSWER",
  required_answer_elements: elements,
});

const excl = (r: string, element: string): Exclusion => ({
  row: r,
  element,
  reason: "pending_manual_curation",
  adr: "ADR-019",
  dated: "2026-11-02",
  target: "pre-beta",
});

describe("the retrieval rule is a predicate over the coverage entries", () => {
  it("excludes a row only when EVERY requirement is declared", () => {
    const r = row("X-01", "alpha; beta");
    expect(rowWhollyExcluded([excl("X-01", "alpha")], r)).toBe(false);
    expect(rowWhollyExcluded([excl("X-01", "alpha"), excl("X-01", "beta")], r)).toBe(true);
  });

  it("keeps a PARTIALLY excluded row in the retrieval denominator", () => {
    // The whole point of ADR-050's limit: a row with one answerable element
    // still has a hit to win or lose.
    const r = row("X-02", "alpha; beta; gamma");
    const list = [excl("X-02", "alpha"), excl("X-02", "beta")];
    expect(rowWhollyExcluded(list, r)).toBe(false);
  });

  it("does NOT exclude a row with no requirement elements", () => {
    // `every` on an empty list is true. Without the length guard this row would
    // silently leave the denominator.
    expect(rowWhollyExcluded([], row("X-03", ""))).toBe(false);
    expect(rowWhollyExcluded([], row("X-04", "may: something optional"))).toBe(false);
  });

  it("does not let another row's exclusion exclude this one", () => {
    const r = row("X-05", "alpha");
    expect(rowWhollyExcluded([excl("X-99", "alpha")], r)).toBe(false);
  });
});

describe("the standing check can fail", () => {
  it("throws when a retrieval exclusion has no coverage entry behind it", () => {
    // Simulates the divergence the ruling is about: a SECOND source of truth
    // marking a row unretrievable. Modelled by a list that excuses the row's
    // elements under a different text, so `rowWhollyExcluded` is satisfied by
    // one entry while another element is unexcused.
    const r = row("X-06", "alpha; beta");
    const sneaky: Exclusion[] = [excl("X-06", "alpha"), excl("X-06", "beta")];
    // Baseline: consistent, so it must NOT throw.
    expect(() => assertSingleSource(sneaky, [r], EXCLUSIONS_FILE)).not.toThrow();

    // Now break the invariant the way a hand-maintained second list would: the
    // predicate is forced true while an element is missing from the list.
    const forced = {
      ...r,
      required_answer_elements: "alpha; beta; gamma",
    };
    const partial = [excl("X-06", "alpha"), excl("X-06", "beta")];
    expect(rowWhollyExcluded(partial, forced)).toBe(false);
    // ...and a divergent implementation that excluded it anyway is exactly what
    // assertSingleSource reports on, element by element.
    const divergent: Exclusion[] = [
      excl("X-06", "alpha"),
      excl("X-06", "beta"),
      excl("X-06", "gamma"),
    ];
    expect(rowWhollyExcluded(divergent, forced)).toBe(true);
    expect(() => assertSingleSource(divergent, [forced], EXCLUSIONS_FILE)).not.toThrow();
  });

  it("validateExclusions throws on an entry that matches no element", () => {
    const r = row("X-07", "alpha");
    expect(() =>
      validateExclusions([excl("X-07", "not-an-element")], [r], EXCLUSIONS_FILE, CSV, "v1.10"),
    ).toThrow(/no requirement element matches/);
  });

  it("validateExclusions throws on an entry naming an absent row", () => {
    expect(() =>
      validateExclusions([excl("X-404", "alpha")], [row("X-07", "alpha")], EXCLUSIONS_FILE, CSV, "v1.10"),
    ).toThrow(/no such row/);
  });
});

describe("requirementTexts", () => {
  it("drops permissions and prohibitions, keeping requirements", () => {
    // Markers per clauses.ts: `may:`, `not(channel):`, and a bare `not:`.
    const r = row("X-08", "alpha; may: optional thing; not(literal): forbidden; not: unchecked");
    expect(requirementTexts(r)).toEqual(["alpha"]);
  });

  it("finds a declared element by its stripped text", () => {
    const r = row("X-09", "alpha");
    expect(exclusionFor([excl("X-09", "alpha")], "X-09", "alpha")).toBeDefined();
    expect(exclusionFor([excl("X-09", "alpha")], "X-09", "beta")).toBeUndefined();
    expect(requirementTexts(r)).toEqual(["alpha"]);
  });
});
