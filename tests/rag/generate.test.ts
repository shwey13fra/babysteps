// Generation, and the grounding step that stands between a fluent model and a
// fabricated source.
//
// No network: the SDK is injected. What is under test is the part that decides
// whether a response is allowed to leave the system at all.

import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { generate, groundCitations, toAnswer } from "@/lib/rag/generate";
import type { Retrieval } from "@/lib/rag/retrieve";
import type { ChunkHit } from "@/lib/supabase/server";

const BEEG7 = "https://www.gesetze-im-internet.de/beeg/__7.html";
const BEEG16 = "https://www.gesetze-im-internet.de/beeg/__16.html";

function hit(partial: Partial<ChunkHit>): ChunkHit {
  return {
    id: 1,
    content: "Elterngeld wird rückwirkend nur für die letzten drei Lebensmonate gezahlt.",
    section_ref: "BEEG §7",
    doc_title: "Bundeselterngeld- und Elternzeitgesetz",
    source_url: BEEG7,
    valid_from: null,
    retrieved_at: "2026-10-22T09:14:00+00:00",
    corpus_version: "v1",
    cosine: 0.61,
    fts_rank: 0.1,
    vec_pos: 1,
    fts_pos: 2,
    rrf: 0.03,
    ...partial,
  };
}

function retrieval(hits: ChunkHit[] = [hit({})]): Retrieval {
  return {
    expansion: { original: "q", lexicalQuery: "q Elterngeld", matched: [{ de: "Elterngeld", en_gloss: "parental allowance" }] },
    hits,
    jurisdictions: ["federal", "hesse", "consular-india"],
    topCosine: hits.length ? Math.max(...hits.map((h) => h.cosine)) : 0,
  };
}

const answeredOutput = (citations: Array<{ section_ref: string; source_url: string }>) => ({
  stop_reason: "end_turn",
  parsed_output: {
    kind: "answered",
    text: "Payment is backdated at most three months.",
    citations,
    jurisdiction_scope: "This is federal law and applies everywhere in Germany.",
    glossed_terms: [{ de: "Elterngeld", en_gloss: "parental allowance" }],
    refusal_reason: "none",
  },
});

function stub(...responses: unknown[]): Anthropic {
  let i = 0;
  return {
    messages: { parse: async () => responses[Math.min(i++, responses.length - 1)] },
  } as unknown as Anthropic;
}

describe("groundCitations", () => {
  it("fills as_of from the corpus record, not from the model", () => {
    // rule 4's spirit: a date the model writes is a date nobody checked. The
    // model is never asked for one.
    const c = groundCitations([{ section_ref: "BEEG §7", source_url: BEEG7 }], retrieval());
    expect(c).toHaveLength(1);
    expect(c[0].as_of).toBe("2026-10-22");
    expect(c[0].doc_title).toBe("Bundeselterngeld- und Elternzeitgesetz");
  });

  it("drops a citation whose URL was never retrieved", () => {
    // The most damaging failure in this product: a plausible-looking source
    // that does not exist. It must not survive to the response.
    const c = groundCitations(
      [{ section_ref: "BEEG §99", source_url: "https://www.gesetze-im-internet.de/beeg/__99.html" }],
      retrieval(),
    );
    expect(c).toEqual([]);
  });

  it("keeps the real citation and drops the invented one from the same response", () => {
    const c = groundCitations(
      [
        { section_ref: "BEEG §7", source_url: BEEG7 },
        { section_ref: "BEEG §99", source_url: "https://example.invalid/__99.html" },
      ],
      retrieval(),
    );
    expect(c.map((x) => x.section_ref)).toEqual(["BEEG §7"]);
  });

  it("falls back to the chunk's own reference when the model gives none", () => {
    const c = groundCitations([{ section_ref: "", source_url: BEEG7 }], retrieval());
    expect(c[0].section_ref).toBe("BEEG §7");
  });

  it("de-duplicates repeated citations", () => {
    const c = groundCitations(
      [
        { section_ref: "BEEG §7", source_url: BEEG7 },
        { section_ref: "BEEG §7", source_url: BEEG7 },
      ],
      retrieval(),
    );
    expect(c).toHaveLength(1);
  });
});

describe("toAnswer", () => {
  it("rejects an answered response whose citations were all invented", () => {
    // Rule 8 lives in the contract: citations is a non-empty array, so an
    // answer that loses every citation to grounding cannot be constructed.
    const result = toAnswer(
      {
        kind: "answered",
        text: "Confident and unsourced.",
        citations: [{ section_ref: "BEEG §99", source_url: "https://example.invalid/x" }],
        jurisdiction_scope: "federal",
        glossed_terms: [],
        refusal_reason: "none",
      },
      retrieval(),
    );
    expect(result).toBeNull();
  });

  it("accepts an answered response with one real citation", () => {
    const result = toAnswer(
      {
        kind: "answered",
        text: "Payment is backdated at most three months.",
        citations: [{ section_ref: "BEEG §7", source_url: BEEG7 }],
        jurisdiction_scope: "This is federal law.",
        glossed_terms: [],
        refusal_reason: "none",
      },
      retrieval(),
    );
    expect(result?.kind).toBe("answered");
    if (result?.kind === "answered") expect(result.citations[0].as_of).toBe("2026-10-22");
  });

  it("carries a refusal reason through", () => {
    const result = toAnswer(
      {
        kind: "refused",
        text: "Only the Elterngeldstelle decides this.",
        citations: [],
        jurisdiction_scope: "",
        glossed_terms: [],
        refusal_reason: "individual_case",
      },
      retrieval(),
    );
    expect(result).toEqual({
      kind: "refused",
      text: "Only the Elterngeldstelle decides this.",
      reason: "individual_case",
    });
  });

  it("does not let a refusal arrive without a reason", () => {
    const result = toAnswer(
      {
        kind: "refused",
        text: "We do not cover this.",
        citations: [],
        jurisdiction_scope: "",
        glossed_terms: [],
        refusal_reason: "none",
      },
      retrieval(),
    );
    expect(result?.kind).toBe("refused");
    if (result?.kind === "refused") expect(result.reason).toBe("out_of_scope");
  });
});

describe("generate retries once, then fails closed", () => {
  const real = [{ section_ref: "BEEG §7", source_url: BEEG7 }];
  const fake = [{ section_ref: "BEEG §99", source_url: "https://example.invalid/x" }];

  it("accepts a good first response without retrying", async () => {
    const answer = await generate("q", retrieval(), { anthropic: stub(answeredOutput(real)) });
    expect(answer.kind).toBe("answered");
  });

  it("recovers when the first response invents a source and the second does not", async () => {
    const answer = await generate("q", retrieval(), {
      anthropic: stub(answeredOutput(fake), answeredOutput(real)),
    });
    expect(answer.kind).toBe("answered");
    if (answer.kind === "answered") expect(answer.citations[0].source_url).toBe(BEEG7);
  });

  it("refuses rather than answer when both attempts violate the contract", async () => {
    const answer = await generate("q", retrieval(), {
      anthropic: stub(answeredOutput(fake), answeredOutput(fake)),
    });
    expect(answer).toMatchObject({ kind: "refused", reason: "low_confidence" });
  });

  it("refuses rather than throw when the provider is unreachable", async () => {
    const throwing = {
      messages: {
        parse: async () => {
          throw new Error("ECONNRESET");
        },
      },
    } as unknown as Anthropic;
    const answer = await generate("q", retrieval(), { anthropic: throwing });
    expect(answer.kind).toBe("refused");
  });

  it("treats a truncated response as a violation", async () => {
    const answer = await generate("q", retrieval(), {
      anthropic: stub({ stop_reason: "max_tokens", parsed_output: answeredOutput(real).parsed_output }),
    });
    expect(answer.kind).toBe("refused");
  });

  it("can cite a second source when both were retrieved", async () => {
    const r = retrieval([hit({}), hit({ id: 2, section_ref: "BEEG §16", source_url: BEEG16, retrieved_at: "2026-10-23T00:00:00+00:00" })]);
    const answer = await generate("q", r, {
      anthropic: stub(answeredOutput([...real, { section_ref: "BEEG §16", source_url: BEEG16 }])),
    });
    expect(answer.kind).toBe("answered");
    if (answer.kind === "answered") {
      expect(answer.citations.map((c) => c.as_of)).toEqual(["2026-10-22", "2026-10-23"]);
    }
  });
});
