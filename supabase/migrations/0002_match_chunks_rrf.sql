-- 0002_match_chunks_rrf.sql
-- Replaces the weighted-sum hybrid from brief §3.
--
-- Why: the original scored 0.65 * cosine + 0.35 * ts_rank. Those two numbers live on
-- different scales. Cosine similarity lands in roughly 0.3-0.9 for real matches;
-- ts_rank is unnormalised and typically returns 0.02-0.30. The keyword half therefore
-- contributed a few percent of the final score no matter what weight it was given,
-- and the refusal threshold (0.55) was being applied to a composite number whose
-- meaning changed with every query. Reciprocal rank fusion combines the two by rank
-- instead of by value, which is scale-free and needs no tuning.
--
-- This function also returns the raw per-retriever signals so that (a) the refusal
-- threshold can be set on cosine, which IS comparable across queries, and (b) the
-- eval harness can attribute a retrieval miss to the vector half or the lexical half.

drop function if exists match_chunks(vector, text, text[], int);

create or replace function match_chunks(
  query_embedding  vector(1024),   -- embed the ORIGINAL English question
  query_text       text,           -- the GERMAN-EXPANDED string from lib/rag/expand.ts
  filter_jurisdictions text[],
  match_count      int default 8,
  rrf_k            int default 60, -- standard RRF damping; do not tune before Run #3
  candidate_pool   int default 50  -- per-retriever depth before fusion
)
returns table (
  id            bigint,
  content       text,
  section_ref   text,
  doc_title     text,
  source_url    text,
  valid_from    date,
  retrieved_at  timestamptz,
  corpus_version text,
  cosine        float,   -- refusal signal: use the max of this across returned rows
  fts_rank      float,
  vec_pos       int,     -- rank in the vector retriever, null if it did not surface
  fts_pos       int,     -- rank in the lexical retriever, null if it did not surface
  rrf           float    -- fused score, for ordering only — never threshold on this
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with vec as (
    select c.id,
           1 - (c.embedding <=> query_embedding) as cosine,
           row_number() over (order by c.embedding <=> query_embedding) as pos
    from corpus_chunks c
    where c.jurisdiction = any(filter_jurisdictions)
    order by c.embedding <=> query_embedding
    limit candidate_pool
  ),
  kw as (
    select c.id,
           ts_rank(c.fts, websearch_to_tsquery('german', query_text)) as fts_rank,
           row_number() over (
             order by ts_rank(c.fts, websearch_to_tsquery('german', query_text)) desc
           ) as pos
    from corpus_chunks c
    where c.jurisdiction = any(filter_jurisdictions)
      and c.fts @@ websearch_to_tsquery('german', query_text)
    limit candidate_pool
  ),
  fused as (
    select coalesce(v.id, k.id)                          as id,
           coalesce(v.cosine, 0)                         as cosine,
           coalesce(k.fts_rank, 0)                       as fts_rank,
           v.pos::int                                    as vec_pos,
           k.pos::int                                    as fts_pos,
           coalesce(1.0 / (rrf_k + v.pos), 0)
         + coalesce(1.0 / (rrf_k + k.pos), 0)            as rrf
    from vec v
    full outer join kw k on v.id = k.id
  )
  select c.id, c.content, c.section_ref, c.doc_title, c.source_url,
         c.valid_from, c.retrieved_at, c.corpus_version,
         f.cosine, f.fts_rank, f.vec_pos, f.fts_pos, f.rrf
  from fused f
  join corpus_chunks c on c.id = f.id
  order by f.rrf desc, f.cosine desc
  limit match_count;
$$;

revoke all on function match_chunks(vector, text, text[], int, int, int) from public, anon, authenticated;

-- Calibration helper. Run this over the 30 ANSWER rows of the golden set BEFORE
-- picking a refusal threshold, and over the 8 REFUSE rows after. The threshold is
-- whatever separates the two distributions — it is measured, not chosen.
--
--   select id, section_ref, cosine, vec_pos, fts_pos, rrf
--   from match_chunks(:emb, :expanded_query, array['federal','hesse'], 20);
