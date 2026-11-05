// The CSV reader the eval and ingestion scripts share.
//
// This function existed five times, byte-identical, in calibrate.ts,
// golden-drift.ts, guidance-extracts.ts, run.ts and verify-golden.ts. The
// golden set is the ground truth every one of those scripts reads, so five
// copies of its parser meant a quoting bug could be fixed in one reader and
// left in four — and the five-readers problem has already bitten this repo
// once, when a golden version bump had to be applied in five places at once.
//
// It handles the only CSV features the golden set uses: quoted cells,
// doubled quotes as an escaped quote, embedded newlines inside quotes, and
// CRLF. It is deliberately not a general CSV library.

/**
 * Parses CSV text into one object per data row, keyed by the header row.
 * Rows with a single cell are dropped, which is what skips trailing blank
 * lines without needing a trim that would also eat a quoted empty cell.
 *
 * THROWS on a field-count mismatch, since 2026-11-05 (ADR-061). It used to map
 * `header.map((h, i) => [h, r[i] ?? ""])`, which silently dropped any field
 * past the header's width and filled any missing field with "". Both halves of
 * that are dangerous in a ground-truth loader:
 *
 *   - A SHORT row would read a required element as "" — an element that cannot
 *     be covered, scored against the product, with no error anywhere.
 *   - A LONG row drops its tail. `A-24` and `A-26` carried an unescaped comma
 *     in `notes`, parsed as 12 fields against an 11-field header, and had their
 *     notes truncated in every script that read the golden set for eleven
 *     versions. `notes` is never scored, which is the only reason it cost
 *     nothing — the same defect one column to the left would have been a wrong
 *     number in a published report, and undetectable after the fact.
 *
 * A ground-truth file is the one input that must never be repaired quietly.
 */
export function readCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const header = rows.shift()!;
  return rows
    .filter((r) => r.length > 1)
    .map((r, i) => {
      if (r.length !== header.length) {
        // The row number is the data row's 1-based index, and the first cell is
        // almost always the id, so the message names the row a human can find.
        const id = r[0] ? ` (id ${r[0]})` : "";
        throw new Error(
          `CSV row ${i + 1}${id} has ${r.length} fields, header has ${header.length}. ` +
            `A field-count mismatch is usually an unescaped comma or quote in a cell — ` +
            `quote the cell and double any quote inside it. Refusing to parse rather than ` +
            `truncate or pad, because this file is ground truth (ADR-061).`,
        );
      }
      return Object.fromEntries(header.map((h, j) => [h, r[j]]));
    });
}
