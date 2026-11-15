// Everything under /dev is development-only.
//
// The guard lives in the LAYOUT rather than in each page so that a dev route
// added later is covered without anyone remembering to cover it. A rule that
// depends on being re-applied by hand is a rule that will eventually be missed.
//
// `notFound()` rather than a redirect or a 403: in production this route should
// be indistinguishable from a path that was never built.

import { notFound } from "next/navigation";
import { devRoutesEnabled } from "@/lib/dev-routes";

// Never prerendered into the production build's static output.
export const dynamic = "force-dynamic";

export default function DevLayout({ children }: { children: React.ReactNode }) {
  if (!devRoutesEnabled(process.env.NODE_ENV)) notFound();
  return <>{children}</>;
}
