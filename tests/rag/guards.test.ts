// The medical guard and the refusal signal.
//
// Every invariant here is driven by something KNOWN BROKEN, per the house rule:
// a checker that cannot fail is not a check. The digit detector in particular is
// fed a string that must trip it before it is trusted to clear the deflection.

import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import {
  containsDigit,
  deflect,
  deflectionText,
  DEFLECTION_ROUTINE,
  DEFLECTION_URGENT,
  classifyMedical,
  failClosed,
  isLowConfidence,
  REFUSAL_LOW_CONFIDENCE,
  REFUSAL_MIN_TOP_COSINE,
  REFUSAL_UNAVAILABLE,
  refuse,
} from "@/lib/rag/guards";
import { Answer } from "@/lib/schemas";

/** A stand-in for the SDK that returns whatever the test hands it. */
function stub(response: unknown): Anthropic {
  return { messages: { parse: async () => response } } as unknown as Anthropic;
}

function throwingStub(): Anthropic {
  return {
    messages: {
      parse: async () => {
        throw new Error("connection reset");
      },
    },
  } as unknown as Anthropic;
}

const ok = (medical: boolean, urgent: boolean) => ({
  stop_reason: "end_turn",
  parsed_output: { medical, urgent },
});

describe("containsDigit — proven on known-bad input first", () => {
  it("trips on the things it exists to catch", () => {
    expect(containsDigit("take 500 mg")).toBe(true);
    expect(containsDigit("call 116117")).toBe(true);
    expect(containsDigit("week 28")).toBe(true);
    expect(containsDigit("1")).toBe(true);
    // A non-ASCII numeral is still a number to a reader.
    expect(containsDigit("٣ mg")).toBe(true);
  });

  it("does not trip on ordinary prose", () => {
    expect(containsDigit("Your Hebamme can answer this")).toBe(false);
    expect(containsDigit("")).toBe(false);
  });
});

describe("deflection templates", () => {
  it("the routine template contains no digit of any kind", () => {
    // Golden row M-09 asks for a paracetamol dose. A single figure anywhere in
    // this string is a critical failure, so the whole string is checked, not
    // just the part that would carry a dose.
    expect(containsDigit(DEFLECTION_ROUTINE)).toBe(false);
  });

  it("the routine template redirects and names no clinical content", () => {
    expect(DEFLECTION_ROUTINE).toContain("Frauenarzt");
    expect(DEFLECTION_ROUTINE).toContain("Hebamme");
    expect(DEFLECTION_ROUTINE.toLowerCase()).not.toContain("normal");
    expect(DEFLECTION_ROUTINE.toLowerCase()).not.toContain("safe");
  });

  it("glosses the German terms with the glossary's own wording", () => {
    // rule 14: the gloss the user reads is the glossary string, not a
    // paraphrase written in the guard. If the glossary changes, this changes.
    expect(DEFLECTION_ROUTINE).toContain("(gynaecologist)");
    expect(DEFLECTION_ROUTINE).toContain("(midwife)");
  });

  it("the urgent template carries both numbers and urgency framing", () => {
    expect(DEFLECTION_URGENT).toContain("116117");
    expect(DEFLECTION_URGENT).toContain("112");
    expect(DEFLECTION_URGENT).toContain("now");
  });

  it("the urgent template still refuses to triage", () => {
    const lower = DEFLECTION_URGENT.toLowerCase();
    expect(lower).not.toContain("probably");
    expect(lower).not.toContain("do not worry");
    expect(lower).not.toContain("wait");
  });

  it("picks the template from the urgency", () => {
    expect(deflectionText("urgent")).toBe(DEFLECTION_URGENT);
    expect(deflectionText("routine")).toBe(DEFLECTION_ROUTINE);
  });

  it("produces a response the Answer contract accepts", () => {
    const parsed = Answer.safeParse(deflect({ medical: true, urgency: "routine", source: "classifier" }));
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.kind).toBe("deflected");
  });
});

describe("classifyMedical fails closed", () => {
  it("deflects urgently when the call throws", async () => {
    expect(await classifyMedical("anything", { anthropic: throwingStub() })).toEqual(failClosed());
  });

  it("deflects urgently when the verdict is unparseable", async () => {
    const d = await classifyMedical("anything", {
      anthropic: stub({ stop_reason: "end_turn", parsed_output: null }),
    });
    expect(d).toEqual(failClosed());
  });

  it("deflects urgently on a safety refusal", async () => {
    const d = await classifyMedical("anything", {
      anthropic: stub({ stop_reason: "refusal", parsed_output: null }),
    });
    expect(d).toEqual(failClosed());
  });

  it("deflects urgently when the response was cut off before the verdict", async () => {
    // Thinking is billed against max_tokens on this model, so a truncated
    // response is a realistic failure, not a theoretical one.
    const d = await classifyMedical("anything", {
      anthropic: stub({ stop_reason: "max_tokens", parsed_output: { medical: false, urgent: false } }),
    });
    expect(d).toEqual(failClosed());
  });

  it("marks a fail-closed deflection as an outage, not a verdict", () => {
    // The eval harness reads `source`. A deflection that happened because the
    // classifier was unreachable must not be indistinguishable from one it
    // decided on.
    expect(failClosed().source).toBe("fail_closed");
    expect(failClosed().urgency).toBe("urgent");
  });
});

describe("classifyMedical passes verdicts through", () => {
  it("routes a routine medical question to the routine template", async () => {
    const d = await classifyMedical("how much paracetamol", { anthropic: stub(ok(true, false)) });
    expect(d).toEqual({ medical: true, urgency: "routine", source: "classifier" });
    expect(containsDigit(deflectionText(d.urgency))).toBe(false);
  });

  it("routes an acute question to the urgent template", async () => {
    const d = await classifyMedical("the baby is moving less", { anthropic: stub(ok(true, true)) });
    expect(d.urgency).toBe("urgent");
    expect(deflectionText(d.urgency)).toContain("116117");
  });

  it("lets an administrative question through", async () => {
    const d = await classifyMedical("when is the Elterngeld deadline", { anthropic: stub(ok(false, false)) });
    expect(d.medical).toBe(false);
  });

  it("drops urgency from a non-medical verdict", async () => {
    // The model has no business marking a forms question urgent; the shape
    // cannot carry that combination onward.
    const d = await classifyMedical("which form do I send", { anthropic: stub(ok(false, true)) });
    expect(d).toEqual({ medical: false, urgency: "routine", source: "classifier" });
  });
});

describe("refusal signal", () => {
  it("carries the measured threshold from ADR-009, not a guess", () => {
    // Was asserted null until the calibration ran. 0.43 is the midpoint of the
    // only usable gap in the measured distributions: R-02 at 0.416 below,
    // A-01 at 0.442 worst case above. Changing it means superseding ADR-009.
    expect(REFUSAL_MIN_TOP_COSINE).toBe(0.43);
  });

  it("sits where the calibration put it, relative to the measured rows", () => {
    // Guards the decision, not just the constant: these are the real top
    // cosines either side of the boundary.
    expect(isLowConfidence([{ cosine: 0.416 }], REFUSAL_MIN_TOP_COSINE)).toBe(true); // R-02
    expect(isLowConfidence([{ cosine: 0.425 }], REFUSAL_MIN_TOP_COSINE)).toBe(true); // A-26
    expect(isLowConfidence([{ cosine: 0.442 }], REFUSAL_MIN_TOP_COSINE)).toBe(false); // A-01
    expect(isLowConfidence([{ cosine: 0.638 }], REFUSAL_MIN_TOP_COSINE)).toBe(false); // R-01
  });

  it("refuses when nothing was retrieved", () => {
    expect(isLowConfidence([], 0.5)).toBe(true);
  });

  it("refuses when the best chunk is below the threshold", () => {
    expect(isLowConfidence([{ cosine: 0.41 }, { cosine: 0.39 }], 0.5)).toBe(true);
  });

  it("does not refuse when the best chunk meets the threshold", () => {
    expect(isLowConfidence([{ cosine: 0.5 }, { cosine: 0.2 }], 0.5)).toBe(false);
  });

  it("reads the maximum, not the first row", () => {
    // match_chunks orders by rrf, so the highest cosine is not necessarily row
    // one. Taking hits[0] would refuse answerable questions.
    expect(isLowConfidence([{ cosine: 0.2 }, { cosine: 0.9 }], 0.5)).toBe(false);
  });

  it("produces a refusal the Answer contract accepts, naming the authority", () => {
    const parsed = Answer.safeParse(refuse("low_confidence"));
    expect(parsed.success).toBe(true);
    expect(REFUSAL_LOW_CONFIDENCE).toContain("Elterngeldstelle");
    expect(REFUSAL_LOW_CONFIDENCE).toContain("Standesamt");
  });

  it("does not send the user to an authority when the failure is ours", () => {
    // The bug this prevents: a dead Supabase told the user we had searched the
    // official sources and come up empty, then sent them to the Elterngeldstelle
    // for a question we never processed. ADR-022.
    const parsed = Answer.safeParse(refuse("unavailable"));
    expect(parsed.success).toBe(true);
    expect(REFUSAL_UNAVAILABLE).not.toContain("Elterngeldstelle");
    expect(REFUSAL_UNAVAILABLE).not.toContain("Standesamt");
    expect(REFUSAL_UNAVAILABLE).not.toContain("official sources we cover");
  });

  it("still gives the three judgement reasons the low-confidence wording", () => {
    for (const reason of ["low_confidence", "out_of_scope", "individual_case"] as const) {
      expect(refuse(reason).text).toBe(REFUSAL_LOW_CONFIDENCE);
    }
    expect(refuse("unavailable").text).toBe(REFUSAL_UNAVAILABLE);
  });
});
