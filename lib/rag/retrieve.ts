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
import { matchChunks, siblingsFor, type ChunkHit } from "../supabase/server";
import { expandQuery, type Expansion } from "./expand";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1024;

/** Brief §4: retrieval context is capped at top-8 chunks. This is that cap. */
export const TOP_K = 8;

/**
 * Brief §4's chunk cap, re-expressed as what it was protecting (ADR-032).
 *
 * 8 chunks at the chunker's 800-token ceiling is 6,400 tokens of excerpt, so
 * that is the budget the brief actually bought. Completion is allowed to double
 * it, because a § arriving whole is the point and chunks run 493-2,699 chars —
 * a count of chunks was never the quantity that mattered.
 *
 * The ranked TOP_K are never dropped to stay inside this: they are the brief's
 * guarantee. Completion is best-effort within what is left.
 */
export const EXCERPT_TOKEN_BUDGET = 12_800;

/** The chunker's documented German estimate (scripts/ingest/chunk.ts:17). */
const CHARS_PER_TOKEN = 3.5;

const estTokens = (chunks: ChunkHit[]) =>
  Math.ceil(chunks.reduce((sum, c) => sum + c.content.length, 0) / CHARS_PER_TOKEN);

/** What completion did, so a report can state it rather than imply it. */
export type Completion = {
  /** Chunk ids added to the ranked list. */
  added: number[];
  /** §§ whose run was left incomplete because the token budget bound first. */
  budgetSkipped: string[];
  /**
   * §§ where the hit's chunks are NOT a contiguous id run. Completion is a
   * no-op for these on purpose: a gap means a mislabelled section_ref, and
   * merging across it would put foreign text inside a cited § (ADR-032).
   */
  nonContiguous: string[];
  estTokens: number;
};

export type Retrieval = {
  expansion: Expansion;
  /**
   * The ranked TOP_K from match_chunks, untouched.
   *
   * Every eval figure that compares against a previous run reads THIS, not
   * `hits` — appending siblings would otherwise raise retrieval hit rate
   * mechanically without retrieval having improved (run.ts:443, ADR-032).
   */
  ranked: ChunkHit[];
  /** ranked, with each §'s contiguous run filled in. What the model is shown. */
  hits: ChunkHit[];
  jurisdictions: Jurisdiction[];
  /** The refusal signal: max cosine across the RANKED rows. 0 when empty. */
  topCosine: number;
  completion: Completion;
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

/**
 * The maximal run of consecutive ids containing `anchorId`.
 *
 * `ids` is every chunk id stored under one section_ref, ascending. A genuine
 * split § is emitted by the chunker as consecutive rows in a single pass, so a
 * gap is not a longer section — it is a second chunk wearing the same label.
 * Returning only the anchor's own run is what keeps a mislabelled stray out of
 * a cited excerpt.
 */
export function contiguousRun(ids: number[], anchorId: number): number[] {
  const i = ids.indexOf(anchorId);
  if (i === -1) return [anchorId];

  let lo = i;
  while (lo > 0 && ids[lo - 1] === ids[lo] - 1) lo--;
  let hi = i;
  while (hi < ids.length - 1 && ids[hi + 1] === ids[hi] + 1) hi++;

  return ids.slice(lo, hi + 1);
}

/**
 * Fills each ranked hit's § out to its whole contiguous run.
 *
 * Pure, so the behaviour is tested without a database or a model call.
 *
 * Anchors keep their relative order and each run is emitted in place of its
 * first anchor. That is load-bearing, not cosmetic: run.ts:465 maps chunks by
 * source_url with last-wins, so expanding in place keeps the final chunk for
 * any URL a chunk of the same § as before, and since the chunker prefixes every
 * part with its own § ref, citation validity cannot move for ordering reasons.
 * Appending siblings at the end would break that.
 */
export function completeSections(
  ranked: ChunkHit[],
  pool: ChunkHit[],
): { hits: ChunkHit[]; completion: Completion } {
  const byId = new Map(pool.map((c) => [c.id, c]));
  const idsByRef = new Map<string, number[]>();
  for (const c of pool) {
    if (!c.section_ref) continue;
    const ids = idsByRef.get(c.section_ref) ?? [];
    ids.push(c.id);
    idsByRef.set(c.section_ref, ids);
  }
  for (const ids of idsByRef.values()) ids.sort((a, b) => a - b);

  const nonContiguous = [...idsByRef.entries()]
    .filter(([, ids]) => ids.length > 1 && ids.some((v, i) => i > 0 && v !== ids[i - 1] + 1))
    .map(([ref]) => ref);

  const added: number[] = [];
  const budgetSkipped: string[] = [];
  const emitted = new Set<number>();
  const hits: ChunkHit[] = [];
  let budget = EXCERPT_TOKEN_BUDGET - estTokens(ranked);

  for (const anchor of ranked) {
    if (emitted.has(anchor.id)) continue;

    const ids = anchor.section_ref ? idsByRef.get(anchor.section_ref) : undefined;
    const run = ids ? contiguousRun(ids, anchor.id) : [anchor.id];
    const extras = run
      .filter((id) => id !== anchor.id && !emitted.has(id))
      .map((id) => byId.get(id))
      .filter((c): c is ChunkHit => Boolean(c));

    const cost = estTokens(extras);
    if (extras.length > 0 && cost > budget) {
      // The ranked hit is never dropped to make room — it is the brief's §4
      // guarantee. Only its completion is given up, and it is reported.
      if (anchor.section_ref) budgetSkipped.push(anchor.section_ref);
      hits.push(anchor);
      emitted.add(anchor.id);
      continue;
    }
    budget -= cost;

    for (const id of run) {
      const chunk = id === anchor.id ? anchor : byId.get(id);
      if (!chunk || emitted.has(id)) continue;
      hits.push(chunk);
      emitted.add(id);
      if (id !== anchor.id) added.push(id);
    }
  }

  return {
    hits,
    completion: { added, budgetSkipped, nonContiguous, estTokens: estTokens(hits) },
  };
}

export type RetrieveDeps = {
  embed?: (question: string) => Promise<number[]>;
  match?: typeof matchChunks;
  siblings?: typeof siblingsFor;
};

export type RetrieveOptions = {
  /**
   * Section completion (ADR-032). On by default: it is the product's behaviour.
   *
   * An eval run turns it off to isolate a change to the judge's context from a
   * change to the model's context. Two variables in one run cannot be
   * attributed, and the run that fixes a broken instrument must not also move
   * the thing being measured.
   */
  complete?: boolean;
};

export async function retrieve(
  question: string,
  profile: Pick<IntakeProfile, "bundesland">,
  deps: RetrieveDeps = {},
  options: RetrieveOptions = {},
): Promise<Retrieval> {
  const embed = deps.embed ?? embedQuestion;
  const match = deps.match ?? matchChunks;
  const siblings = deps.siblings ?? siblingsFor;

  const expansion = expandQuery(question);
  const jurisdictions = jurisdictionsFor(profile);

  const ranked = await match({
    queryEmbedding: await embed(expansion.original),
    queryText: expansion.lexicalQuery,
    filterJurisdictions: jurisdictions,
    matchCount: TOP_K,
  });

  // Section completion (ADR-032). One extra round-trip, no model call. A hit
  // with section_ref null is guidance HTML and has no §§ to complete, so an
  // empty ref list must short-circuit rather than query for nulls — that would
  // match every guidance chunk in the corpus.
  const sectionRefs = (options.complete ?? true)
    ? [...new Set(ranked.map((h) => h.section_ref).filter((r): r is string => Boolean(r)))]
    : [];
  const pool = sectionRefs.length
    ? await siblings({ sectionRefs, filterJurisdictions: jurisdictions })
    : [];
  const { hits, completion } = completeSections(ranked, pool);

  return {
    expansion,
    ranked,
    hits,
    jurisdictions,
    // RANKED, not hits: siblings carry cosine 0 and must not be able to move
    // the ADR-009 refusal threshold in either direction.
    topCosine: ranked.length ? Math.max(...ranked.map((h) => h.cosine)) : 0,
    completion,
  };
}
