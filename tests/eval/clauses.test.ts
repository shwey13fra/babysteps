// Clause kinds in required_answer_elements (ADR-029).
//
// Every invariant here is driven by something KNOWN BROKEN, per the house rule:
// a checker that cannot fail is not a check. The five clauses in `falsified the
// inferred classifier` below are the real golden-set cells that broke the
// regex this parser replaces, and each one is asserted to come back as a
// requirement — because every misclassification silently dropped a check.

import { describe, expect, it } from "vitest";
import { parseElement, prohibitionCoverage } from "@/scripts/eval/clauses";

describe("parseElement — markers, never inference", () => {
  it("reads a permission from the may: marker", () => {
    const e = parseElement("may: states that it is a medical decision");
    expect(e.kind).toBe("permission");
    expect(e.text).toBe("states that it is a medical decision");
    expect(e.channel).toBeNull();
  });

  it("reads a prohibition and the channel it names", () => {
    const e = parseElement("not(clinical): clinical assessment");
    expect(e.kind).toBe("prohibition");
    expect(e.text).toBe("clinical assessment");
    expect(e.channel).toBe("clinical");
  });

  it("reads the digits channel", () => {
    expect(parseElement("not(digits): numbers anywhere in the reply")).toMatchObject({
      kind: "prohibition",
      channel: "digits",
      text: "numbers anywhere in the reply",
    });
  });

  it("treats an unmarked clause as a requirement", () => {
    const e = parseElement("urgent framing");
    expect(e.kind).toBe("requirement");
    expect(e.text).toBe("urgent framing");
  });

  it("keeps a bare not: as a prohibition but with no channel, so the guard can catch it", () => {
    const e = parseElement("not: something nothing checks");
    expect(e.kind).toBe("prohibition");
    expect(e.channel).toBeNull();
  });

  it("preserves the raw clause alongside the stripped text", () => {
    expect(parseElement("  may: answers the federal part, only if cited  ")).toMatchObject({
      raw: "may: answers the federal part, only if cited",
      text: "answers the federal part, only if cited",
    });
  });
});

describe("the five clauses that falsified the inferred classifier", () => {
  // A `\bmay\b` test called these permissions. They are requirements: the
  // grammatical subject of 'may' is the law's subject, not the reply.
  it.each([
    ["A-01", "woman may expressly waive and revoke the waiver at any time"],
    ["A-14", "separate on-call fee may be charged privately"],
    ["A-18", "that certificate may be issued at the earliest 7 weeks before the due date"],
  ])("%s: a mid-clause 'may' is still a requirement", (_id, clause) => {
    expect(parseElement(clause).kind).toBe("requirement");
  });

  // A leading no/zero test called these prohibitions. They are requirements:
  // the answer must STATE them.
  it.each([
    ["A-14", "no doctor's referral needed"],
    ["A-19", "no"],
  ])("%s: a leading 'no' is still a requirement", (_id, clause) => {
    expect(parseElement(clause).kind).toBe("requirement");
  });

  // And the permissions the same regex missed, now explicit.
  it.each([
    ["R-01", "may: answers the federal part, only if cited"],
    ["R-03", "may: answers the German-side steps, if cited"],
  ])("%s: a marked permission is read as one", (_id, clause) => {
    expect(parseElement(clause).kind).toBe("permission");
  });
});

describe("the golden set classifies without ambiguity", () => {
  it("leaves no unmarked clause that looks like a permission or a prohibition on a non-ANSWER row", async () => {
    const { readFileSync } = await import("node:fs");
    const csv = readFileSync("data/golden/golden_set_v1.6.csv", "utf8");

    // Minimal RFC4180 read of the two columns this test needs.
    const rows: string[][] = [];
    let row: string[] = [], field = "", quoted = false;
    for (let i = 0; i < csv.length; i++) {
      const c = csv[i];
      if (quoted) {
        if (c === '"') { if (csv[i + 1] === '"') { field += '"'; i++; } else quoted = false; }
        else field += c;
      } else if (c === '"') quoted = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); field = ""; rows.push(row); row = []; }
      else if (c !== "\r") field += c;
    }
    if (field || row.length) { row.push(field); rows.push(row); }

    const header = rows[0];
    const idCol = header.indexOf("id");
    const catCol = header.indexOf("category");
    const elCol = header.indexOf("required_answer_elements");

    const ambiguous: string[] = [];
    for (const r of rows.slice(1)) {
      if (!r[idCol]) continue;
      if (r[catCol] === "ANSWER") continue; // the five known-ambiguous requirements live here
      for (const raw of r[elCol].split(";").map((s) => s.trim()).filter(Boolean)) {
        const e = parseElement(raw);
        if (e.kind !== "requirement") continue;
        if (/\bmay\b/i.test(raw) || /^(no|zero)\b/i.test(raw)) ambiguous.push(`${r[idCol]}: ${raw}`);
      }
    }
    expect(ambiguous).toEqual([]);
  });

  it("every prohibition in the set names a channel", async () => {
    const { readFileSync } = await import("node:fs");
    const csv = readFileSync("data/golden/golden_set_v1.6.csv", "utf8");
    const unnamed = csv
      .split("\n")
      .flatMap((line) => line.split(";").map((s) => s.trim()))
      .filter((c) => /^not:/i.test(c));
    expect(unnamed).toEqual([]);
  });
});

describe("prohibitionCoverage — the guard, fed what it must refuse", () => {
  const proh = (s: string) => parseElement(s);

  it("covers a clinical prohibition on any category", () => {
    expect(prohibitionCoverage(proh("not(clinical): clinical assessment"), "DEFLECT"))
      .toBe("clinical_content (judge)");
    expect(prohibitionCoverage(proh("not(clinical): clinical assessment"), "ANSWER"))
      .toBe("clinical_content (judge)");
  });

  it("covers a digits prohibition on a DEFLECT row", () => {
    expect(prohibitionCoverage(proh("not(digits): figures"), "DEFLECT"))
      .toBe("m-row digit allowlist (ADR-023)");
  });

  // The digit allowlist is computed on DEFLECT rows only (ADR-023). A digits
  // prohibition anywhere else is unchecked, and must say so.
  it("refuses a digits prohibition off a DEFLECT row", () => {
    expect(prohibitionCoverage(proh("not(digits): figures"), "ANSWER")).toBeNull();
    expect(prohibitionCoverage(proh("not(digits): figures"), "REFUSE")).toBeNull();
  });

  it("refuses an unknown channel name", () => {
    expect(prohibitionCoverage(proh("not(bogus): something"), "DEFLECT")).toBeNull();
  });

  it("refuses a prohibition that names no channel", () => {
    expect(prohibitionCoverage(proh("not: something"), "DEFLECT")).toBeNull();
  });

  it("returns null for clauses that are not prohibitions, so nothing else routes through it", () => {
    expect(prohibitionCoverage(proh("urgent framing"), "DEFLECT")).toBeNull();
    expect(prohibitionCoverage(proh("may: states that it is a medical decision"), "DEFLECT")).toBeNull();
  });

  it("every prohibition the live golden set carries is covered on its own row", async () => {
    const { readFileSync } = await import("node:fs");
    const lines = readFileSync("data/golden/golden_set_v1.6.csv", "utf8").split("\n").slice(1);
    const seen: string[] = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      const id = line.slice(0, line.indexOf(","));
      const category = line.split(",")[1];
      for (const raw of line.split(";").map((s) => s.trim())) {
        const e = parseElement(raw);
        if (e.kind !== "prohibition") continue;
        seen.push(`${id}: ${raw}`);
        expect(prohibitionCoverage(e, category), `${id} — ${raw}`).not.toBeNull();
      }
    }
    // Guards against the empty-set pass: 0 prohibitions examined is a tool
    // failure, not a clean sheet (past-mistakes 2026-10-23).
    expect(seen.length).toBe(6);
  });
});
