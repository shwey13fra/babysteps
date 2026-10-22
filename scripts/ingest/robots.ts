// scripts/ingest/robots.ts
//
// Fetches and evaluates robots.txt at fetch time, with the SAME User-Agent and redirect
// handling the content fetcher uses.
//
// Why this exists: the manifest used to carry a hand-copied robots verdict. Twice that
// went wrong. ADR-012 asserted a prohibition gesetze-im-internet does not have. Then
// ADR-014 recorded www.frankfurt.de as "permission unverifiable" because a probe sent
// WITHOUT a User-Agent was answered 403 by bot protection - a refusal to a stranger,
// recorded as a statement of policy. Frankfurt's robots.txt actually reads "allow: /".
//
// A verdict copied into YAML is a fact that rots and that nothing re-checks. This module
// makes the check live, so the fetcher cannot act on a stale belief. The manifest's robots
// field stays as a dated observation for the audit trail (ADR-013), and fetch.ts warns
// when the live answer disagrees with it.
//
// POLICY on an unreadable robots.txt - deliberately stricter than RFC 9309:
//   200          -> apply the rules
//   404 / 410    -> allow (RFC 9309: unavailable means no restrictions)
//   any other    -> REFUSE, and say why
// RFC 9309 would treat 403 and most 4xx as "no restrictions". This project refuses
// instead: its whole claim is that it sources things correctly, and "the server would not
// tell us" is not permission. The cost of being wrong in the strict direction is a missing
// source we notice; in the lax direction it is crawling a site that said no.

const CACHE = new Map<string, RobotsFile>();

export type RobotsFile = {
  origin: string;
  status: number;
  /** false when the file could not be read under the policy above. */
  readable: boolean;
  rules: Array<{ allow: boolean; pattern: string }>;
  raw: string;
  note: string;
};

/** Turn a robots path pattern into a RegExp. Supports * and the $ end-anchor. */
function toRegExp(pattern: string): RegExp {
  let p = pattern;
  let anchored = false;
  if (p.endsWith("$")) {
    anchored = true;
    p = p.slice(0, -1);
  }
  const escaped = p.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp("^" + escaped + (anchored ? "$" : ""));
}

/**
 * Collect the rule group for our agent. Per RFC 9309 the most specific matching
 * User-agent group wins; we only ever identify as one token, so: our token if present,
 * otherwise the "*" group.
 */
function parseRobots(text: string, agentToken: string): RobotsFile["rules"] {
  const groups = new Map<string, RobotsFile["rules"]>();
  let current: string[] = [];
  let sawRuleInGroup = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const field = m[1].toLowerCase();
    const value = m[2].trim();

    if (field === "user-agent") {
      if (sawRuleInGroup) {
        current = [];
        sawRuleInGroup = false;
      }
      current.push(value.toLowerCase());
      if (!groups.has(value.toLowerCase())) groups.set(value.toLowerCase(), []);
      continue;
    }
    if (field === "allow" || field === "disallow") {
      sawRuleInGroup = true;
      for (const agent of current) {
        const list = groups.get(agent)!;
        // An empty Disallow means "nothing is disallowed" - not a rule.
        if (field === "disallow" && value === "") continue;
        list.push({ allow: field === "allow", pattern: value });
      }
    }
  }
  return groups.get(agentToken.toLowerCase()) ?? groups.get("*") ?? [];
}

export async function getRobots(origin: string, userAgent: string, agentToken = "*"): Promise<RobotsFile> {
  const cached = CACHE.get(origin);
  if (cached) return cached;

  let status = 0;
  let raw = "";
  try {
    const res = await fetch(`${origin}/robots.txt`, { headers: { "User-Agent": userAgent }, redirect: "follow" });
    status = res.status;
    if (res.ok) raw = await res.text();
  } catch (e: any) {
    status = 0;
    raw = "";
  }

  let readable: boolean;
  let note: string;
  if (status === 200) {
    readable = true;
    note = "robots.txt read";
  } else if (status === 404 || status === 410) {
    readable = true;
    note = `no robots.txt (HTTP ${status}) — RFC 9309: no restrictions`;
  } else {
    readable = false;
    note = status === 0 ? "robots.txt unreachable (network error) — refusing" : `robots.txt HTTP ${status} — refusing, see policy`;
  }

  const file: RobotsFile = {
    origin,
    status,
    readable,
    rules: readable && status === 200 ? parseRobots(raw, agentToken) : [],
    raw,
    note,
  };
  CACHE.set(origin, file);
  return file;
}

/** Longest matching pattern wins; Allow wins an exact-length tie (RFC 9309). */
export function isAllowed(file: RobotsFile, pathname: string): { allowed: boolean; why: string } {
  if (!file.readable) return { allowed: false, why: file.note };
  let best: { allow: boolean; pattern: string } | null = null;
  for (const rule of file.rules) {
    if (!toRegExp(rule.pattern).test(pathname)) continue;
    if (!best || rule.pattern.length > best.pattern.length || (rule.pattern.length === best.pattern.length && rule.allow)) {
      best = rule;
    }
  }
  if (!best) return { allowed: true, why: "no matching rule" };
  return { allowed: best.allow, why: `${best.allow ? "Allow" : "Disallow"}: ${best.pattern}` };
}

export async function checkUrl(url: string, userAgent: string): Promise<{ allowed: boolean; why: string; status: number }> {
  const u = new URL(url);
  const file = await getRobots(u.origin, userAgent);
  const verdict = isAllowed(file, u.pathname + u.search);
  return { ...verdict, status: file.status };
}
