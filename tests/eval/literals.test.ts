// The verbatim-presence sweep's extractor (ADR-068).
//
// Every invariant here is driven by something KNOWN BROKEN, per the house rule.
// The anchor case is A-21 element 1 from 2026-11-06-iter13-judge-v6-1, which the
// judge marked NOT COVERED saying the reply "never names the HÄVS or states that
// Hessen has six such offices". The strings below are copied from that run, not
// paraphrased.

import { describe, expect, it } from "vitest";
import {
  authorityPhrases,
  elementLiterals,
  literalPresent,
  literalTokens,
  normalizeDigits,
} from "@/scripts/eval/literals";

// Verbatim from the stored sample.
const A21_ELEMENT =
  "Elterngeld in Hessen is handled by one of the sechs hessischen Ämter für Versorgung und Soziales (HÄVS), the one responsible for the place of residence";

const A21_REPLY =
  'In Hessen, the Elterngeld page of the Regierungspräsidium Gießen lists contact details for "the six Hessische Ämter für Versorgung und Soziales" and for the supervisory authority for Elterngeld at the Regierungspräsidium Gießen. The excerpts do not say which of the six offices covers Frankfurt.';

describe("authorityPhrases", () => {
  it("extracts a multi-word German authority name", () => {
    expect(authorityPhrases(A21_ELEMENT)).toContain("Ämter für Versorgung und Soziales");
  });

  it("stops a name at punctuation, so a parenthetical abbreviation is not glued on", () => {
    // The first version of this extractor returned
    // 'Ämter für Versorgung und Soziales HÄVS', which appears in no reply, and
    // so missed the single defect the sweep exists to catch.
    expect(authorityPhrases(A21_ELEMENT)).not.toContain(
      "Ämter für Versorgung und Soziales HÄVS",
    );
    for (const p of authorityPhrases(A21_ELEMENT)) expect(p).not.toContain("HÄVS");
  });

  it("keeps connectors inside a name but never at its end", () => {
    const p = authorityPhrases("the Ämter für Versorgung und Soziales and others");
    expect(p).toContain("Ämter für Versorgung und Soziales");
    for (const x of p) expect(x.endsWith("und")).toBe(false);
  });

  it("ignores a lone capitalised word, however distinctive it looks", () => {
    // 'Hessen' alone appears in nearly every Hessian reply. Counting it would
    // flag A-21 element 3 — which asks for a URL, not for the word Hessen —
    // and make the sweep's output noise.
    expect(authorityPhrases("this is Hessen-specific")).toEqual([]);
    expect(authorityPhrases("states that this is Hessen-specific")).toEqual([]);
  });

  it("requires two capitalised words and twelve characters", () => {
    expect(authorityPhrases("Der Tag")).toEqual([]);
  });
});

describe("literalPresent", () => {
  it("matches a name across case and spacing differences", () => {
    // Element says 'sechs hessischen Ämter'; reply says 'the six Hessische
    // Ämter'. The shared run is what has to match.
    expect(
      literalPresent({ kind: "authority", token: "Ämter für Versorgung und Soziales" }, A21_REPLY),
    ).toBe(true);
  });

  it("does not match a name the reply never states", () => {
    expect(literalPresent({ kind: "authority", token: "Elterngeld in Hessen" }, A21_REPLY)).toBe(
      false,
    );
  });

  it("matches a § reference through the house normaliser on both sides", () => {
    // elementLiterals emits already-normalised tokens, and REF_PATTERN
    // (citations.ts:60) captures the paragraph only — so the token is 'BEEG §12'.
    expect(elementLiterals("see BEEG §12(1)").some((l) => l.kind === "ref" && l.token === "BEEG §12")).toBe(true);
    expect(literalPresent({ kind: "ref", token: "BEEG §12" }, "see BEEG §12(1) for this")).toBe(true);
    expect(literalPresent({ kind: "ref", token: "BEEG §28" }, "see BEEG §12(1) for this")).toBe(false);
  });

  it("a ref match ignores the Absatz, which is a stated limit on its strength", () => {
    // The house normaliser drops '(1)'. So an element asking for §12(1) counts
    // as present in a reply citing §12(3). A ref flag therefore means 'the same
    // paragraph is cited', not 'the same subsection' — which is why a ref alone
    // is reported as weaker evidence than a multi-word authority name.
    expect(literalPresent({ kind: "ref", token: "BEEG §12" }, "see BEEG §12(3) for this")).toBe(true);
  });

  it("matches a number through separator normalisation", () => {
    expect(literalPresent({ kind: "number", token: "175000" }, "mehr als 175.000 Euro")).toBe(true);
    expect(literalPresent({ kind: "number", token: "175000" }, "mehr als 250.000 Euro")).toBe(false);
  });
});

describe("elementLiterals on the A-21 case", () => {
  it("finds the authority name that is present in the reply", () => {
    const present = elementLiterals(A21_ELEMENT).filter((l) => literalPresent(l, A21_REPLY));
    expect(present.some((l) => l.kind === "authority")).toBe(true);
    expect(present.map((l) => l.token)).toContain("Ämter für Versorgung und Soziales");
  });

  it("orders the strongest kind of evidence first", () => {
    const present = elementLiterals(A21_ELEMENT)
      .filter((l) => literalPresent(l, A21_REPLY))
      .sort((a, b) => (a.kind === "authority" ? -1 : b.kind === "authority" ? 1 : 0));
    expect(present[0].kind).toBe("authority");
  });

  it("flags nothing for an element whose words the reply does not contain", () => {
    const el = "the answer links its page";
    expect(elementLiterals(el).filter((l) => literalPresent(l, A21_REPLY))).toEqual([]);
  });
});

describe("the functions moved from run.ts behave as they did there", () => {
  it("normalizeDigits strips a thousands separator, including a non-breaking space", () => {
    expect(normalizeDigits("250.000")).toBe("250000");
    expect(normalizeDigits("250 000")).toBe("250000");
    // U+00A0 — German typography, and the character the move nearly dropped.
    expect(normalizeDigits(`250${String.fromCharCode(160)}000`)).toBe("250000");
  });

  it("literalTokens still takes numbers of two digits or more, and glossary terms", () => {
    expect(literalTokens("250000 EUR").some((t) => t.kind === "number" && t.token === "250000")).toBe(
      true,
    );
    expect(literalTokens("about 6 weeks").some((t) => t.token === "6")).toBe(false);
  });
});
