// POST /api/ask — the guarded answer path.
//
//   validate -> rate limit -> medical guard -> expand -> retrieve -> generate
//
// Order is deliberate. Validation is free, so it runs first. The rate limit
// runs before the guard because the guard is a paid model call, and brief §4
// calls an unguarded LLM endpoint an open wallet. The medical guard runs before
// expansion, embedding and retrieval, so a clinical question never reaches the
// corpus or any provider.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { z } from "zod";
import { generate } from "@/lib/rag/generate";
import {
  classifyMedical,
  deflect,
  isLowConfidence,
  refuse,
  REFUSAL_MIN_TOP_COSINE,
} from "@/lib/rag/guards";
import { retrieve } from "@/lib/rag/retrieve";
import { Answer, IntakeProfile } from "@/lib/schemas";

/** Brief §4: reject oversized payloads. 8 000 characters is the cap. */
const MAX_QUESTION_CHARS = 8_000;

const AskRequest = z.object({
  question: z.string().min(1).max(MAX_QUESTION_CHARS),
  profile: IntakeProfile,
});

const MAINTENANCE_MESSAGE =
  "Questions are switched off for a moment while we check a source. Your timeline is unaffected and still works.";

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

type Limiter = { check: (key: string) => Promise<boolean> };

let cachedLimiter: Limiter | null | undefined;

/** Per-IP daily counters, in-memory. Dev only — see limiter(). */
const memoryWindows = new Map<string, { count: number; resetAt: number }>();

function memoryLimiter(): Limiter {
  const WINDOW_MS = 24 * 60 * 60 * 1000;
  return {
    check: async (key: string) => {
      const now = Date.now();
      const current = memoryWindows.get(key);
      if (!current || current.resetAt <= now) {
        memoryWindows.set(key, { count: 1, resetAt: now + WINDOW_MS });
        return true;
      }
      current.count += 1;
      return current.count <= 20;
    },
  };
}

/**
 * Upstash when it is configured. Without it: in development, an in-memory
 * limiter so the limit is still exercised locally; in production, null, which
 * the route treats as a hard stop.
 *
 * Failing closed in production is the point. A missing credential must not
 * silently turn a metered endpoint into an unmetered one.
 */
function limiter(): Limiter | null {
  if (cachedLimiter !== undefined) return cachedLimiter;

  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const ratelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(20, "1 d"),
      prefix: "babysteps:ask",
      analytics: false,
    });
    cachedLimiter = { check: async (key: string) => (await ratelimit.limit(key)).success };
  } else if (process.env.NODE_ENV !== "production") {
    cachedLimiter = memoryLimiter();
  } else {
    cachedLimiter = null;
  }
  return cachedLimiter;
}

/**
 * Next 16 route handlers have no request.ip. x-forwarded-for is set by the
 * platform edge; its first entry is the client.
 */
function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

/**
 * Every 200 response body is validated against the Answer contract before it
 * leaves (rule 8). Non-200s are transport errors and carry an error object
 * instead — they are not answers.
 */
function answered(answer: Answer): NextResponse {
  const parsed = Answer.safeParse(answer);
  if (!parsed.success) {
    return NextResponse.json({ error: "contract_violation" }, { status: 500 });
  }
  return NextResponse.json(parsed.data, { status: 200 });
}

export async function POST(request: NextRequest) {
  if (process.env.ASK_DISABLED === "1") {
    return NextResponse.json({ error: "maintenance", message: MAINTENANCE_MESSAGE }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = AskRequest.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }
  const { question, profile } = parsed.data;

  const rate = limiter();
  if (!rate) {
    return NextResponse.json({ error: "maintenance", message: MAINTENANCE_MESSAGE }, { status: 503 });
  }
  if (!(await rate.check(clientIp(request)))) {
    return NextResponse.json(
      { error: "rate_limited", message: "That is as many questions as we can answer for you today. The limit resets after a day." },
      { status: 429 },
    );
  }

  // Before expansion, before embedding, before retrieval.
  const verdict = await classifyMedical(question);
  if (verdict.medical) return answered(deflect(verdict));

  let retrieval;
  try {
    retrieval = await retrieve(question, profile);
  } catch {
    // Retrieval threw: Supabase or the embedding call is down. That is an
    // outage, not a weak corpus, and it gets its own reason. ADR-022.
    return answered(refuse("unavailable"));
  }

  // RANKED, not hits: completion siblings carry cosine 0 (ADR-032), and the
  // refusal threshold is calibrated against ranked cosine (ADR-009).
  if (isLowConfidence(retrieval.ranked, REFUSAL_MIN_TOP_COSINE)) {
    return answered(refuse("low_confidence"));
  }

  return answered(await generate(question, retrieval));
}
