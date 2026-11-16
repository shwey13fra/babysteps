// Verify the /api/ask rate limit and kill switch against a running origin.
//
//   npx tsx scripts/security/rate-limit-check.ts --kill-switch
//   npx tsx scripts/security/rate-limit-check.ts --limit --yes [--url https://…] [--n 25]
//
// brief §4: "rate limits verified with a script". A limit nobody has watched
// trigger is a limit nobody knows the shape of — and this one guards an LLM
// endpoint, which §4 calls an open wallet.
//
// ────────────────────────────────────────────────────────────────────────────
// WHY --limit COSTS MONEY, AND HOW LITTLE
//
// The route's order is: validate → rate limit → medical guard → retrieve →
// generate (app/api/ask/route.ts:3). A request that is REFUSED by the limiter
// costs nothing, because the limiter sits in front of every model call. But the
// requests that are ALLOWED must be real, or they would not consume a token,
// and each one then continues into the route.
//
// So the probe sends an unmistakably medical question. That takes the cheapest
// path through a successful request: the guard classifies it, the route
// deflects, and it returns BEFORE embedding, retrieval or generation. One small
// classifier call per allowed request, and nothing after it.
//
// Roughly: 20 allowed requests × one classifier call. Cents, not dollars — but
// it is real spend on someone's key, so --limit refuses to run without --yes.
//
// --kill-switch is free. ASK_DISABLED is checked before anything else in the
// route, so that mode never reaches a model at all.
// ────────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const has = (flag: string) => args.includes(flag);
function value(flag: string, fallback: string): string {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const ORIGIN = value("--url", "http://localhost:3000").replace(/\/$/, "");
const N = Number(value("--n", "25"));

/** The documented limit in app/api/ask/route.ts. Change both together. */
const EXPECTED_LIMIT = 20;

/**
 * Unmistakably medical, so the guard deflects and the request stops before
 * retrieval. Not a trick: this is a question the product is designed to refuse,
 * and refusing it is the cheap path.
 */
const MEDICAL_QUESTION = "I have sharp abdominal pain and bleeding at 30 weeks, what should I do?";

const PROFILE = {
  due_date: "2027-06-01",
  bundesland: "hessen",
  city: "Frankfurt am Main",
  employment_status: "employed",
  insurance: "gkv",
  nationalities: ["India", "India"],
  marital_status: "married",
  first_child: true,
};

type Result = { n: number; status: number; error?: string; message?: string };

async function ask(): Promise<Result> {
  const res = await fetch(`${ORIGIN}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: MEDICAL_QUESTION, profile: PROFILE }),
  });
  let body: Record<string, unknown> = {};
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    /* a non-JSON body is itself the finding */
  }
  return {
    n: 0,
    status: res.status,
    error: typeof body.error === "string" ? body.error : undefined,
    message: typeof body.message === "string" ? body.message : undefined,
  };
}

async function killSwitch() {
  console.log(`\nKILL SWITCH — ${ORIGIN}\n`);
  const r = await ask();
  const disabled = r.status === 503 && r.error === "maintenance";

  if (disabled) {
    console.log(`  PASS  503 maintenance — ASK_DISABLED is engaged on this origin.`);
    console.log(`        message: ${r.message}`);
  } else {
    console.log(`  Origin is LIVE (status ${r.status}, error ${r.error ?? "none"}).`);
    console.log(`  To verify the switch, set ASK_DISABLED=1 on this origin and re-run.`);
    console.log(`  This is not a failure — it is the expected reading of a serving origin.`);
  }
  // Note: this mode sends ONE request, which on a live origin consumes one
  // token of that IP's daily allowance. Stated so the number is never a
  // surprise when --limit runs next.
}

async function limitLoop() {
  if (!has("--yes")) {
    console.error(
      "\n--limit spends money: roughly 20 medical-guard classifier calls.\n" +
        "Re-run with --yes once you have read the cost note at the top of this file.\n",
    );
    process.exit(1);
  }

  console.log(`\nRATE LIMIT — ${ORIGIN}, ${N} sequential requests, expecting ${EXPECTED_LIMIT}/day\n`);

  const results: Result[] = [];
  let firstRejected: number | null = null;

  for (let i = 1; i <= N; i++) {
    const r = await ask();
    r.n = i;
    results.push(r);
    if (r.status === 429 && firstRejected === null) firstRejected = i;
    const tag = r.status === 429 ? "REJECTED" : r.status === 200 ? "allowed" : `status ${r.status}`;
    console.log(`  ${String(i).padStart(3)}  ${String(r.status).padStart(3)}  ${tag}${r.error ? `  (${r.error})` : ""}`);

    // A limiter that has already started rejecting will keep rejecting; there
    // is nothing further to learn and each extra request is noise in someone's
    // logs. Three past the edge is enough to show it is not a one-off.
    if (firstRejected !== null && i >= firstRejected + 2) break;
  }

  const allowed = results.filter((r) => r.status !== 429).length;
  const rejected = results.filter((r) => r.status === 429);

  console.log("\n  ── findings ──");
  console.log(`  allowed before first rejection : ${firstRejected === null ? allowed : firstRejected - 1}`);
  console.log(`  first 429 at request           : ${firstRejected ?? "never"}`);

  if (firstRejected === null) {
    console.log(`\n  FAIL  No 429 in ${N} requests. The endpoint is unmetered on this origin.`);
    console.log(`        Check UPSTASH_REDIS_REST_URL / _TOKEN. In production a missing`);
    console.log(`        credential should produce 503, never an open endpoint.`);
    process.exit(1);
  }

  // The rejection body must be honest and must not leak internals.
  const sample = rejected[0];
  const bodyOk = sample.error === "rate_limited" && !!sample.message;
  console.log(`  429 body carries error+message : ${bodyOk ? "yes" : "NO"}`);
  if (sample.message) console.log(`  message                        : ${sample.message}`);

  const atExpected = firstRejected === EXPECTED_LIMIT + 1;
  console.log(
    `\n  ${atExpected ? "PASS" : "CHECK"}  limit observed at ${firstRejected - 1} allowed` +
      `${atExpected ? "" : `, expected ${EXPECTED_LIMIT} — reconcile with route.ts before accepting`}`,
  );
  if (!bodyOk) process.exit(1);
}

async function main() {
  if (has("--kill-switch")) return killSwitch();
  if (has("--limit")) return limitLoop();
  console.log(
    "\nUsage:\n" +
      "  --kill-switch              free; expects 503 maintenance when ASK_DISABLED=1\n" +
      "  --limit --yes [--n 25]     spends ~20 classifier calls; expects a 429\n" +
      "  --url <origin>             default http://localhost:3000\n",
  );
}

main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});

// Makes this file a MODULE, which gives it its own top-level scope.
//
// Not cosmetic. Neither security script imports anything, so TypeScript treated
// both as global scripts sharing one scope — and both declare `args`, `ORIGIN`,
// `PROFILE` and a `main`. `npm run build` failed with eight TS2451/TS2393
// errors from 2026-11-16 (shipped in eff7260) and nobody saw it on Vercel,
// because .vercelignore drops /scripts/ and the collision cannot exist there.
// Broken here, fine in production — the mirror image of ADR-083.
export {};
