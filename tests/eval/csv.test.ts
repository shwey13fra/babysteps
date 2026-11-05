// The CSV reader the eval scripts share.
//
// It was five byte-identical copies until today, and it reads the golden set —
// the ground truth every score is measured against. A quoting bug here
// silently changes what the eval believes the correct answer is, so the cases
// below are the ones the golden set actually relies on, each fed input that
// must trip it.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readCsv } from "../../scripts/eval/csv";

describe("readCsv", () => {
  it("keys each row by the header", () => {
    expect(readCsv("id,category\nA-01,ANSWER\n")).toEqual([{ id: "A-01", category: "ANSWER" }]);
  });

  it("keeps a comma that is inside quotes", () => {
    // The golden set's must_not_contain clauses contain commas. Splitting on
    // every comma would silently truncate a clause and make it pass vacuously.
    const rows = readCsv('id,clause\nA-01,"a, b, c"\n');
    expect(rows[0].clause).toBe("a, b, c");
  });

  it("reads a doubled quote as one literal quote", () => {
    const rows = readCsv('id,clause\nA-01,"she said ""ab dem 19. Lebensmonat"""\n');
    expect(rows[0].clause).toBe('she said "ab dem 19. Lebensmonat"');
  });

  it("keeps a newline that is inside quotes", () => {
    const rows = readCsv('id,clause\nA-01,"line one\nline two"\n');
    expect(rows).toHaveLength(1);
    expect(rows[0].clause).toBe("line one\nline two");
  });

  it("handles CRLF without leaving a stray carriage return in the last cell", () => {
    const rows = readCsv("id,category\r\nA-01,ANSWER\r\n");
    expect(rows[0].category).toBe("ANSWER");
  });

  it("drops a trailing blank line instead of emitting an empty row", () => {
    expect(readCsv("id,category\nA-01,ANSWER\n\n")).toHaveLength(1);
  });

  // CHANGED 2026-11-05 (ADR-061). This used to assert that a short row's
  // missing cells were filled with "". That is silent repair of ground truth:
  // a required element read as "" is an element that cannot be covered, scored
  // against the product, with nothing logged anywhere.
  it("throws on a short row rather than padding it with empty strings", () => {
    expect(() => readCsv("id,category,notes\nA-01,ANSWER\n")).toThrow(
      /has 2 fields, header has 3/,
    );
  });

  it("throws on a long row rather than truncating its tail", () => {
    // The real defect: an unescaped comma in `notes` made A-24 and A-26 parse
    // as 12 fields against an 11-field header, from golden v1.1 through v1.10.
    // The 12th field was dropped, so those rows' notes were truncated in every
    // script that read the set. `notes` is never scored, which is the only
    // reason eleven versions went by without anyone noticing.
    expect(() => readCsv("id,category\nA-01,ANSWER,oops\n")).toThrow(
      /has 3 fields, header has 2/,
    );
  });

  it("names the offending row's id, so the file can be fixed without bisecting it", () => {
    expect(() => readCsv("id,category\nA-01,ANSWER\nA-02,ANSWER,oops\n")).toThrow(/id A-02/);
  });

  it("accepts a comma inside a properly quoted cell, which is the fix for the above", () => {
    const rows = readCsv('id,notes\nA-24,"no deadline, no documents (ADR-019)"\n');
    expect(rows[0].notes).toBe("no deadline, no documents (ADR-019)");
  });

  it("reads the LIVE golden set: 48 rows, every one with an id", () => {
    // The end-to-end case. If this parser ever disagrees with the file, every
    // score in every report is measured against the wrong ground truth.
    //
    // Deliberately the live set, not a pinned historical one. This test read
    // v1.7 until 2026-11-05 and passed, because the parser it was testing
    // tolerated v1.7's two ragged rows. The historical files are NOT repaired:
    // they are the committed record of what each past run measured, and
    // rewriting them would falsify that record to make a test pass.
    const text = readFileSync(join(process.cwd(), "data/golden/golden_set_v1.12.csv"), "utf8");
    const rows = readCsv(text);
    expect(rows).toHaveLength(48);
    expect(rows.every((r) => r.id)).toBe(true);
  });
});
