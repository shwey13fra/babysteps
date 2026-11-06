import type { ReactNode } from "react";
import "./globals.css";
import { fontVariables } from "./fonts";

// Phase 6 stage A. Fonts are self-hosted from app/fonts/ via next/font/local -
// see app/fonts.ts. No request to any Google domain is made on any route, which
// is item 7 of the Phase 6 VERIFY gate and pass/fail.
export const metadata = {
  title: "BabySteps Germany",
  description: "Every deadline. Both countries. In English. Sourced.",
};

export const viewport = {
  // Mobile-first at 380px (design-system.md §4). Zoom is never disabled: a
  // pregnant person reading German administrative text in a second language is
  // exactly the user who pinches to zoom.
  width: "device-width",
  initialScale: 1,
};

/**
 * The permanent disclaimer, on every route.
 *
 * Wording is docs/legal-compliance-pack.md §4 verbatim, which carries the RDG,
 * StBerG and medical boundaries in one sentence. The pack requires it "in the
 * footer of every route, not in a modal", so it lives in the root layout rather
 * than in any page.
 *
 * `Impressum` and `Datenschutz` are NOT linked yet. The pack requires the
 * Impressum to be reachable in two clicks from every page and to render from
 * IMPRESSUM_* env vars rather than a hard-coded address; both are Phase 7
 * deliverables, and nothing is deployed before Phase 7, so the obligation is not
 * live. A dead link in a legal footer is worse than its absence.
 */
function DisclaimerFooter() {
  return (
    <footer className="foot">
      BabySteps is a navigator to official sources — not legal, tax or medical advice. We explain
      the rules and show you where they come from; the decision in your case always lies with the
      responsible authority. <a href="/how-it-works">How this works</a>
    </footer>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body>
        <div className="shell">
          <main>{children}</main>
          <DisclaimerFooter />
        </div>
      </body>
    </html>
  );
}
