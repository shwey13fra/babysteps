// app/timeline/body.tsx
//
// The timeline's markup, with no hooks and no "use client", so it renders in
// BOTH the owner's client page (which reads localStorage) and the shared view
// (a Server Component that verifies a signed token). One component, so a share
// link cannot drift into looking like a different product.
//
// Layout is docs/mockup.html: 56px date gutter with tabular figures, 1px
// hairline rail, filled dots for confirmed dates and hollow for estimated, the
// today band as the only full-bleed element and the only 2px rule, consular
// items behind a 3px violet left border.

import Link from "next/link";
import { termToShow, type TimelineRow, type TimelineView } from "@/lib/ui/timeline-rows";

function Row({ row, linkItems }: { row: TimelineRow; linkItems: boolean }) {
  const itemClasses = [
    "item",
    row.state === "done" ? "done" : "",
    row.state === "current" ? "current" : "",
    row.estimated ? "est" : "",
    row.consular ? "consular" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const dotClasses = [
    "dot",
    row.dot === "hollow" ? "hollow" : "",
    row.dot === "done" ? "done" : "",
    row.consular ? "consular" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const term = termToShow(row.title_en, row.term_de);
  const title = (
    <>
      {row.title_en}
      {term ? (
        <>
          {" "}
          <span lang="de">({term})</span>
        </>
      ) : null}
    </>
  );

  return (
    <li className="row">
      <div className="date">
        <b>{row.date}</b>
        {row.dateNote}
      </div>
      <div className="rail">
        <span className={dotClasses} aria-hidden="true" />
      </div>
      <div className={itemClasses}>
        <h3>
          {/* A shared view does not link through: the item page works out its
              date from the reader's OWN profile, and a partner has none, so the
              link would lead somewhere that cannot answer. */}
          {linkItems ? <Link href={`/item/${row.id}`}>{title}</Link> : title}
        </h3>
        <div className="line">{row.metaLine}</div>
        {row.chip ? <span className={`chip ${row.chip.kind}`}>{row.chip.text}</span> : null}
      </div>
    </li>
  );
}

export function TimelineBody({
  view,
  linkItems = true,
}: {
  view: TimelineView;
  linkItems?: boolean;
}) {
  return (
    <>
      <div className="legend">
        <span className="de">
          <i />
          German offices
        </span>
        <span className="in">
          <i />
          Indian consulate
        </span>
      </div>

      {view.before.length > 0 ? (
        <div className="tl">
          <ol>
            {view.before.map((row) => (
              <Row key={row.id} row={row} linkItems={linkItems} />
            ))}
          </ol>
        </div>
      ) : null}

      <div className="today">
        <div className="lbl">{view.today.date}</div>
        <div className="today-inner">
          <div className="bar" />
          <div className="cap">
            today{view.today.week === null ? "" : ` · week ${view.today.week}`}
          </div>
        </div>
      </div>

      {view.after.length > 0 ? (
        <div className="tl">
          <ol>
            {view.after.map((row) => (
              <Row key={row.id} row={row} linkItems={linkItems} />
            ))}
          </ol>
        </div>
      ) : null}
    </>
  );
}

/** The header, shared for the same reason the body is. */
export function TimelineHeader({ view }: { view: TimelineView }) {
  return (
    <div className="head">
      <div className="state">
        {view.header.week === null ? "Your timeline" : `Week ${view.header.week}`} · due{" "}
        {view.header.dueDate}
        {view.header.birthDate === null ? "" : `, born ${view.header.birthDate}`}
      </div>
      <div className="sub">{view.header.profileLine}</div>
    </div>
  );
}

/** The do-next card: at most three, the only filled card in the product. */
export function DoNext({ rows }: { rows: TimelineRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="pad">
      <div className="donext">
        <h2>Do next</h2>
        <ol>
          {rows.map((row) => (
            <li key={row.id}>
              <div>
                <b>{row.title_en}</b>
                <span>
                  {row.chip ? `${row.chip.text} · ` : ""}
                  {row.metaLine}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
