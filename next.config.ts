import type { NextConfig } from "next";

// Security headers and CSP land in Phase 7 stage D (brief §4); do not add them
// here early and half-done.
//
// DEV_LAN_ORIGIN — local development only, ruled 2026-11-15.
//
// `next dev` blocks cross-origin requests for its own dev resources from any
// host it was not told about. The page still returns 200 and the HTML still
// renders, so the failure is invisible from the server side — but no client
// island hydrates, and every one of them sits in its initial state forever.
// On 2026-11-15 that read as "Working out your date…" with no buttons anywhere
// on the item page, and it cost the A3 calendar device check an hour.
//
// It would also have cost Stage F, which is a gate: the cold-load measurement
// can only be taken on a real phone over mobile data, and a phone can only
// reach this machine by its LAN address.
//
// Unset by default, so production is untouched — this key is read by the dev
// server and nothing else. The value is a home LAN address and must never
// appear in this repo (CLAUDE.md "Never do"), which is why it arrives from the
// environment rather than from a literal here.
const devLanOrigin = process.env.DEV_LAN_ORIGIN;

const nextConfig: NextConfig = {
  ...(devLanOrigin ? { allowedDevOrigins: [devLanOrigin] } : {}),
};

export default nextConfig;
