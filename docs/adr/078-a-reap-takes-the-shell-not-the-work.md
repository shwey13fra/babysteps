# ADR-078 — A reap takes the shell, not the work

**Date:** 2026-11-15 · **Status:** accepted · **Human ruling:** treat the reaps as an operating
condition, with the same framing as API credit exhaustion

## Context

Host memory pressure reaps the background shell wrapper. It has happened five times across this
project, three of them on 2026-11-15 alone. The ruling was to stop logging each one as a surprise
and write down what the harness should assume.

**The premise this ADR was commissioned on is wrong, and the correction is the finding.** The brief
said a reap *"has already cost us an eval run at row 16 and $1.2."* It did not. `knowledge/past-
mistakes.md:696` records that run: the shell died at row 16 of 48, the `npx tsx` child **survived,
finished all 48 rows** and wrote `2026-11-03-variance-3.{md,json}`. The true cost was **$3.62 spent
and nothing lost**. The `$1.2` was a figure I invented and quoted into a budget statement and a
commit message. The same thing happened again on 2026-11-04 (`past-mistakes.md:786`): reaped at
row 44, I declared it dead on a 25-minute-stale log, deleted the log, wrote a false ledger entry —
and the child finished four minutes later.

**The score is therefore 5 reaps, 0 processes killed, 0 runs lost, and 2 false loss reports.** Today
was the third confirmation in a row: PIDs 22064, 1712 and 29712 each outlived the shell that
spawned it and kept serving HTTP 200.

## Decision

**A reap is a loss of observability, not of work.** Engineer against the thing that actually
breaks — the output pipe — and never against the thing that has never broken.

1. **Long-running work is started with its output redirected to a file**, not to a shell pipe.
   `nohup <cmd> >> <logfile> 2>&1 &`. The process writes to the file descriptor directly, so the
   log outlives the wrapper. Done for the dev server this session; it is now the default shape.
2. **No checkpointing or resume is added to the eval runner.** On the evidence it would be
   protection against a failure that has not once occurred, and the exposure if it ever did is
   already bounded: `--only A-08,R-05` re-buys individual rows at ~$0.07 each. Speculative
   machinery on the one path that spends real money is the worse trade.
3. **Never declare background work lost from a process event or a stale log.** Both are evidence
   about the shell and its buffer. The only evidence is the artefact: `ls` the output path the work
   would have written, and if it is absent, **wait and look again** — a `process.stdout.write`
   progress line with no newline does not flush, so two quick looks are one look repeated.
4. **A reap is reported as a reap, with the PID checked.** `netstat -ano | grep :<port>` or the
   artefact path — not an assumption in either direction.

## Alternatives rejected

- **Per-row JSONL checkpointing in `scripts/eval/run.ts` with a `--resume <label>` flag.** The
  honest case for it is that the runner writes its report only at the end (`run.ts:1570`), so a
  genuine death mid-run would lose up to $3.07. The case against is point 2 above, and that a
  resume path reading a half-written file is itself a fail-open risk of the kind this project has
  now caught four times. **Revisit the moment a run is actually lost** — one real loss is a better
  argument than five near misses that were not misses.
- **Checkpointing `embed.ts`.** It writes `embedded.json` once at the end (`embed.ts:103`), so a
  true death discards that run's embeddings. It already resumes by `content_hash` on the next run,
  and the spend is cents — ADR-044's 13 embeddings cost $0.0001. Not worth code.

## What in Phase 7 is actually at risk

**Nothing on the current plan.** Stages A–G are code plus a ~$0.15 production smoke; no ingestion
and no eval baseline are scheduled (`knowledge/plans/2026-11-14-phase-7-plan.md`). Two latent
exposures, recorded so they are not rediscovered:

- **`push.ts` is the one genuinely non-idempotent step.** There is no natural unique key in
  `corpus_chunks`, so an interrupted push leaves partial rows that only `--replace` cleans up.
  If the corpus is ever re-pushed, that is the step to run attended.
- **`fetch.ts` writes its cache once at the end** (`fetch.ts:144`), so an interruption refetches
  files already on disk. Costs bandwidth, nothing else.

## Consequence

Output survives the wrapper, so a device check interrupted by a reap can still be debugged — which
is the concrete reason this came up, with ADR-077 resting on being able to read a calendar
rejection. The eval runner stays simple. And the standing instruction is the one that has cost us
twice: **the artefact is the evidence, the notification is not.**
