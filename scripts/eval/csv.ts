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
  return rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}
