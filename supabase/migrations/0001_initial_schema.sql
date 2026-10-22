-- 0001_initial_schema.sql
-- Brief §3 verbatim. vector(1024) per ADR-007: text-embedding-3-small is called with
-- dimensions: 1024, so the brief's "1536 - then change the column" note does not apply.
--
-- The weighted-sum match_chunks below is SUPERSEDED by 0002_match_chunks_rrf.sql and is
-- kept here deliberately: migration history should record what was replaced, and 0002's
-- `drop function if exists match_chunks(vector, text, text[], int)` needs this exact
-- signature to drop. Apply 0001 before 0002 or both functions end up live.

create extension if not exists vector;

create table corpus_chunks (
  id bigint generated always as identity primary key,
  content text not null,
  embedding vector(1024),                  -- match your embedding model dim
  fts tsvector generated always as (to_tsvector('german', content)) stored,
  source_url text not null,
  doc_title text not null,
  section_ref text,                        -- e.g. 'BEEG §7(1)'
  jurisdiction text not null check (jurisdiction in ('federal','hesse','berlin','consular-india')),
  track text not null check (track in ('german','consular')),
  valid_from date,
  retrieved_at timestamptz not null,
  corpus_version text not null             -- e.g. '2026-07'
);
create index on corpus_chunks using hnsw (embedding vector_cosine_ops);
create index on corpus_chunks using gin (fts);

create table eval_runs (
  id bigint generated always as identity primary key,
  run_at timestamptz default now(),
  git_sha text, corpus_version text,
  scores jsonb not null,                   -- per-category + per-case results
  notes text
);

create table reminder_subscriptions (
  id uuid default gen_random_uuid() primary key,
  email text not null,
  profile jsonb not null,                  -- intake answers, no name ever
  confirmed_at timestamptz,                -- double opt-in
  unsubscribe_token uuid default gen_random_uuid(),
  created_at timestamptz default now()
);

alter table corpus_chunks enable row level security;
alter table eval_runs enable row level security;
alter table reminder_subscriptions enable row level security;
-- NO policies for anon/authenticated: anon key can read nothing.
-- All access via security definer RPCs called with the service-role key server-side.

create or replace function match_chunks(
  query_embedding vector(1024), query_text text,
  filter_jurisdictions text[], match_count int default 8
) returns table (id bigint, content text, section_ref text, doc_title text,
                 source_url text, valid_from date, score float)
language sql stable security definer as $$
  select c.id, c.content, c.section_ref, c.doc_title, c.source_url, c.valid_from,
         (0.65 * (1 - (c.embedding <=> query_embedding))
        + 0.35 * ts_rank(c.fts, plainto_tsquery('german', query_text))) as score
  from corpus_chunks c
  where c.jurisdiction = any(filter_jurisdictions)
  order by score desc limit match_count;
$$;
