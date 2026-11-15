// /datenschutz — GDPR Art. 13. Mandatory and blocking (legal pack §2).
//
// EVERY CLAIM BELOW WAS CHECKED AGAINST THE CODE, and three of them contradict
// the legal pack's §2 table, which was written before parts of this system
// existed. Where they disagree, the code wins and the page says what the system
// actually does:
//
//   1. OpenAI is a processor. lib/rag/retrieve.ts:101 posts the visitor's
//      question text to api.openai.com to build a search vector, before
//      anything reaches Anthropic. The pack's table does not list it.
//   2. The intake answers ARE transmitted to the server. The pack says they are
//      not, unless the visitor subscribes to reminders. In fact every timeline
//      calculation POSTs the profile to /api/timeline. It is processed in
//      memory and neither stored nor logged — verified, app/api/timeline/route.ts
//      contains no logging and no database call — but "not stored" and "not
//      transmitted" are different promises and only one of them is true.
//   3. There is no query log. The pack describes one; no table and no writer
//      exists. So this page does not mention it, rather than describing a
//      feature that would have to be built to make the text true.
//
// Resend and e-mail reminders are absent because F6 is deferred (confirmed
// 2026-11-15) and nothing in the shipped code references them.
//
// German, because Art. 13 information must be in the language of the people it
// addresses and this is a German legal obligation. The plain-English trust page
// at /how-it-works is the one that actually gets read; each links to the other,
// as the pack requires.

import Link from "next/link";
import { PROCESSORS, SUPERVISORY_AUTHORITY, VERCEL_LOG_RETENTION, readImpressum } from "@/lib/legal";

export const metadata = {
  title: "Datenschutzerklärung — BabySteps Germany",
  description: "Informationen nach Art. 13 DSGVO.",
};

export const dynamic = "force-dynamic";

export default function Page() {
  const impressum = readImpressum(process.env);
  const controller = impressum.ok ? impressum.details : null;

  return (
    <>
      <div className="head">
        <div className="state">Datenschutz</div>
        <div className="sub">Informationen nach Art. 13 DSGVO</div>
      </div>

      <div className="pad">
        <h1 className="title">Datenschutzerklärung</h1>

        <p className="lede">
          Diese Erklärung beschreibt, welche Daten beim Besuch von BabySteps verarbeitet werden. Sie
          ist bewusst kurz, weil dieses Angebot bewusst wenig Daten verarbeitet. Eine Erklärung in
          einfachem Englisch, die denselben Sachverhalt beschreibt, finden Sie unter{" "}
          <Link href="/how-it-works">How this works</Link>.
        </p>

        <h2 className="sub-title">1. Verantwortlicher</h2>
        {controller ? (
          <p className="lede">
            {controller.name}
            <br />
            {controller.street}
            <br />
            {controller.city}
            <br />
            Deutschland
            <br />
            E-Mail: <a href={`mailto:${controller.email}`}>{controller.email}</a>
          </p>
        ) : (
          <p className="lede">
            Die Angaben zum Verantwortlichen sind derzeit nicht konfiguriert. Siehe{" "}
            <Link href="/impressum">Impressum</Link>.
          </p>
        )}
        <p className="lede">
          Anfragen zu Ihren Rechten nach Art. 15 bis 21 DSGVO richten Sie bitte an diese Adresse.
        </p>

        <h2 className="sub-title">2. Was dieses Angebot nicht tut</h2>
        <p className="lede">
          Es gibt keine Benutzerkonten und keine Registrierung. Es werden{" "}
          <strong>keine Cookies gesetzt</strong>, auch keine technisch notwendigen. Es findet kein
          Tracking über Websites hinweg statt, es sind keine Werbenetzwerke eingebunden, und es
          werden keine Schriftarten, Skripte oder Stile von fremden Servern nachgeladen — alle
          Schriftarten werden von diesem Server ausgeliefert.
        </p>

        <h2 className="sub-title">3. Beim Aufruf der Website</h2>
        <p className="lede">
          Unser Hosting-Anbieter Vercel verarbeitet beim Abruf jeder Seite technisch notwendige
          Server-Protokolldaten: IP-Adresse, Zeitpunkt der Anfrage, angefragte Adresse und
          Browserkennung. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; das berechtigte Interesse
          ist der Betrieb und die Sicherheit des Angebots. Diese Daten werden nicht mit anderen
          Daten zusammengeführt und nicht zur Identifizierung einzelner Personen verwendet.
        </p>
        <p className="lede">
          Nach Angaben von Vercel werden diese Protokolle auf dem genutzten Tarif (
          {VERCEL_LOG_RETENTION.plan}) für {VERCEL_LOG_RETENTION.value} vorgehalten (Stand:{" "}
          {VERCEL_LOG_RETENTION.checkedOn}).
        </p>

        <h2 className="sub-title">4. Ihre Antworten aus dem Fragebogen</h2>
        <p className="lede">
          Ihre Antworten — voraussichtlicher Geburtstermin, Bundesland, Stadt, Beschäftigungsstatus,
          Versicherungsart, Staatsangehörigkeiten, Familienstand, erstes Kind — werden{" "}
          <strong>im lokalen Speicher Ihres Browsers</strong> unter einer zufällig erzeugten Kennung
          abgelegt. Diese Kennung wird in Ihrem Browser erzeugt und an keinen Server übermittelt.
        </p>
        <p className="lede">
          Zur Berechnung Ihrer Fristen werden diese Antworten bei jedem Aufruf an unseren Server
          übermittelt. Sie werden dort ausschließlich im Arbeitsspeicher verarbeitet und{" "}
          <strong>weder gespeichert noch protokolliert</strong> und keiner Kennung zugeordnet.
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, da die Berechnung die von Ihnen
          angeforderte Leistung ist. Wenn Sie den lokalen Speicher Ihres Browsers löschen, sind
          diese Angaben vollständig entfernt.
        </p>
        <p className="lede">
          Es werden kein Name, keine Anschrift und keine Gesundheitsdaten über den
          voraussichtlichen Geburtstermin und ein etwaiges tatsächliches Geburtsdatum hinaus
          erhoben.
        </p>

        <h2 className="sub-title">5. Fragen an die Fragefunktion</h2>
        <p className="lede">
          Wenn Sie eine Frage stellen, wird der Text Ihrer Frage an zwei Auftragsverarbeiter
          übermittelt: an OpenAI, um die Frage in einen Suchvektor umzuwandeln, und an Anthropic,
          um aus den gefundenen Quellenauszügen eine Antwort zu erzeugen. Zusammen mit der Frage
          wird Ihr Bundesland übermittelt, damit nur zuständige Quellen durchsucht werden.
        </p>
        <p className="lede">
          Der Text Ihrer Frage wird von uns <strong>nicht gespeichert</strong>. Es wird kein
          Frageprotokoll geführt, und Ihre Frage wird keiner Kennung und keiner Person zugeordnet.
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.
        </p>

        <h2 className="sub-title">6. Kalender-Export und Partner-Link</h2>
        <p className="lede">
          Beim Kalender-Export werden Ihre Antworten an den Server übermittelt, um die Termindatei
          zu erzeugen; es gilt Abschnitt 4. Beim Partner-Link werden Ihre Antworten in einen
          signierten Link kodiert. Es entsteht dabei <strong>kein Datenbankeintrag</strong>; wer den
          Link hat, sieht die darin enthaltenen Angaben. Geben Sie ihn daher nur an Personen weiter,
          denen Sie diese Angaben anvertrauen wollen.
        </p>

        <h2 className="sub-title">7. Missbrauchsabwehr</h2>
        <p className="lede">
          Um die Fragefunktion vor automatisierter Massennutzung zu schützen, wird die Zahl der
          Anfragen je IP-Adresse gezählt. Die IP-Adresse wird dafür kurzzeitig bei Upstash
          verarbeitet. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; das berechtigte Interesse ist
          die Sicherheit des Angebots und die Begrenzung der Kosten.
        </p>

        <h2 className="sub-title">8. Empfänger und Auftragsverarbeiter</h2>
        <p className="lede">
          Mit allen genannten Anbietern bestehen Verträge zur Auftragsverarbeitung nach Art. 28
          DSGVO.
        </p>
        <ul className="checklist">
          {PROCESSORS.map((p) => (
            <li key={p.name}>
              <strong>{p.name}</strong> — {p.role}. {p.place}.
            </li>
          ))}
        </ul>

        <h2 className="sub-title">9. Übermittlung in Drittländer</h2>
        <p className="lede">
          Hosting und Datenbank werden in Rechenzentren in Frankfurt am Main betrieben. Die
          Verarbeitung Ihrer Frage durch Anthropic und OpenAI sowie die Zählung der Anfragen durch
          Upstash können eine Übermittlung in die USA umfassen. Soweit kein Angemessenheitsbeschluss
          der Europäischen Kommission vorliegt, erfolgt die Übermittlung auf Grundlage von
          Standardvertragsklauseln nach Art. 46 Abs. 2 lit. c DSGVO als Bestandteil des jeweiligen
          Auftragsverarbeitungsvertrags.
        </p>

        <h2 className="sub-title">10. Speicherdauer</h2>
        <p className="lede">
          Ihre Antworten bleiben in Ihrem Browser, bis Sie sie löschen. Server-Protokolle werden
          nach dem in Abschnitt 3 genannten Zeitraum gelöscht. Die zitierten Quellentexte in unserer
          Datenbank enthalten keine personenbezogenen Daten und werden dauerhaft vorgehalten. Es
          werden keine Fragen und keine Antworten gespeichert.
        </p>

        <h2 className="sub-title">11. E-Mail-Erinnerungen</h2>
        <p className="lede">
          In dieser Testphase werden <strong>keine E-Mail-Erinnerungen versendet</strong> und keine
          E-Mail-Adressen erhoben. Sollte diese Funktion später eingeführt werden, geschieht dies
          nur mit ausdrücklicher Einwilligung im Double-Opt-in-Verfahren, und diese Erklärung wird
          vorher entsprechend ergänzt.
        </p>

        <h2 className="sub-title">12. Ihre Rechte</h2>
        <p className="lede">
          Sie haben das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17),
          Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) sowie das Recht,
          der Verarbeitung auf Grundlage berechtigter Interessen zu widersprechen (Art. 21).
        </p>
        <p className="lede">
          Da wir Ihre Antworten und Ihre Fragen nicht speichern und Ihnen keine Kennung zuordnen,
          können wir zu einer einzelnen Person in aller Regel keine Daten auffinden — die Angaben in
          Ihrem Browser haben allein Sie in der Hand und können sie dort jederzeit selbst löschen.
        </p>
        <p className="lede">
          Unabhängig davon haben Sie nach Art. 77 DSGVO das Recht, sich bei einer Aufsichtsbehörde
          zu beschweren. Zuständig ist:{" "}
          <a href={SUPERVISORY_AUTHORITY.url} rel="noreferrer">
            {SUPERVISORY_AUTHORITY.name}
          </a>
          .
        </p>

        <h2 className="sub-title">13. Änderungen</h2>
        <p className="lede">
          Diese Erklärung wird angepasst, wenn sich die beschriebene Verarbeitung ändert. Maßgeblich
          ist die jeweils hier veröffentlichte Fassung.
        </p>

        <p className="lede">
          <Link href="/impressum">Impressum</Link> ·{" "}
          <Link href="/how-it-works">How this works</Link>
        </p>
      </div>
    </>
  );
}
