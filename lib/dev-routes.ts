// lib/dev-routes.ts
//
// Is the development-only surface allowed to render?
//
// Extracted to a pure function for one reason: the guard itself has to be
// testable. A guard that is only exercised by deploying to production is a
// guard nobody has ever seen work, and this project has now caught three checks
// on their way to failing open (CLAUDE.md rule 16).
//
// `/dev/timeline` dumps engine output as JSON for arbitrary query parameters.
// It holds no secret and touches no database — every date comes from
// data/rules/*.yaml — so this is not a data leak. It is a development surface
// on a public site, which is a different and smaller problem, and the brief's
// §4 hygiene line is the reason it does not ship.
//
// DEFAULT-DENY ON PURPOSE. Anything that is not explicitly a development or
// test environment is treated as production, so a missing or misspelt NODE_ENV
// hides the route rather than exposing it. The expensive direction of this
// mistake is one-way.

export function devRoutesEnabled(nodeEnv: string | undefined): boolean {
  return nodeEnv === "development" || nodeEnv === "test";
}
