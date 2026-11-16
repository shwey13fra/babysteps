// Stage E — verify a deployed origin from the outside.
//
//   npx tsx scripts/security/deploy-smoke.ts --url https://babysteps-germany.vercel.app
//
// Everything here is free: no model call, no database write. The paid
// rate-limit loop lives in ./rate-limit-check.ts and is run separately.
//
// WHY FROM THE OUTSIDE. Every check below could be "verified" by reading a
// dashboard or a config file, and three times this week that would have given
// the wrong answer — the dev server that returned 200 and hydrated nothing
// (ADR-081), the database whose subdomain had been withdrawn from DNS
// (ADR-076), and the .vercelignore that deleted the database client on a
// machine we never see. A response is evidence. A setting is an intention.

type Check = { name: string; ok: boolean; detail: string; critical: boolean };

const results: Check[] = [];
function record(name: string, ok: boolean, detail: string, critical = true) {
  results.push({ name, ok, detail, critical });
}

const args = process.argv.slice(2);
const i = args.indexOf("--url");
const ORIGIN = (i >= 0 && args[i + 1] ? args[i + 1] : "").replace(/\/$/, "");
if (!ORIGIN) {
  console.error("\nUsage: npx tsx scripts/security/deploy-smoke.ts --url https://<host>\n");
  process.exit(1);
}

/** Every header brief §4 and ADR-082 require, with what counts as correct. */
const REQUIRED_HEADERS: Array<[string, RegExp]> = [
  ["content-security-policy", /default-src 'self'/],
  ["strict-transport-security", /max-age=\d{7,}/],
  ["x-content-type-options", /nosniff/],
  ["x-frame-options", /DENY/i],
  ["referrer-policy", /strict-origin-when-cross-origin/],
  ["permissions-policy", /geolocation=\(\)/],
  ["cross-origin-opener-policy", /same-origin/],
  ["cross-origin-resource-policy", /same-origin/],
  ["x-dns-prefetch-control", /off/i],
  ["x-robots-tag", /noindex/],
];

const PAGE_ROUTES = [
  "/",
  "/how-it-works",
  "/intake",
  "/timeline",
  "/birth",
  "/ask",
  "/impressum",
  "/datenschutz",
  "/item/standesamt_birth_registration",
];

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

async function main() {
  console.log(`\nStage E smoke — ${ORIGIN}\n`);

  // 1. Is it even public? A protected deployment answers with a login page,
  //    and every check after this would be measuring Vercel's auth screen.
  const root = await fetch(`${ORIGIN}/`, { redirect: "manual" });
  const rootBody = await root.text();
  const walled =
    root.status === 401 ||
    /vercel.*authentication|_vercel\/sso|Authentication Required/i.test(rootBody);
  record(
    "production is publicly reachable",
    root.status === 200 && !walled,
    `status ${root.status}${walled ? " — LOGIN WALL: families cannot open this" : ""}`,
  );
  if (walled) {
    report();
    return;
  }

  // 2. The function region, read from Vercel's own response header rather than
  //    from the dashboard. x-vercel-id is prefixed with the region that served
  //    the request. The brief requires fra1; /datenschutz states it as fact.
  const api = await fetch(`${ORIGIN}/api/timeline`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(PROFILE),
  });
  const vercelId = api.headers.get("x-vercel-id") ?? "";
  const region = vercelId.split("::")[0] || "(unknown)";
  record(
    "functions execute in fra1",
    region.startsWith("fra1"),
    `x-vercel-id reports "${region}" — /datenschutz states Frankfurt as fact`,
  );

  // 3. The engine path works and needs no database (ADR-076).
  const timeline = api.ok ? ((await api.json()) as { items?: unknown[] }) : null;
  record(
    "POST /api/timeline returns a timeline",
    api.status === 200 && Array.isArray(timeline?.items) && timeline!.items!.length > 0,
    `status ${api.status}, ${timeline?.items?.length ?? 0} items`,
  );

  // 4. Headers on every page route.
  for (const route of PAGE_ROUTES) {
    const res = await fetch(`${ORIGIN}${route}`);
    const missing = REQUIRED_HEADERS.filter(([h, re]) => !re.test(res.headers.get(h) ?? ""));
    record(
      `headers on ${route}`,
      res.status === 200 && missing.length === 0,
      res.status !== 200
        ? `status ${res.status}`
        : missing.length
          ? `missing/wrong: ${missing.map(([h]) => h).join(", ")}`
          : `all ${REQUIRED_HEADERS.length} present`,
    );

    // 5. No cookies, anywhere. /datenschutz claims this in writing.
    const cookie = res.headers.get("set-cookie");
    record(`no cookie on ${route}`, !cookie, cookie ? `Set-Cookie: ${cookie}` : "none");
  }

  // 6. The development surface must not exist in production.
  const dev = await fetch(`${ORIGIN}/dev/timeline`);
  record("/dev/timeline is 404", dev.status === 404, `status ${dev.status}`);

  // 7. The Impressum must render real details, not the not-configured notice.
  //    DDG §5 is the most commonly enforced obligation in German web law, and a
  //    page that renders the fallback looks fine until someone reads it.
  const imp = await fetch(`${ORIGIN}/impressum`);
  const impText = (await imp.text()).replace(/<[^>]+>/g, " ");
  const unconfigured = /nicht vollständig konfiguriert/.test(impText);
  record(
    "/impressum renders real details",
    imp.status === 200 && !unconfigured && /§ 5 DDG/.test(impText),
    unconfigured ? "IMPRESSUM_* not set — fallback notice is showing" : "§ 5 DDG block present",
  );
  record(
    "/impressum names the MStV responsibility",
    /§ 18 Abs\. 2 MStV/.test(impText),
    "required beside the §5 block",
  );

  // 8. The privacy page must name every processor, OpenAI included — the one
  //    the legal pack's table omits.
  const ds = await fetch(`${ORIGIN}/datenschutz`);
  const dsText = (await ds.text()).replace(/<[^>]+>/g, " ");
  for (const who of ["Vercel", "Supabase", "Anthropic", "OpenAI", "Upstash"]) {
    record(`/datenschutz discloses ${who}`, dsText.includes(who), who, who === "OpenAI");
  }
  record(
    "/datenschutz names the Hessian authority",
    /Hessische/.test(dsText),
    "Art. 77 complaint route",
  );

  // 9. The calendar export, engine-only and database-free.
  const ics = await fetch(`${ORIGIN}/api/ics`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile: PROFILE, item: "standesamt_birth_registration" }),
  });
  const icsBody = ics.ok ? await ics.text() : "";
  record(
    "POST /api/ics returns a calendar with its alarm",
    ics.status === 200 && icsBody.startsWith("BEGIN:VCALENDAR") && icsBody.includes("BEGIN:VALARM"),
    `status ${ics.status}, ${icsBody.length} bytes`,
  );
  record(
    "the .ics links back to the real site URL",
    icsBody.includes(`${ORIGIN}/item/`),
    icsBody.includes(`${ORIGIN}/item/`)
      ? "NEXT_PUBLIC_SITE_URL is correct"
      : "URL field does not match this origin — NEXT_PUBLIC_SITE_URL unset or stale, needs a redeploy",
  );

  report();
}

function report() {
  console.log("");
  for (const r of results) {
    const mark = r.ok ? "PASS" : r.critical ? "FAIL" : "warn";
    console.log(`  ${mark}  ${r.name.padEnd(46)} ${r.detail}`);
  }
  const failed = results.filter((r) => !r.ok && r.critical);
  console.log(`\n  ${results.filter((r) => r.ok).length}/${results.length} passed`);
  if (failed.length) {
    console.log(`  ${failed.length} critical failure(s):`);
    for (const f of failed) console.log(`    - ${f.name}: ${f.detail}`);
    process.exit(1);
  }
  console.log("  Stage E smoke green.\n");
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
