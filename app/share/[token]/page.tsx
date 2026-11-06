// app/share/[token]/page.tsx — the partner's read-only view (item 7).
//
// A Server Component. The token is verified with the signing secret, the
// timeline is built from the profile inside it, and the whole page is rendered
// server-side - so the partner's browser never needs a profile of its own, and
// nothing about them is stored.
//
// READ-ONLY means read-only: no share control, no birth prompt, no link into
// item pages (those work out their date from the READER's profile, which a
// partner does not have). The only interactive thing on the page is a link to
// the public explainer.

import Link from "next/link";
import { notFound } from "next/navigation";
import { buildTimeline } from "@/lib/timeline";
import { TimelineResponse } from "@/lib/schemas";
import { toView } from "@/lib/ui/timeline-rows";
import { verifyShareToken } from "@/lib/share/token";
import { DoNext, TimelineBody, TimelineHeader } from "../../timeline/body";
import { StaleBanner } from "./stale-banner";

// Never cached and never prerendered: the token IS the input, and one partner's
// view must not be served to another.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "A shared timeline — BabySteps Germany",
  // A share link should not be indexed or followed if it ever reaches a crawler.
  robots: { index: false, follow: false },
};

export default async function SharedTimelinePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = verifyShareToken(decodeURIComponent(token));

  if (!result.ok) {
    // Every failure reads the same to the visitor. Telling them WHICH part of a
    // token was wrong is free help to anyone trying to forge one, and there is
    // nothing a legitimate visitor could do differently with the detail.
    if (result.reason === "no_secret") {
      return (
        <>
          <div className="head">
            <div className="state">A shared timeline</div>
            <div className="sub">Not available</div>
          </div>
          <div className="aside" role="alert">
            <b>Sharing is not switched on in this deployment.</b>
            <p style={{ margin: 0 }}>This link cannot be opened here.</p>
          </div>
        </>
      );
    }
    notFound();
  }

  const { profile, issued_at } = result.payload;
  const timeline = TimelineResponse.parse(buildTimeline(profile));
  const view = toView(timeline, profile);
  const made = issued_at ? issued_at.slice(0, 10) : null;

  return (
    <>
      <TimelineHeader view={view} />

      <div className="banner">
        <b>You are looking at a shared timeline.</b>
        <span>
          Someone sent you this as a read-only link{made ? `, made on ${made}` : ""}. Nothing here
          can be changed from this page, and it does not update on its own.{" "}
          <Link href="/how-it-works">How these dates are worked out</Link>
        </span>
      </div>

      <StaleBanner sharedHasBirth={profile.birth_date !== undefined} />

      <DoNext rows={view.doNext} />

      <TimelineBody view={view} linkItems={false} />

      <div className="pad">
        <p className="meta">
          These dates were worked out from the answers the sender gave. If they are yours too, you
          can <Link href="/intake">make your own timeline</Link>.
        </p>
      </div>
    </>
  );
}
