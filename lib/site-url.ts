// lib/site-url.ts
//
// The one place that knows this deployment's public origin.
//
// NEXT_PUBLIC_SITE_URL is the THIRD legitimate NEXT_PUBLIC_ value, beside the
// Supabase URL and anon key (CLAUDE.md "Never do"). It qualifies for the same
// reason they do: it is public by definition — it is the address a reader types
// — and it has to be readable where links are built.
//
// It exists so that nothing hard-codes a host. The decision of 2026-11-15 is to
// ship on a vercel.app subdomain with no custom domain, which makes this more
// important rather than less: the host is provisional, and a domain added later
// must not mean hunting through source for strings.
//
// NOT used by the share link, deliberately. app/timeline/share-link.tsx builds
// from window.location.origin, which is correct by construction in every
// environment and cannot drift from where the reader actually is. This is for
// the places that have no browser: calendar files, and e-mail in Phase 7.

/** No trailing slash, so callers can write `${siteUrl()}/birth` and be right. */
function normalise(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

/**
 * The public origin of this deployment.
 *
 * Falls back to VERCEL_URL, which Vercel sets on every deployment including
 * previews, so a preview build produces links to ITSELF rather than to
 * production. Localhost last, so a developer never silently generates links to
 * a machine nobody else can reach.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit?.trim()) return normalise(explicit);

  const vercel = process.env.VERCEL_URL;
  if (vercel?.trim()) return `https://${normalise(vercel)}`;

  return "http://localhost:3000";
}
