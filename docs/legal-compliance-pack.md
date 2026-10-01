# BabySteps Germany — legal and compliance pack

Scope: what has to exist on the site before the beta URL is publicly reachable, and where the answer layer has to stop talking. I'm not a lawyer and this isn't legal advice — treat it as a checklist to take to one, and budget an hour with a German Anwalt before beta if any real users are involved.

---

## 1. Impressum (DDG §5) — mandatory, blocking

Germany requires a provider identification page on any business-like telemedia service, including a free private beta. This is the most commonly enforced obligation in German web law and it is enforced by competitors and Abmahnung firms, not by regulators. It must be reachable in at most two clicks from every page, labelled unambiguously (`Impressum`, not "About"), and it cannot be behind an intake flow.

Route: `/impressum`. Link from the footer next to the disclaimer.

```
Impressum

Angaben gemäß § 5 DDG

<Full legal name>
<Street and number>
<Postal code and city>
Deutschland

Kontakt
E-Mail: <address that is monitored>
Telefon: <optional for a private individual, but include if you have one>

Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV
<Full legal name>, <same address>

Hinweis
BabySteps ist ein privates, nicht-kommerzielles Projekt in einer geschlossenen
Testphase. Es handelt sich nicht um ein Angebot einer Behörde und nicht um eine
Rechts- oder Steuerberatung.
```

Two practical notes. A private address has to be a real one — a P.O. box does not satisfy §5, and if you don't want your home address published, a Postfach won't help but a registered business address or a lawyer's care-of address will. And if the project ever takes money, in any form, the Impressum requirements tighten and a `Verbraucherstreitbeilegung` statement gets added.

## 2. Datenschutzerklärung (GDPR Art. 13) — mandatory, blocking

Route: `/datenschutz`, linked in the footer. The PRD already promises a short privacy page in plain English; you need both: a German-language Datenschutzerklärung that satisfies Art. 13, and the plain-English trust page that actually gets read. Link each from the other.

Sections it must contain, with what your architecture actually makes true:

| Required section | What BabySteps says |
| --- | --- |
| Controller identity | Same details as the Impressum, plus contact for data requests |
| Data processed on visit | Server logs at Vercel: IP address, user agent, timestamp. Legal basis Art. 6(1)(f) |
| Intake answers | Stored in the browser's localStorage under a random ID. Not transmitted to the server unless the user subscribes to reminders. No name, no address, no health data beyond a due date |
| Questions asked | Question text is sent to Anthropic for the answer, and stored in the query log if the user consented. Not linked to an identity |
| E-mail reminders | E-mail plus intake answers stored in `reminder_subscriptions`. Legal basis Art. 6(1)(a) consent, double opt-in, one-click deletion via the unsubscribe token. Art. 7(3) withdrawal |
| Letter decoder (if F9 ships) | Pasted text is processed transiently, stripped of contact details before transmission, never written to disk or logs |
| Processors and transfers | Vercel (hosting, `fra1`), Supabase (database, `eu-central-1`), Anthropic (model inference), Resend (e-mail), Upstash (rate limiting). Name each with its role and the transfer mechanism |
| Rate-limiting data | Hashed IP held briefly by Upstash. Legal basis Art. 6(1)(f), security of processing |
| Retention | Corpus: indefinite, no personal data. Subscriptions: until unsubscribe. Logs: state the actual Vercel retention |
| Rights | Art. 15-21 rights and the right to complain to the Hessischer Beauftragter für Datenschutz und Informationsfreiheit |

**Three things to fix in the architecture, not the text:**

1. **Sign DPAs (Auftragsverarbeitungsverträge) with every processor** before beta. Vercel, Supabase, Anthropic, Resend and Upstash all offer them; several require you to actively accept them in the dashboard rather than getting them by default. Note the acceptance date somewhere — the accountability principle means you have to be able to show it.

2. **Self-host the fonts.** `next/font/local` or `next/font/google` with the download step, never a `fonts.googleapis.com` link tag. German courts have awarded damages for transmitting a visitor's IP to Google via a font request, and a wave of automated Abmahnungen followed. This is one line of config and it is the single cheapest legal risk you will retire all project.

3. **Check what Vercel Analytics actually sets.** It is cookieless and aggregates without an identifier, which is what makes a consent banner avoidable — and avoiding the banner is worth real money in trust terms for this product. Verify that claim against Vercel's current documentation yourself rather than trusting it, and if you add any second analytics tool the banner comes back. Design the site to never need a cookie banner; the persona's trust problem is exactly the thing a banner damages.

Your beta URL should also carry `X-Robots-Tag: noindex` until it isn't a beta.

## 3. The RDG line — the risk your §10 table is missing

The Rechtsdienstleistungsgesetz reserves *Rechtsdienstleistung* — legal work in a specific individual case requiring legal examination — to admitted lawyers. General information about what a statute says is not covered. An automated system that examines a particular family's circumstances and tells them what their legal position is edges toward the reserved activity, and the fact that a machine produced it does not help: the LegalTech case law of the last few years turned on whether the service assessed the individual case, not on whether a human did the assessing.

Your architecture is already on the right side of this, because the timeline is a deterministic calendar and the answers are supposed to be clause-level quotations of public law. What puts you on the wrong side is a fluent model being helpful. The failure mode is a sentence like "Based on your situation, you'll be entitled to €1,800 a month" — correct-sounding, individualised, and exactly the thing.

**The rule to enforce in `lib/prompts/answer.v1.md`:**

> Explain what the rule says and which conditions it attaches. Never state, predict or imply a conclusion about this user's individual entitlement, eligibility, amount, or the outcome of their application. If the question asks for such a conclusion, give the general rule, state plainly that only the responsible authority decides the individual case, and name that authority. Never perform a calculation of an amount the user would receive.

The same boundary exists on the tax side under the Steuerberatungsgesetz: Steuerklasse choice, tax effects and any calculation of tax owed or saved are reserved to tax advisers. Golden-set cases **R-06** and **R-08** exist specifically to hold this line — treat a confident individual verdict on either as a critical eval failure, in the same tier as a medical leak.

The medical boundary you already handle well. Note that it is a *different* kind of risk from the other two: the medical line is about harm, the RDG line is about a regulated activity. Both fail closed, for different reasons.

## 4. Disclaimer wording

The PRD's disclaimer is good. Two additions carry it across all three boundaries:

> BabySteps is a navigator to official sources — not legal, tax or medical advice. We explain the rules and show you where they come from; the decision in your case always lies with the responsible authority.

Place it in the footer of every route, not in a modal, and repeat a short form of it inside every answer card. In German on the German-language pages, in English in the product.

## 5. What to do about the query log

There is a conflict in the PRD you should resolve deliberately rather than by accident. The privacy posture says almost nothing is stored. The beta's entire purpose is to learn what people ask. If you store nothing, you finish the beta knowing your eval scores and nothing about your users.

Recommended resolution: log the question text, the retrieved chunk IDs, the answer's citation list and the guard verdict — never the intake profile, never an identifier, never letter-decoder content. Ask for it on the intake screen as a single opt-out checkbox, on by default with a plain sentence ("We keep the questions people ask, without anything that identifies you, so we can fix wrong answers"), and honour the opt-out at the write site rather than filtering later. That is defensible under legitimate interest with a clean opt-out, it gives you the failure cases that become golden set v2, and it costs you one table.

The alternative — no logging at all — is also defensible. What isn't defensible is discovering in week 4 that you can't reproduce the answer a beta family complained about.

## 6. Pre-beta checklist

- [ ] `/impressum` live, linked from every route, real address
- [ ] `/datenschutz` live in German, `/how-it-works` in English, cross-linked
- [ ] DPAs accepted and dated: Vercel, Supabase, Anthropic, Resend, Upstash
- [ ] Fonts self-hosted; no request to any Google domain on any route (check the Network tab with cache disabled)
- [ ] No cookie banner needed, because nothing sets a non-essential cookie — verified in the browser, not assumed
- [ ] `X-Robots-Tag: noindex` on the beta deployment
- [ ] Disclaimer in every footer and inside every answer card
- [ ] `answer.v1.md` contains the individual-case prohibition; R-06 and R-08 pass
- [ ] Query-log consent decided, implemented at the write site, described in both privacy pages
- [ ] Beta invite states plainly that this is a test, that answers can be wrong, and that the authority decides
