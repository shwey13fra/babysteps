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

  it("fills a short row's missing cells with empty strings rather than undefined", () => {
    const rows = readCsv("id,category,notes\nA-01,ANSWER\n");
    expect(rows[0].notes).toBe("");
  });

  it("reads the real golden set: 48 rows, every one with an id", () => {
    // The end-to-end case. If this parser ever disagrees with the file, every
    // score in every report is measured against the wrong ground truth.
    const text = readFileSync(join(process.cwd(), "data/golden/golden_set_v1.6.csv"), "utf8");
    const rows = readCsv(text);
    expect(rows).toHaveLength(48);
    expect(rows.every((r) => r.id)).toBe(true);
  });
});
