// app/item/[id]/page.tsx
//
// A Server Component, deliberately. Everything on this page except the date is a
// property of the RULE, not of the reader: what the step is, what it costs to
// miss it, which documents to take, which provision it comes from and when that
// source was last checked. All of that is read from data/rules/*.yaml on the
// server, so none of it costs the browser a round trip or a byte of rules.
//
// The date is the one profile-dependent fact, and it arrives through the client
// island in ./dates.tsx (ADR-069).
//
// The German term is rendered beside the English title rather than through the
// glossary file. The title IS the English gloss here - "Register the birth at
// the Standesamt" glosses Standesamt by standing next to it - so the page needs
// no third reader of data/glossary.de-en.yaml beside the two in lib/rag/.

import { notFound } from "next/navigation";
import Link from "next/link";
import { loadRules } from "@/lib/timeline/rules";
import { asOfLabel, deadlineKindLine } from "@/lib/ui/item-view";
import { termToShow } from "@/lib/ui/timeline-rows";
import { ItemDates } from "./dates";

export const dynamic = "force-static";

/** Pre-renders every item page at build time: they are the same for everyone. */
export function generateStaticParams() {
  return loadRules().map((rule) => ({ id: rule.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rule = loadRules().find((r) => r.id === id);
  return { title: rule ? `${rule.title_en} — BabySteps Germany` : "BabySteps Germany" };
}

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rule = loadRules().find((r) => r.id === id);
  if (!rule) notFound();

  const kind = deadlineKindLine(
    rule.deadline?.kind ?? "advisory",
    rule.authority_en,
    rule.deadline?.note_en,
  );

  const consular = rule.track === "consular";

  return (
    <>
      <div className="head">
        <div className="state">{consular ? "Indian consulate" : "German offices"}</div>
        <div className="sub">{kind.label}</div>
      </div>

      <div className="pad">
        <h1 className="title">
          {rule.title_en}
          {termToShow(rule.title_en, rule.term_de) ? (
            <>
              {" "}
              <span lang="de" className="term">
                {termToShow(rule.title_en, rule.term_de)}
              </span>
            </>
          ) : null}
        </h1>

        {/* The one profile-dependent fact on the page. */}
        <ItemDates id={rule.id} />

        <h2 className="sub-title">If you leave it too late</h2>
        <p className="lede">{rule.consequence_en}</p>

        {rule.documents.length > 0 ? (
          <>
            <h2 className="sub-title">Take with you</h2>
            <ul className="checklist">
              {rule.documents.map((doc) => (
                <li key={doc}>{doc}</li>
              ))}
            </ul>
          </>
        ) : null}

        <h2 className="sub-title">Where this comes from</h2>
        <a
          className={`src${consular ? " consular" : ""}`}
          href={rule.source_url}
          target="_blank"
          rel="noreferrer noopener"
        >
          <code>{rule.source_ref}</code>
          <em>{asOfLabel(rule.verified_on, rule.source_status)}</em>
        </a>

        <p className="kindline">{kind.text}</p>

        {/* Placeholder: /api/ics is Phase 7. Named for what it will do, and
            disabled rather than pretending to work. */}
        <button type="button" className="btn-ghost" style={{ width: "100%", marginTop: "14px" }} disabled>
          Add to calendar — coming with reminders
        </button>

        <p className="meta" style={{ marginTop: "14px" }}>
          <Link href="/timeline">Back to the timeline</Link>
        </p>
      </div>
    </>
  );
}
