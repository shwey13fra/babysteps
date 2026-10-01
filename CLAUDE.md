# Project: BabySteps Germany

Deterministic dual-track deadline timeline (German administrative + Indian consular) for expat
parents, plus a RAG answer layer grounded only in cited official sources. Hesse/Berlin, GKV, India.

## Reference documents

Read the relevant document. Never infer its contents.

| Document | Authoritative for |
| --- | --- |
| `PRD-BabySteps-Germany-v1.0.docx` | Scope: features, MoSCoW, priorities, metrics, what is out |
| `babysteps-build-brief-v2-vercel-supabase.md` | Architecture, repo structure, SQL schema, security spec |
| `docs/design-system.md` | Design: colour, type, layout, components, motion, voice |
| `docs/legal-compliance-pack.md` | Legal: Impressum, GDPR, RDG/StBerG boundaries, disclaimer |
| `babysteps-execution-playbook-v1.1.md` | Phase order, per-phase prompts, VERIFY gates |
| `docs/f2b-birth-event-and-rules-addendum.md` | Rule-file schema, birth event, the twelve rules |

On conflict: PRD wins on scope, brief wins on architecture, playbook wins on build order.

The PRD, brief and playbook are present locally but NOT committed while this repo is public.
They join the repo when it goes private, or at Phase 7. Ask me for them if they are missing.

## Non-negotiable working rules

1. SCOPE LOCK: Implement ONLY what the current instruction asks. If you believe any change outside
   that scope is necessary (renaming files, adding dependencies, altering schemas, refactoring,
   changing configs, touching another module), STOP and ask me first, stating what and why.
   This applies even to "obvious improvements."
2. PLAN FIRST: Before writing any code in a session, present a short plan (files to create/change,
   approach, edge cases). Wait for my approval.
3. NO SILENT FIXES: If a test fails or a type error appears, tell me what broke and your proposed
   fix before applying it, unless the fix is a typo in code you wrote this session.
4. THE LLM NEVER COMPUTES DATES. All timeline dates come from lib/timeline (pure TypeScript).
5. Dependencies allowed without asking: next, react, zod, yaml, @anthropic-ai/sdk,
   @supabase/supabase-js, @upstash/ratelimit, @upstash/redis, resend, ics, vitest, tsx,
   cheerio, pdf-parse. ANYTHING else: ask first.
6. Prompts live in lib/prompts/ as versioned files (answer.v1.md, guard.v1.md). Never inline.
7. Never import the Supabase service-role client into any client component or file reachable
   from the client bundle.
8. Every /api/ask response must satisfy the zod Answer contract; the UI never renders an
   'answered' response without at least one citation.
9. After completing a task, run the relevant tests/typecheck and show me the results before
   declaring it done. End every task summary with: "Changes outside discussed scope: NONE" or
   an explicit list.
10. Conventional commits at green checkpoints only (feat:, fix:, test:, docs:, chore:).
11. Every non-obvious decision gets docs/adr/NNN-title.md (context, decision, alternatives,
    consequence) — max 15 lines.
12. DEADLINE HONESTY: a deadline whose rule file says kind: soft or advisory must never be
    described anywhere — UI, answer, e-mail — as a legal or statutory deadline.
13. NO INDIVIDUAL CASE ASSESSMENT: never state, predict or imply this user's entitlement,
    eligibility, amount, or the outcome of their application, and never calculate an amount
    they would receive. State the rule, then name the authority that decides. (RDG / StBerG —
    see docs/legal-compliance-pack.md §3.)
14. German terms and their English glosses come from data/glossary.de-en.yaml. Never invent a
    gloss inline; if a term is missing, add it to the glossary and say so.
15. Never commit a secret, a fetched corpus file, or any real person's contact details.

## Commands

| Task | Command | Status |
| --- | --- | --- |
| Typecheck | `npx tsc --noEmit` | TBD — Phase 1 |
| Run tests | `npx vitest run` | TBD — Phase 1 |
| Single test file | `npx vitest run tests/<name>.test.ts` | TBD — Phase 1 |
| Lint | TBD | TBD — Phase 1 |
| Dev server | `npm run dev` | TBD — Phase 1 |
| Run ingestion | `npx tsx scripts/ingest/push.ts` | TBD — Phase 2 |
| Inspect corpus | `npx tsx scripts/ingest/query.ts "<query>"` | TBD — Phase 2 |
| Calibrate refusal threshold | `npx tsx scripts/eval/calibrate.ts` | TBD — Phase 3 |
| Run eval | `npx tsx scripts/eval/run.ts` | TBD — Phase 4 |

Nothing is runnable yet: there is no package.json until Phase 1. Replace each TBD with the real
command in the phase that creates it, and correct any command above that turns out wrong.

## Repo map

| Path | Contents |
| --- | --- |
| `app/` | Next.js App Router: routes and API handlers. Phase 1+ |
| `lib/` | `timeline/` engine, `rag/`, `prompts/`, `schemas.ts`, `supabase/` clients |
| `data/` | `rules/*.yaml`, `glossary.de-en.yaml`, `golden/`, `corpus_manifest.yaml` |
| `data/raw/`, `data/cache/` | Fetched corpus payload. Gitignored, never committed |
| `scripts/` | Local `tsx` scripts: `ingest/`, `eval/`. Never run in production |
| `supabase/` | `migrations/*.sql` (schema is code), `seed.sql` |
| `docs/` | Design system, legal pack, addendum, `mockup.html`, `adr/` |
| `eval/` | `reports/*.md`, committed including failing runs |
| `tests/` | Vitest. Timeline engine covered exhaustively |

## Never do

- Never commit a secret, a key, or a database connection string.
- Never commit anything under `data/raw/` or `data/cache/`.
- Never commit a real person's name, e-mail or contact details — beta lists stay out of the repo.
- Never hard-code the Impressum address. It renders from `IMPRESSUM_*` env vars. Once the repo is
  public that address is permanent, and unlike a key it cannot be rotated.
- Never add a `NEXT_PUBLIC_` prefix to anything except the Supabase URL and the anon key.
- Never fetch a font, script or style from a Google domain. Self-host via `next/font/local`.
