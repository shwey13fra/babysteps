// lib/rag/retrieve.ts
//
// Guard -> expand -> **retrieve** -> generate.
//
// Two rules this file exists to hold, both from the header of migration 0002:
//   - embed the ORIGINAL question, never the expanded string. The expansion is
//     German keywords glued onto an English sentence; embedding that moves the
//     vector away from the question the user actually asked.
//   - pass the EXPANDED string as query_text, because the lexical half runs
//     to_tsvector('german', ...) and has no English stems to match against.
//
// Returns the raw per-retriever signals untouched, so a miss can be attributed
// to the vector half or the lexical half rather than guessed at, and so the
// refusal threshold is applied to cosine rather than to the fused score.

import type { IntakeProfile, Jurisdiction } from "../schemas";
import { matchChunks, type ChunkHit } from "../supabase/server";
import { expandQuery, type Expansion } from "./expand";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1024;

/** Brief §4: retrieval context is capped at top-8 chunks. */
export const TOP_K = 8;

export type Retrieval = {
  expansion: Expansion;
  hits: ChunkHit[];
  jurisdictions: Jurisdiction[];
  /** The refusal signal: max cosine across the returned rows. 0 when empty. */
  topCosine: number;
};

/**
 * Which slices of the corpus this profile is allowed to see.
 *
 * Federal law applies to everyone. The user's own Bundesland is included and
 * the other one is not — answering a Hessen family with a Berlin procedure is
 * the failure mode the jurisdiction filter exists to prevent (ADR-011).
 * consular-india is always present because the product's promise is dual-track:
 * the German and Indian deadlines are the same timeline.
 */
export function jurisdictionsFor(profile: Pick<IntakeProfile, "bundesland">): Jurisdiction[] {
  const state: Jurisdiction = profile.bundesland === "hessen" ? "hesse" : "berlin";
  return ["federal", state, "consular-india"];
}

/**
 * Embeds with the same model and dimension count the corpus was embedded with
 * (ADR-007). A mismatch here does not error — it silently returns nonsense
 * neighbours — so the constants live beside each other rather than in config.
 */
export async function embedQuestion(question: string): Promise<number[]> {
  const key = process.env.EMBEDDING_API_KEY;
  if (!key) throw new Error("EMBEDDING_API_KEY is not set");

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      input: question,
      model: EMBEDDING_MODEL,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    throw new Error(`embeddings HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }
  const body = (await response.json()) as { data: Array<{ embedding: number[] }> };
  return body.data[0].embedding;
}

export type RetrieveDeps = {
  embed?: (question: string) => Promise<number[]>;
  match?: typeof matchChunks;
};

export async function retrieve(
  question: string,
  profile: Pick<IntakeProfile, "bundesland">,
  deps: RetrieveDeps = {},
): Promise<Retrieval> {
  const embed = deps.embed ?? embedQuestion;
  const match = deps.match ?? matchChunks;

  const expansion = expandQuery(question);
  const jurisdictions = jurisdictionsFor(profile);

  const hits = await match({
    queryEmbedding: await embed(expansion.original),
    queryText: expansion.lexicalQuery,
    filterJurisdictions: jurisdictions,
    matchCount: TOP_K,
  });

  return {
    expansion,
    hits,
    jurisdictions,
    topCosine: hits.length ? Math.max(...hits.map((h) => h.cosine)) : 0,
  };
}
