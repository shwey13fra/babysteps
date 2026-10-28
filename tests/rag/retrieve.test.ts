// Retrieval wiring. No network: the embedding call and the RPC are both
// injected, so what is under test is the contract between guard, expansion and
// match_chunks — which is where this phase can go wrong silently.

import { describe, expect, it } from "vitest";
import {
  completeSections,
  contiguousRun,
  EXCERPT_TOKEN_BUDGET,
  jurisdictionsFor,
  retrieve,
  TOP_K,
} from "@/lib/rag/retrieve";
import type { ChunkHit, MatchChunksArgs, SiblingsArgs } from "@/lib/supabase/server";

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

/**
 * Records what retrieve() asked for, and replies with what the test wants.
 *
 * `siblings` is injected even when a test does not care about completion: left
 * to its default it would reach the real database, and this file's first line
 * promises no network.
 */
function spy(hits: ChunkHit[], pool: ChunkHit[] = []) {
  const calls: {
    embedded: string[];
    args: MatchChunksArgs[];
    siblings: SiblingsArgs[];
  } = { embedded: [], args: [], siblings: [] };
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
      siblings: async (args: SiblingsArgs) => {
        calls.siblings.push(args);
        return pool;
      },
    },
  };
}

/** The real SGB V §10, as stored: three contiguous chunks, verified 2026-10-29. */
const sgb10 = [
  hit({ id: 3873, section_ref: "SGB V §10", content: "SGB V §10 — Familienversicherung (1) … (2) …" }),
  hit({ id: 3874, section_ref: "SGB V §10", content: "SGB V §10 — Familienversicherung (3) … (4) …" }),
  hit({ id: 3875, section_ref: "SGB V §10", content: "SGB V §10 — Familienversicherung (5) … (6) …" }),
];

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

describe("contiguousRun", () => {
  it("returns the whole run when every id is consecutive", () => {
    expect(contiguousRun([3873, 3874, 3875], 3873)).toEqual([3873, 3874, 3875]);
  });

  it("reaches backwards as well as forwards from the anchor", () => {
    expect(contiguousRun([3873, 3874, 3875], 3875)).toEqual([3873, 3874, 3875]);
  });

  it("stops at a gap, which is the whole point", () => {
    // Kinder-RL §17, as stored: 4452-4454 is the real section, 4465 is a
    // mislabelled stray sitting between §24 and §25 (verified 2026-10-29).
    expect(contiguousRun([4452, 4453, 4454, 4465], 4452)).toEqual([4452, 4453, 4454]);
  });

  it("returns the stray alone when the stray is the anchor", () => {
    expect(contiguousRun([4452, 4453, 4454, 4465], 4465)).toEqual([4465]);
  });

  it("returns the anchor alone when it is not in the list", () => {
    expect(contiguousRun([1, 2], 99)).toEqual([99]);
  });
});

describe("completeSections", () => {
  it("supplies §10(3) and §10(4) when retrieval returned only §10(1)-(2)", () => {
    // A-16's critical, verbatim: "the supplied SGB V §10 excerpt stops at
    // §10(2) item 1 and contains no §10(3)". Chunk 3874 was in the corpus and
    // was never sent. This is the assertion the whole iteration rests on.
    const { hits, completion } = completeSections([sgb10[0]], sgb10);
    const text = hits.map((h) => h.content).join("\n");

    expect(text).toContain("(3)");
    expect(text).toContain("(4)");
    expect(hits.map((h) => h.id)).toEqual([3873, 3874, 3875]);
    expect(completion.added).toEqual([3874, 3875]);
  });

  it("NEGATIVE CONTROL: without a pool to complete from, §10(3) is absent", () => {
    // Proves the assertion above discriminates rather than passing on text that
    // was always there. This is the pre-ADR-032 behaviour, and it must fail the
    // test the previous case passes.
    const { hits, completion } = completeSections([sgb10[0]], []);
    const text = hits.map((h) => h.content).join("\n");

    expect(text).not.toContain("(3)");
    expect(text).not.toContain("(4)");
    expect(hits.map((h) => h.id)).toEqual([3873]);
    expect(completion.added).toEqual([]);
  });

  it("is a no-op when the ranked hit has no section_ref", () => {
    // Guidance HTML carries no §, so it has no siblings. The dangerous bug
    // here is querying for section_ref IS NULL, which matches every guidance
    // chunk in the corpus.
    const guidance = hit({ id: 500, section_ref: null });
    const { hits, completion } = completeSections([guidance], [guidance]);
    expect(hits).toEqual([guidance]);
    expect(completion.added).toEqual([]);
  });

  it("keeps a mislabelled stray out of the § it was wrongly filed under", () => {
    const k17 = [4452, 4453, 4454].map((id) =>
      hit({ id, section_ref: "Kinder-RL §17", content: `Kinder-RL §17 — part ${id}` }),
    );
    const stray = hit({
      id: 4465,
      section_ref: "Kinder-RL §17",
      content: "Kinder-RL §17 — a fragment that belongs to §24/§25",
    });

    const { hits, completion } = completeSections([k17[0]], [...k17, stray]);

    expect(hits.map((h) => h.id)).toEqual([4452, 4453, 4454]);
    expect(hits.map((h) => h.id)).not.toContain(4465);
    // Reported, not silently dropped: it is a corpus defect to fix in ingestion.
    expect(completion.nonContiguous).toEqual(["Kinder-RL §17"]);
  });

  it("preserves the order of the ranked hits and emits a run in place", () => {
    // Load-bearing for citation validity: run.ts:465 maps chunks by source_url
    // last-wins, so the final chunk for a URL must stay a chunk of the same §.
    const other = hit({ id: 9000, section_ref: "BEEG §7", content: "BEEG §7 — …" });
    const { hits } = completeSections([sgb10[0], other], [...sgb10, other]);
    expect(hits.map((h) => h.id)).toEqual([3873, 3874, 3875, 9000]);
  });

  it("emits a run once when two ranked hits share it", () => {
    const { hits, completion } = completeSections([sgb10[0], sgb10[2]], sgb10);
    expect(hits.map((h) => h.id)).toEqual([3873, 3874, 3875]);
    expect(completion.added).toEqual([3874, 3875]);
  });

  it("gives up completion rather than a ranked hit when the budget binds", () => {
    // The brief's §4 guarantee is the ranked top-8. Completion is best-effort
    // inside what is left, and a skip is reported rather than inferred.
    const big = (id: number) =>
      hit({ id, section_ref: "BIG §1", content: "x".repeat(EXCERPT_TOKEN_BUDGET * 3.5) });
    const anchor = big(1);
    const { hits, completion } = completeSections([anchor], [anchor, big(2)]);

    expect(hits.map((h) => h.id)).toEqual([1]);
    expect(completion.added).toEqual([]);
    expect(completion.budgetSkipped).toEqual(["BIG §1"]);
  });

  it("reports the estimated token size of what it is handing the model", () => {
    const { completion } = completeSections([sgb10[0]], sgb10);
    const chars = sgb10.reduce((n, c) => n + c.content.length, 0);
    expect(completion.estTokens).toBe(Math.ceil(chars / 3.5));
  });
});

describe("retrieve, with section completion", () => {
  const question = "How long can I take Elterngeld for?";

  it("asks for the distinct §§ of the ranked hits, under the SAME jurisdictions", async () => {
    // ADR-011 binds completion exactly as it binds the ranked query: a Hessen
    // family must not be shown a Berlin procedure because it shares a §.
    const s = spy([sgb10[0], sgb10[0], hit({ id: 7, section_ref: "BEEG §7" })], sgb10);
    await retrieve(question, { bundesland: "berlin" }, s.deps);

    expect(s.calls.siblings).toHaveLength(1);
    expect(s.calls.siblings[0].sectionRefs).toEqual(["SGB V §10", "BEEG §7"]);
    expect(s.calls.siblings[0].filterJurisdictions).toEqual(["federal", "berlin", "consular-india"]);
  });

  it("does not query at all when no ranked hit carries a §", async () => {
    const s = spy([hit({ id: 1, section_ref: null })], []);
    await retrieve(question, { bundesland: "hessen" }, s.deps);
    expect(s.calls.siblings).toHaveLength(0);
  });

  it("keeps ranked as the top-8 and hits as what the model sees", async () => {
    const s = spy([sgb10[0]], sgb10);
    const r = await retrieve(question, { bundesland: "hessen" }, s.deps);

    expect(r.ranked.map((h) => h.id)).toEqual([3873]);
    expect(r.hits.map((h) => h.id)).toEqual([3873, 3874, 3875]);
  });

  it("reads topCosine from ranked, so a cosine-0 sibling cannot move it", async () => {
    // Siblings are fetched by §, never scored. If they reached topCosine, the
    // ADR-009 refusal threshold would drift every time a § happened to split.
    const s = spy([hit({ id: 3873, section_ref: "SGB V §10", cosine: 0.52 })], [
      hit({ id: 3873, section_ref: "SGB V §10", cosine: 0.52 }),
      hit({ id: 3874, section_ref: "SGB V §10", cosine: 0 }),
    ]);
    const r = await retrieve(question, { bundesland: "hessen" }, s.deps);

    expect(r.topCosine).toBeCloseTo(0.52);
    expect(r.hits).toHaveLength(2);
  });
});
