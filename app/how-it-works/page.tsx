// PRD §8: "a visible 'How this works' page explaining sources, update cadence
// and limits". This is the trust page, and the trust mechanism is the design
// budget (design-system.md §1: nothing on screen without provenance).
//
// Every claim on this page is checkable against something in the repo -
// data/corpus_manifest.yaml for the source list and corpus_version,
// lib/timeline for the date arithmetic, lib/rag/guards.ts for the two gates.
// Nothing here is a marketing sentence.

export const metadata = {
  title: "How this works — BabySteps Germany",
  description: "Where the dates come from, how answers are sourced, and what this does not cover.",
};

/** data/corpus_manifest.yaml, corpus_version "2026-10". */
const CORPUS_VERSION = "2026-10";

export default function Page() {
  return (
    <>
      <div className="head">
        <div className="state">How this works</div>
        <div className="sub">Sources, how dates are worked out, and the limits</div>
      </div>

      <div className="pad">
        <h1 className="title">Where everything here comes from</h1>

        <p className="lede">
          This product has two halves, and they work in completely different ways. Knowing which
          half you are looking at is the point of this page.
        </p>

        <h2 className="sub-title">The dates are arithmetic, not opinion</h2>
        <p className="lede">
          Every date on your timeline is worked out in code from the answers you gave, using offsets
          written down in a rules file. A language model is never asked to calculate a date, and
          never sees the rules file. This is deliberate: a wrong explanation is embarrassing, a
          wrong date is harmful.
        </p>
        <p className="lede">
          Each item shows what its date is counted from — your due date, or the birth once you
          record it. Dates counted from a birth that has not happened yet are marked{" "}
          <strong>estimated</strong>, with a hollow marker, until you tell us the real date. Then
          they become exact and the whole timeline moves with them.
        </p>

        <h2 className="sub-title">The answers are quotations, not knowledge</h2>
        <p className="lede">
          When you ask a question, we search only the official sources listed below and answer from
          the passages we find. Every claim carries the provision it came from and the date we last
          checked that page. If the sources do not cover your question, you get told that instead of
          a guess — including when the honest answer is that a particular office decides and we
          cannot know what they will say.
        </p>
        <p className="lede">
          We never tell you what you are entitled to, how much you would receive, or how your
          application will be decided. That is not modesty: stating it would be an individual legal
          or tax assessment, which we are not permitted to give. We state the rule and name the
          authority that decides.
        </p>

        <h2 className="sub-title">Medical questions are not answered at all</h2>
        <p className="lede">
          Anything clinical — symptoms, medicines, whether something is normal — is passed straight
          back to your <span lang="de" className="term">Frauenarzt</span>{" "}
          <span className="gloss">(gynaecologist)</span> or{" "}
          <span lang="de" className="term">Hebamme</span>{" "}
          <span className="gloss">(midwife)</span>, with the out-of-hours number where it is
          relevant. We do not attempt a careful medical answer, because there is no safe version of
          one from a product like this.
        </p>

        <h2 className="sub-title">What is in the corpus</h2>
        <p className="lede">
          Corpus version <strong>{CORPUS_VERSION}</strong>. Federal law is ingested from the
          official full texts at gesetze-im-internet.de; guidance and office pages are ingested from
          the authorities themselves. Nothing is scraped while you are using the product.
        </p>
        <p className="lede">
          <strong>Federal law:</strong> <span lang="de">Mutterschutzgesetz</span>,{" "}
          <span lang="de">Bundeselterngeld- und Elternzeitgesetz</span>,{" "}
          <span lang="de">Bundeskindergeldgesetz</span>, <span lang="de">Personenstandsgesetz</span>{" "}
          and its <span lang="de">Verordnung</span>, <span lang="de">Bürgerliches Gesetzbuch</span>,{" "}
          <span lang="de">Staatsangehörigkeitsgesetz</span>,{" "}
          <span lang="de">Aufenthaltsgesetz</span>, <span lang="de">Einkommensteuergesetz</span>,{" "}
          <span lang="de">Abgabenordnung</span>, and the relevant books of the{" "}
          <span lang="de">Sozialgesetzbuch</span> (V, VIII, X).
        </p>
        <p className="lede">
          <strong>Guidance:</strong> <span lang="de">Familienportal</span> of the federal family
          ministry, the <span lang="de">Familienkasse</span> pages on{" "}
          <span lang="de">Kindergeld</span>, and the G-BA{" "}
          <span lang="de">Kinder-Richtlinie</span> for the U-examination schedule.
        </p>
        <p className="lede">
          <strong>State:</strong> the <span lang="de">Regierungspräsidium Gießen</span> pages for
          Hessen, the Berlin service portal, and the Frankfurt{" "}
          <span lang="de">Standesamt</span>.
        </p>
        <p className="lede">
          <strong>Consular:</strong> the Indian Consulate General in Frankfurt. These pages change
          without notice and are hand-checked rather than fetched automatically, so they carry a
          review date.
        </p>

        <h2 className="sub-title">How often it is re-checked</h2>
        <p className="lede">
          Sources are re-ingested monthly and compared against the previous version. When a page we
          relied on has changed, the items and answers that used it are flagged rather than silently
          updated — you see that the rule moved, and when.
        </p>
        <p className="lede">
          Every source chip carries the date that page was last checked. Where nobody has checked a
          source yet, it says so. It never shows a date we guessed.
        </p>

        <h2 className="sub-title">What this does not cover</h2>
        <p className="lede">
          Only Hessen and Berlin, only statutory health insurance{" "}
          <span lang="de" className="term">gesetzliche Krankenversicherung</span>, and on the
          consular side only India. Private insurance, other states and other consulates are not in
          the corpus, so questions about them are refused rather than approximated.
        </p>
        <p className="lede">
          Nothing about tenancy, employment disputes, immigration decisions or tax returns. If you
          ask, you will be told the boundary and pointed at someone who does answer that.
        </p>

        <h2 className="sub-title">What we store</h2>
        <p className="lede">
          Your answers to the seven questions stay in your browser on this device. There is no
          account and no e-mail unless you ask for reminders. We do not store your timeline on a
          server.
        </p>
      </div>
    </>
  );
}
