// Retrieval wiring. No network: the embedding call and the RPC are both
// injected, so what is under test is the contract between guard, expansion and
// match_chunks — which is where this phase can go wrong silently.

import { describe, expect, it } from "vitest";
import { jurisdictionsFor, retrieve, TOP_K } from "@/lib/rag/retrieve";
import type { ChunkHit, MatchChunksArgs } from "@/lib/supabase/server";

function hit(partial: Partial<ChunkHit>): ChunkHit {
  return {
    id: 1,
    content: "…",
    section_ref: "BEEG §7",
    doc_title: "BEEG",
    source_url: "https://www.gesetze-im-internet.de/beeg/__7.html",
    valid_from: null,
    retrieved_at: "2026-10-22T00:00:00Z",
    corpus_version: "v1",
    cosine: 0.5,
    fts_rank: 0.1,
    vec_pos: 1,
    fts_pos: 1,
    rrf: 0.03,
    ...partial,
  };
}

/** Records what retrieve() asked for, and replies with what the test wants. */
function spy(hits: ChunkHit[]) {
  const calls: { embedded: string[]; args: MatchChunksArgs[] } = { embedded: [], args: [] };
  return {
    calls,
    deps: {
      embed: async (q: string) => {
        calls.embedded.push(q);
        return [0.1, 0.2];
      },
      match: async (args: MatchChunksArgs) => {
        calls.args.push(args);
        return hits;
      },
    },
  };
}

describe("jurisdictionsFor", () => {
  it("gives a Hessen family federal, Hessen and the consular track", () => {
    expect(jurisdictionsFor({ bundesland: "hessen" })).toEqual(["federal", "hesse", "consular-india"]);
  });

  it("gives a Berlin family federal, Berlin and the consular track", () => {
    expect(jurisdictionsFor({ bundesland: "berlin" })).toEqual(["federal", "berlin", "consular-india"]);
  });

  it("never shows one state's procedure to the other state's family", () => {
    expect(jurisdictionsFor({ bundesland: "hessen" })).not.toContain("berlin");
    expect(jurisdictionsFor({ bundesland: "berlin" })).not.toContain("hesse");
  });

  it("always includes the consular track, because the timeline is dual", () => {
    for (const bundesland of ["hessen", "berlin"] as const) {
      expect(jurisdictionsFor({ bundesland })).toContain("consular-india");
    }
  });
});

describe("retrieve", () => {
  const question = "How long after birth can we apply for Elterngeld";

  it("embeds the original question, never the expanded string", async () => {
    // The single most important line in this file. Embedding the expansion
    // moves the vector away from what the user asked, and the failure is
    // invisible — it degrades ranking without erroring.
    const s = spy([hit({})]);
    await retrieve(question, { bundesland: "hessen" }, s.deps);
    expect(s.calls.embedded).toEqual([question]);
    expect(s.calls.embedded[0]).not.toContain("Basiselterngeld");
  });

  it("passes the German-expanded string as query_text", async () => {
    const s = spy([hit({})]);
    await retrieve(question, { bundesland: "hessen" }, s.deps);
    expect(s.calls.args[0].queryText).toContain(question);
    expect(s.calls.args[0].queryText).toContain("Basiselterngeld");
  });

  it("asks for top-8, the cap in brief §4", async () => {
    const s = spy([hit({})]);
    await retrieve(question, { bundesland: "hessen" }, s.deps);
    expect(s.calls.args[0].matchCount).toBe(TOP_K);
    expect(TOP_K).toBe(8);
  });

  it("filters by the profile's jurisdictions", async () => {
    const s = spy([hit({})]);
    await retrieve(question, { bundesland: "berlin" }, s.deps);
    expect(s.calls.args[0].filterJurisdictions).toEqual(["federal", "berlin", "consular-india"]);
  });

  it("reports the maximum cosine, not the first row's", async () => {
    // Rows arrive ordered by rrf. Reading hits[0].cosine would understate the
    // refusal signal and refuse answerable questions.
    const s = spy([hit({ cosine: 0.42 }), hit({ cosine: 0.77 }), hit({ cosine: 0.51 })]);
    const r = await retrieve(question, { bundesland: "hessen" }, s.deps);
    expect(r.topCosine).toBeCloseTo(0.77);
  });

  it("reports zero cosine when nothing came back", async () => {
    const s = spy([]);
    const r = await retrieve(question, { bundesland: "hessen" }, s.deps);
    expect(r.topCosine).toBe(0);
    expect(r.hits).toEqual([]);
  });

  it("returns the raw per-retriever signals untouched", async () => {
    // ADR-008: the threshold goes on cosine, and a miss has to be attributable
    // to the vector half or the lexical half. Both require these to survive.
    const s = spy([hit({ cosine: 0.61, vec_pos: 3, fts_pos: null, rrf: 0.021 })]);
    const r = await retrieve(question, { bundesland: "hessen" }, s.deps);
    expect(r.hits[0]).toMatchObject({ cosine: 0.61, vec_pos: 3, fts_pos: null, rrf: 0.021 });
  });

  it("surfaces the glossary terms that fired, for the UI to gloss", async () => {
    const s = spy([hit({})]);
    const r = await retrieve(question, { bundesland: "hessen" }, s.deps);
    expect(r.expansion.matched.map((m) => m.de)).toEqual(["Elterngeld"]);
  });
});
