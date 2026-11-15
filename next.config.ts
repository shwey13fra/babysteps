import type { NextConfig } from "next";

// DEV_LAN_ORIGIN — local development only, ruled 2026-11-15 (ADR-081).
//
// `next dev` blocks cross-origin requests for its own dev resources from any
// host it was not told about. The page still returns 200 and the HTML still
// renders, so the failure is invisible from the server side — but no client
// island hydrates, and every one of them sits in its initial state forever.
// On 2026-11-15 that read as "Working out your date…" with no buttons anywhere
// on the item page, and it cost the A3 calendar device check an hour.
//
// It would also have cost Stage F, which is a gate: a cold-load figure taken on
// an unhydrated page looks FAST, because the document renders and the islands
// never start.
//
// Unset by default, so production is untouched — this key is read by the dev
// server and nothing else. The value is a home LAN address and must never
// appear in this repo (CLAUDE.md "Never do"), which is why it arrives from the
// environment rather than from a literal here.
const devLanOrigin = process.env.DEV_LAN_ORIGIN;

const isDev = process.env.NODE_ENV === "development";

// ---------------------------------------------------------------------------
// Content Security Policy — brief §4 "a strict CSP"
// ---------------------------------------------------------------------------
//
// WHY THIS IS NOT NONCE-BASED, which is the stricter option and the one Next's
// own guide leads with. From that guide, verbatim in substance: "To use a
// nonce, your page must be dynamically rendered… Static pages are generated at
// build time, when no request or response headers exist—so no nonce can be
// injected."
//
// Every user-facing route in this product is static or SSG — `/`, `/intake`,
// `/timeline`, `/birth`, `/ask`, `/how-it-works` and twelve prerendered
// `/item/[id]` pages. A nonce CSP would make all of them dynamic, trading edge-
// cached HTML for a function invocation on every navigation. **Stage F is a
// gate with a stated bar on cold load**, and spending that budget before it has
// ever been measured is the wrong order. Revisit once Stage F has a number.
//
// WHAT 'unsafe-inline' COSTS US HERE, stated plainly rather than waved past.
// It means an inline <script> injected into our HTML would execute. What makes
// that acceptable *for this application specifically*, and what would make it
// unacceptable again:
//   - There is no HTML-injection vector: no `dangerouslySetInnerHTML` anywhere
//     (asserted in tests/security), no user-generated markup, no third-party
//     scripts, no ad or tag manager. React escapes everything it renders.
//   - Model output is rendered from the zod Answer contract as text, never as
//     markup (rule 8).
//   - **The day any of those stops being true, this comment is the signal to
//     move to nonces and pay the rendering cost.**
//
// `style-src` needs 'unsafe-inline' for a separate and unavoidable reason:
// React renders the `style={{…}}` prop as a style attribute, which CSP governs
// under style-src. Removing it would mean deleting every inline style in the
// app, and inline styles cannot execute script.
const csp = [
  "default-src 'self'",
  // 'unsafe-eval' in development only: React uses eval to rebuild server-side
  // error stacks in the browser. Next's guide is explicit that production needs
  // neither it nor React's debug path.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // blob: is load-bearing, not boilerplate — the "Add to calendar" button builds
  // the .ics as a Blob and hands it to an <a download> (app/item/[id]/add-to-calendar.tsx).
  "img-src 'self' data: blob:",
  // Self-hosted via next/font/local. CLAUDE.md forbids fetching a font from a
  // Google domain, and this directive makes that a browser-enforced rule rather
  // than a convention.
  "font-src 'self'",
  // The browser talks to our own API routes and nothing else. Supabase and
  // Anthropic are reached from the server, never from the page. When Vercel
  // Analytics lands in Stage G it will need its own origin added here, and that
  // is the point at which someone must consciously widen this line.
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // Clickjacking. brief §4 names this one explicitly.
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "manifest-src 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Two years, subdomains, preload-eligible. Vercel terminates TLS, so this is
  // a statement about the domain rather than about this server.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Superseded by frame-ancestors in modern browsers, kept for old ones.
  { key: "X-Frame-Options", value: "DENY" },
  // A share link carries an HMAC-signed profile in its path. Sending that path
  // to a third party as a Referer would leak a family's answers to whatever
  // they click through to, so cross-origin referrers are cut to the origin.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Nothing in this product uses any of these. Denying them means a compromised
  // dependency cannot start asking a pregnant user for their location.
  {
    key: "Permissions-Policy",
    value: [
      "accelerometer=()",
      "autoplay=()",
      "camera=()",
      "display-capture=()",
      "encrypted-media=()",
      "geolocation=()",
      "gyroscope=()",
      "magnetometer=()",
      "microphone=()",
      "midi=()",
      "payment=()",
      "usb=()",
    ].join(", "),
  },
  // Isolate this origin from others sharing a browsing context group.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  ...(devLanOrigin ? { allowedDevOrigins: [devLanOrigin] } : {}),

  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // The beta is not for search engines. Lifted deliberately, once, when the
      // product is ready to be found (Stage G decision, not a default).
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
