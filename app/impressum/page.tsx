// /impressum — DDG §5. Mandatory and blocking (legal pack §1).
//
// Three things the pack requires and this page does:
//   - reachable in at most two clicks from every page (footer link, root layout)
//   - labelled unambiguously "Impressum", never "About"
//   - never behind the intake flow
//
// The address renders from IMPRESSUM_* environment variables and is never
// hard-coded, because once the repo is public a committed address is permanent
// and cannot be rotated the way a key can.
//
// German, not English. The rest of this product is deliberately in English —
// that is its reason to exist — but §5 is a German legal obligation and the
// audience for this page is a German reader checking compliance.

import Link from "next/link";
import { readImpressum } from "@/lib/legal";

export const metadata = {
  title: "Impressum — BabySteps Germany",
  description: "Angaben gemäß § 5 DDG.",
};

// Read at request time, not baked in at build time, so correcting the address
// is an environment change rather than a redeploy.
export const dynamic = "force-dynamic";

export default function Page() {
  const impressum = readImpressum(process.env);

  if (!impressum.ok) {
    // Loud, not silent, and deliberately not a partial address. See lib/legal.ts.
    console.error("[impressum] not configured", { missing: impressum.missing });
    return (
      <>
        <div className="head">
          <div className="state">Impressum</div>
        </div>
        <div className="pad">
          <h1 className="title">Impressum</h1>
          <p className="lede">
            Diese Seite ist noch nicht vollständig konfiguriert und wird daher nicht angezeigt. Das
            ist ein Fehler auf unserer Seite, kein Fehler Ihres Browsers.
          </p>
          <p className="lede">
            Bitte wenden Sie sich an den Betreiber dieser Testversion.{" "}
            <Link href="/">Zur Startseite</Link>
          </p>
        </div>
      </>
    );
  }

  const { name, street, city, email } = impressum.details;

  return (
    <>
      <div className="head">
        <div className="state">Impressum</div>
        <div className="sub">Angaben gemäß § 5 DDG</div>
      </div>

      <div className="pad">
        <h1 className="title">Impressum</h1>

        <h2 className="sub-title">Angaben gemäß § 5 DDG</h2>
        <p className="lede">
          {name}
          <br />
          {street}
          <br />
          {city}
          <br />
          Deutschland
        </p>

        <h2 className="sub-title">Kontakt</h2>
        <p className="lede">
          E-Mail: <a href={`mailto:${email}`}>{email}</a>
        </p>

        <h2 className="sub-title">Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
        <p className="lede">
          {name}, {street}, {city}
        </p>

        <h2 className="sub-title">Hinweis</h2>
        <p className="lede">
          BabySteps ist ein privates, nicht-kommerzielles Projekt in einer geschlossenen Testphase.
          Es handelt sich nicht um ein Angebot einer Behörde und nicht um eine Rechts- oder
          Steuerberatung.
        </p>

        <p className="lede">
          <Link href="/datenschutz">Datenschutzerklärung</Link> ·{" "}
          <Link href="/how-it-works">How this works</Link>
        </p>
      </div>
    </>
  );
}
