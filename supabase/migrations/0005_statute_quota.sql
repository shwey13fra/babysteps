-- 0005_statute_quota.sql
-- Statute was being crowded out of retrieval by explanatory text.
--
-- After the HTML sources landed the corpus became 79% explanatory (532 of 673 chunks).
-- familienportal's plain-language pages match a conversational question far better than
-- dense statutory German, so the statute lost every probe it had previously won.
-- Measured 2026-10-22 against the live corpus, rank of the correct § in a top-50:
--
--   query                                        141 chunks   673 chunks   statute in top-10
--   "Elterngeld rückwirkend"          BEEG §7         #1          #4            1/10
--   "Kündigung schwanger"             MuSchG §17      #1          #5            3/10
--   "parental allowance after birth"  BEEG §7         #3         #15            0/10
--
-- This is not a ranking nicety. CLAUDE.md rule 8 requires a citation on every answer and
-- ADR-012/013 exist so legal claims cite the statute. A retriever that never surfaces
-- BEEG §7 produces answers citing familienportal's summary OF BEEG §7 - second-hand
-- sourcing wearing a citation's clothes. The prompt cannot cite what retrieval never
-- returned, so this has to be fixed in retrieval.
--
-- Fix: rank the two kinds in separate pools and let RRF fuse them. The best statute chunk
-- and the best explanatory chunk both enter fusion at rank 1, so neither can be crowded
-- out by sheer volume of the other. Each pool keeps its own index-using ORDER BY ... LIMIT,
-- so the HNSW and GIN indexes are still used.

alter table corpus_chunks
  add column if not exists source_kind text not null default 'guidance'
    check (source_kind in ('statute', 'guidance'));

-- Backfill: statute chunks are exactly those carrying a § reference.
update corpus_chunks
   set source_kind = case when section_ref is not null then 'statute' else 'guidance' end;

create index if not exists corpus_chunks_source_kind_idx on corpus_chunks (source_kind);

-- Same signature and same return shape as 0004, so this replaces it in place and no
-- caller changes. source_kind is deliberately NOT returned: adding a column would force a
-- DROP, and callers that need it can select it by id.
create or replace function match_chunks(
  query_embedding  vector(1024),
  query_text       text,
  filter_jurisdictions text[],
  match_count      int default 8,
  rrf_k            int default 60,
  candidate_pool   int default 50
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
  cosine        float,
  fts_rank      float,
  vec_pos       int,
  fts_pos       int,
  rrf           float
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with vec_statute as (
    select c.id, c.source_kind, 1 - (c.embedding <=> query_embedding) as cosine
    from corpus_chunks c
    where c.jurisdiction = any(filter_jurisdictions) and c.source_kind = 'statute'
    order by c.embedding <=> query_embedding
    limit candidate_pool
  ),
  vec_guidance as (
    select c.id, c.source_kind, 1 - (c.embedding <=> query_embedding) as cosine
    from corpus_chunks c
    where c.jurisdiction = any(filter_jurisdictions) and c.source_kind = 'guidance'
    order by c.embedding <=> query_embedding
    limit candidate_pool
  ),
  vec as (
    select id, cosine,
           row_number() over (partition by source_kind order by cosine desc)::int as pos
    from (select * from vec_statute union all select * from vec_guidance) v
  ),
  kw_statute as (
    select c.id, c.source_kind, ts_rank(c.fts, or_tsquery(query_text)) as fts_rank
    from corpus_chunks c
    where c.jurisdiction = any(filter_jurisdictions) and c.source_kind = 'statute'
      and c.fts @@ or_tsquery(query_text)
    order by ts_rank(c.fts, or_tsquery(query_text)) desc
    limit candidate_pool
  ),
  kw_guidance as (
    select c.id, c.source_kind, ts_rank(c.fts, or_tsquery(query_text)) as fts_rank
    from corpus_chunks c
    where c.jurisdiction = any(filter_jurisdictions) and c.source_kind = 'guidance'
      and c.fts @@ or_tsquery(query_text)
    order by ts_rank(c.fts, or_tsquery(query_text)) desc
    limit candidate_pool
  ),
  kw as (
    select id, fts_rank,
           row_number() over (partition by source_kind order by fts_rank desc)::int as pos
    from (select * from kw_statute union all select * from kw_guidance) k
  ),
  fused as (
    select coalesce(v.id, k.id)                          as id,
           coalesce(v.cosine, 0)                         as cosine,
           coalesce(k.fts_rank, 0)                       as fts_rank,
           v.pos                                         as vec_pos,
           k.pos                                         as fts_pos,
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
grant execute on function match_chunks(vector, text, text[], int, int, int) to service_role;
