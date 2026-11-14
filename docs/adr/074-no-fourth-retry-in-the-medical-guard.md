# ADR-074 — No fourth retry in the medical guard

**Date:** 2026-11-14 · **Status:** accepted · **Human ruling** · Closes the open item in ADR-067

## Context

ADR-067 left one question for Phase 7 hardening: whether `classifyMedical` should make a fourth
attempt with backoff. The Anthropic SDK already makes three (`maxRetries: 2` by default, with
connection errors retried), so this was never whether to retry but whether to retry *more*.

The guard sits on the product path at `app/api/ask/route.ts:151`, not only in the eval harness. Any
attempt added there is latency paid by every medical question a real user asks.

## Decision

**No fourth retry.** The guard keeps the SDK's three attempts and fails closed.

Reasoning, as ruled: the transport window that caused `2026-11-06-iter13-judge-v6-1` to lose four
rows outlasted all three attempts, so a fourth would not have saved them. It buys little while
adding latency on the one path where the user is already anxious and waiting. Failing closed fast
and deflecting is the better behaviour for that user.

Resilience belongs in the harness, not the product: `scripts/eval/run.ts` may retry at the **row**
level if it wants it, where latency costs nothing and the only consumer is a report.

## Alternatives

- **A fourth attempt with backoff.** Rejected: the observed failure window was longer than three
  attempts, so this trades certain latency for an unlikely save.
- **Raise `maxRetries` in the harness only.** Not rejected — explicitly left available, at the row
  level, as the place where retrying is free.
- **A typed error chain deciding retry policy per error code.** Still deferred. ADR-067 deferred it
  once; this ruling removes the reason to revisit it on the product path.

## Consequence

The medical deflection path's latency is bounded by three attempts. A transport window longer than
that produces a fail-closed deflection with the cause recorded (ADR-067), which is the designed
behaviour and not a regression. ADR-067's open item is closed; nothing in Phase 7 hardening needs
to revisit it.
