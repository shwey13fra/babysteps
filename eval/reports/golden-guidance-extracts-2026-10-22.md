# Golden set v1.1 — evidence for the four non-statute rows

Date: 2026-10-22 · corpus_version `2026-10`

These rows cite guidance, not statute, so there is no § to match and
`scripts/eval/golden-drift.ts` can say nothing about them. Below is each annotation
beside the ingested text of the page it rests on. **Nothing here is a judgement** —
the point is to put the claim and the source next to each other so a human can decide.

For each row: ✅ means the keyword appears in the ingested text, ❌ means it does not.
A missing keyword is not proof the claim is wrong — it may mean the detail lives on a
page or PDF we did not ingest, which is itself worth knowing.

## A-17 — G-BA Kinder-Richtlinie §2 (Zeiträume und Toleranzgrenzen)

**Question:** When are the first check-ups for the baby?

**Annotation requires:** U1 immediately after birth; U2 between the 3rd and 10th day of life; U3 in the 4th to 5th week; each has a tolerance window

**Ingested pages:** 2 section(s) from `gba_kinder_richtlinie`
(https://www.g-ba.de/richtlinien/15/)

**Keyword presence:** ✅ U1  ❌ U2  ❌ U3  ❌ Lebenstag  ❌ Woche  ✅ Früherkennung  ✅ Untersuchung

<details><summary>Ingested text</summary>

### Kinder-Richtlinie - Gemeinsamer Bundesausschuss

```
Richtlinie zur Früherkennung von Krankheiten bei Kindern

Die Richtlinie bestimmt das Nähere zu den Früherkennungsuntersuchungen bei Kindern bis zur Vollendung des 18. Lebensjahres. Neben den Untersuchungen U1 bis U9 gehören hierzu spezielle Früherkennungsuntersuchungen wie das erweiterte Neugeborenen-Screening und das Screening auf Mukoviszidose oder angeborene Herzfehler.

Die geltende Fassung der Richtlinie wird in Kürze zur Verfügung gestellt. In der angebotenen Fassung ist der am 20. August 2026 in Kraft getretene Beschluss noch nicht berücksichtigt.

In Kraft getreten am:

01.01.2026

Geändert am:

15.05.2025 BAnz AT 26.11.2025 B5

Fassung vom:

18.06.2015 BAnz AT 18.08.2016 B1
```

### Weiterführende Informationen

```
Stellungnahmeberechtigte Organisationen – inklusive der nicht in der AWMF organisierten Fachgesellschaften und der Spitzenorganisationen der Medizinproduktehersteller(PDF 115,64 kB)

Abschlussbericht zur Evaluation des Pulsoxymetrie-Screenings 2024(PDF 4,55 MB)

Abschlussbericht zur Evaluation der Untersuchungen nach Abschnitt B der Kinder-Richtlinie hinsichtlich Qualität und Zielerreichung 2023(PDF 2,83 MB)

Separate Anlage zum Abschlussbericht zur Evaluation der Untersuchungen nach Abschnitt B der Kinder-Richtlinie hinsichtlich Qualität und Zielerreichung 2023(PDF 11,77 MB)

Endbericht zur Folge-Evaluation des Neugeborenen-Hörscreenings 2017/2018(PDF 2,37 MB)

Endbericht Evaluation des Neugeborenen-Hörscreenings 2011/2012(PDF 7,37 MB)
```

</details>

## A-21 — Hessen Elterngeld guidance

**Question:** Where do we apply for Elterngeld in Frankfurt?

**Annotation requires:** the Elterngeldstelle responsible for the place of residence in Hessen; the answer names the authority and links its page; states that this is Hessen-specific

**Ingested pages:** 7 section(s) from `hessen_rp`
(https://rp-giessen.hessen.de/Elterngeld)

**Keyword presence:** ✅ Elterngeldstelle  ✅ zuständig  ❌ Wohnsitz  ✅ Antrag  ✅ Hessen  ❌ Kreis  ❌ Stadt

<details><summary>Ingested text</summary>

### Bundeselterngeld- und Elternzeitgesetz (BEEG)

```
Elterngeld

Das Elterngeld unterstützt Familien in den ersten Lebensmonaten des Kindes finanziell. Die Eltern haben verschiedene Möglichkeiten, den Bezug des Elterngeldes und die Inanspruchnahme der Elternzeit flexibel zu gestalten. Über die Möglichkeit der Inanspruchnahme von ElterngeldPlus einschließlich der sog. Partnerschaftsbonusmonate, ist ein Elterngeldbezug von max. bis zu 32 Monaten möglich. Damit kann die Vereinbarkeit von Familie und Beruf erleichtert werden.

Den vollständigen, aktuellen Gesetzestext zum Elterngeld und zur Elternzeit können Sie unter folgendem Link aufrufen: https://www.gesetze-im-internet.de/beeg/Öffnet sich in einem neuen Fenster.

Auf der Homepage des Bundesfamilienministeriums für Bildung, Familie, Senioren, Frauen und Jugend ( https://www.bmbfsfj.de/bmbfsfj/themen/familie/familienleistungen/elterngeld/elterngeld-73752Öffnet sich in einem neuen Fenster) stehen umfangreiche und ausführliche Informationen zum Elterngeld und zur Elternzeit zur Verfügung. Dort ist ebenfalls der Elterngeld-Rechner ( https://familienportal.de/familienportal/rechner-antraege/elterngeldrechnerÖffnet sich in einem neuen Fenster) hinterlegt, mit dem Sie unverbindlich die mögliche Höhe Ihres Elterngeldanspruches selbst ermitteln können.

Auch im Familien Atlas des Hessischen Ministeriums für Familie, Senioren, Sport, Gesundheit und Pflege ( https://www.familienatlas.de/themen/geld/finanzielle-hilfen/elterngeldÖffnet sich in einem neuen Fenster) können Sie sich umfassend informieren.

Elterngeldreform 2024 und 2025

Durch das Haushaltsfinanzierungsgesetz 2024 vom 22.12.2023 sind zum 01.04.2024 und zum 01.04.2025 Änderungen im BEEG eingetreten. Erläuterungen hierzu finden Sie auf der Homepage des Bundesministeriums für Bildung, Familie, Senioren, Frauen und JugendÖff
```

### Welches Versorgungsamt ist für mich zuständig?

```
Bevor Sie einen Antrag auf eine Versorgungsleistung stellen, informieren Sie sich hier zunächst, welches der sechs hessischen Ämter für Versorgung und Soziales (HÄVS) in Hessen für Sie zuständig ist.

Erster Schritt - Zuständiges Versorgungsamt finden

Fragen zum Mutterschutz?

Durch das Mutterschutzgesetz sollen schwangere und stillende Frauen vor Gefahren, Überforderung und Gesundheitsschädigungen am Arbeitsplatz geschützt werden.

Mehr erfahren
```

### Anträge und FAQs

```
Hier finden Sie Antworten zu häufig gestellten Fragen sowie alle Antragsunterlagen. Sie möchten Ihren Antrag gerne unkompliziert und schnell online stellen? Hier haben Sie die Möglichkeit.

Einfach, schnell, digital
```

### Onlineantrag Elterngeld

```
Über das Online-Portal können Sie mit eigener Registrierung Elterngeldanträge erstellen, verwalten und drucken oder sich diese von der Elterngeldstelle zusenden lassen.

Elterngeld
```

### Anträge und Infos

```
Hier finden Sie die Elterngeldanträge zum Ausdrucken in Papierform inklusive aller Anlagen und weitere Informationen.

FAQ Elterngeld
```

### Häufig gestellte Fragen zum Elterngeld (BEEG)

```
Hier finden Sie Antworten auf die wichtigsten Fragen rund ums Elterngeld. Nutzen Sie die Möglichkeit, sich im Vorfeld der Geburt zu informieren. Dies erspart Ihnen zeitaufwändige Rückfragen.

Sprechen Sie uns an!
```

### Kontakte

```
Hier finden Sie alle aktuellen Kontaktdaten der sechs Hessischen Ämter für Versorgung uns Soziales sowie der Fachaufsicht für den Bereich Elterngeld beim Regierungspräsidium Gießen.

Weitere Informationen zum Thema Elterngeld (Der FamilienAtlas) Öffnet sich in einem neuen Fenster

Wie viel Elterngeld würde mir zustehen? Finden Sie es heraus: Elterngeldrechner. Öffnet sich in einem neuen Fenster

Broschüre Elterngeld und Elternzeit - Für Geburten ab 01.09.2021 Öffnet sich in einem neuen Fenster

Brochure Parental Allowance, Parental Allowance Plus and Parental Leave (Englisch) Öffnet sich in einem neuen Fenster

Pressemitteilung des Regierungspräsidiums Gießen - Elterngeldantrag online und in Papierform Öffnet sich in einem neuen Fenster
```

</details>

## A-22 — Berlin Elterngeldstelle guidance

**Question:** Where do we apply for Elterngeld in Berlin?

**Annotation requires:** the Elterngeldstelle of the district Jugendamt responsible for the place of residence; states that this is Berlin-specific

**Ingested pages:** 19 section(s) from `berlin_service`
(https://service.berlin.de/dienstleistung/326079/ · https://service.berlin.de/dienstleistung/318957/ · https://service.berlin.de/dienstleistung/318960/)

**Keyword presence:** ✅ Elterngeldstelle  ❌ Jugendamt  ✅ Bezirk  ✅ zuständig  ✅ Wohnsitz  ✅ Antrag

<details><summary>Ingested text</summary>

### Aktuelle Hinweise zu dieser Dienstleistung

```
Liebe Eltern, aktuell wird das digitale Antragsportal fürs Elterngeld neu aufgesetzt. Neue Anträge stellen Sie bis zur Fertigstellung bitte postalisch bei Ihrer Elterngeldstelle im Bezirk. Bis dahin steht Ihnen ein Antragsassistent zur Verfügung, der das digitale Ausfüllen des Antrags ermöglicht. Der Antrag wird anschließend ausgedruckt, unterschrieben und postalisch zugesandt. In Kürze wird auch die vollständige Online-Antragstellung im neuen Layout wieder möglich sein. Wir werden an dieser Stelle darüber informieren.

Basiselterngeld kann nur in den ersten 14 Lebensmonaten des Kindes bezogen werden. Der Anspruch besteht für 12 Lebensmonate Ihres Kindes.

Soweit sich bei mindestens einem Elternteil das Erwerbseinkommen nach der Geburt mindert, können Sie zwei zusätzliche Basiselterngeldmonate nutzen.

Sie müssen mindestens zwei Monate und können höchstens zwölf Monate Basiselterngeld in Anspruch nehmen.

Ein gleichzeitiger Bezug von Basiselterngeld ist nur innerhalb der ersten zwölf Lebensmonate des Kindes und maximal für einen Monat möglich. Eltern von Frühchen, Mehrlingen oder neugeborenen Kindern mit Behinderung oder Geschwisterkindern mit Behinderung können nach Bedarf und für mehr als einen Monat gleichzeitig Basiselterngeld beziehen.

Das Elterngeld beträgt zwischen 300 Euro und 1.800 Euro, je nach dem bisherigen Einkommen.

Die Grenze des zu versteuernden Einkommens, ab dem der Anspruch auf Elterngeld entfällt, ist für Geburten ab dem 1. April 2024 für Paare und Alleinerziehende auf 200.000 Euro festgelegt. Ab dem 1. April 2025 wird die Einkommensgrenze auf 175.000 Euro gesenkt.

Elterngeld kann auf andere Sozialleistungen wie Bürgergeld, Grundsicherung oder Kinderzuschlag angerechnet werden.

ElterngeldPlus können Sie doppelt so lange bekommen wie Basiselternge
```

### Online-Abwicklung

```
Jetzt Antragsassistent nutzen Für die Nutzung des Online-Dienstes benötigen Sie ein BundID-Konto. Das digitale Antragsportal fürs Elterngeld wird aktuell neu aufgesetzt. Neue Anträge stellen Sie bis zur Fertigstellung bitte postalisch bei Ihrer Elterngeldstelle im Bezirk. Bis dahin steht Ihnen ein Antragsassistent zur Verfügung, der das digitale Ausfüllen des Antrags ermöglicht. Der Antrag wird anschließend ausgedruckt, unterschrieben und postalisch zugesandt.
```

### Voraussetzungen

```
Eigenes Kind Sie sind Mutter oder Vater des Kindes. Es kann Ihr leibliches, Ihr Stiefkind, Adoptivkind oder ein Kind sein, das Sie adoptieren wollen. Verwandte zweiten oder dritten Grades können Elterngeld bekommen, wenn sie das Kind betreuen, weil die Eltern aufgrund schwerer Krankheit, Schwerbehinderung oder Tod nicht können.

Betreuung des Kindes Sie betreuen und erziehen Ihr Kind selbst.

Keine Erwerbstätigkeit oder keine volle Erwerbstätigkeit Sie arbeiten höchstens 32 Stunden pro Woche

Gemeinsamer Haushalt mit dem Kind Sie leben mit Ihrem Kind in einem gemeinsamen Haushalt.

Wohnsitz in Berlin Sie wohnen in Berlin und sind hier gemeldet.

Einkommen im letzten Jahr Ihr zu versteuerndes Einkommen im Jahr vor der Geburt Ihres Kindes betrug von beiden Elternteilen zusammen nicht mehr als 300.000 Euro (seit 01.04.2024: 200.000 Euro, ab 01.04.2025: 175.000 Euro), wenn beide im selben Haushalt leben. Für Einkünfte, die im Ausland erzielt wurden, gelten besondere Regelungen.

Für die Online-Antragstellung: Registrierung/Anmeldung mit dem BundID-Konto Um den Antrag online stellen zu können, melden sich mit Ihrem BundID-Konto an oder registrieren Sie sich bei der BundID, falls Sie noch kein BundID-Konto haben.

Für die Online-Antragstellung (optional): aktivierte Online-Ausweisfunktion (eID) (empfohlen) oder Elster-Zertifikat Für die Anmeldung bei Ihrem BundID-Konto mit der Variante "Online-Ausweis" benötigen Sie: Ihren elektronischen Personalausweis, die Unionsbürgerkarte (eID-Karte) oder den elektronischen Aufenthaltstitel (eAT) mit aktivierter Online-Ausweisfunktion (eID) und der sechsstelligen PINein externes Kartenlesegerät oder ein modernes Smartphone mit Android- oder iOS-Betriebssystemdie Software "AusweisApp"Alternativ zum "Online-Ausweis" können Sie auch die Vari
```

### Erforderliche Unterlagen

```
Antrag auf Elterngeld Online möglich oder Sie stellen einen schriftlich Antrag per Post Der Elterngeldantrag liegt in zwei unterschiedlichen Varianten vor. Bitte verwenden Sie den entsprechenden Elterngeldantrag, je nachdem, ob Ihr Kind oder Ihre Kinder vor bzw. am/nach dem 1. April 2025 geboren sind.Für die Online-Antragstellung: Halten Sie bitte Ihren Personalausweis, die Unionsbürgerkarte (eID-Karte) oder den elektronischen Aufenthaltstitel (eAT), jeweils mit aktivierter Online-Ausweisfunktion (eID), bereit. Antragsdaten, Nachweise und Unterschrift können komplett digital übermittelt werden. Es ist kein Ausdrucken und versenden mit der Post nötig.Alternativ können Sie den Antrag schriftlich per Post senden: Der Antrag muss von beiden Elternteilen unterschrieben werden.

Der Elterngeldantrag liegt in zwei unterschiedlichen Varianten vor. Bitte verwenden Sie den entsprechenden Elterngeldantrag, je nachdem, ob Ihr Kind oder Ihre Kinder vor bzw. am/nach dem 1. April 2025 geboren sind.

Für die Online-Antragstellung: Halten Sie bitte Ihren Personalausweis, die Unionsbürgerkarte (eID-Karte) oder den elektronischen Aufenthaltstitel (eAT), jeweils mit aktivierter Online-Ausweisfunktion (eID), bereit. Antragsdaten, Nachweise und Unterschrift können komplett digital übermittelt werden. Es ist kein Ausdrucken und versenden mit der Post nötig.

Alternativ können Sie den Antrag schriftlich per Post senden: Der Antrag muss von beiden Elternteilen unterschrieben werden.

Bei Änderungen nach Antragstellung auf Elterngeld: Berliner Änderungsantrag auf Elterngeld Bitte reichen Sie den Änderungsantrag schriftlich per Post ein.

Ausweis-Dokumente Personalausweise oder Reisepässe inklusive letzter Meldebescheinigung jedes Elternteils

Geburtsurkunde des Kindes zur Beantragung von Elterng
```

### Formulare

```
Antrag auf Elterngeld für Kinder, die am oder nach dem 1. April 2025 geboren sind

Antrag auf Elterngeld für Kinder, die zwischen dem 1. April 2024 und 31. März 2025 geboren sind

Antrag auf Elterngeld für Kinder, die vor dem 1. April 2024 geboren sind

Berliner Änderungsantrag auf Elterngeld

Antrag auf Elterngeld ab April 2025 - Anlage: Wohnsitz im Ausland zu Abschnitt 2.c

Antrag auf Elterngeld ab April 2025 - Anlage: Staatsangehörigkeit zu Abschnitt 2.g

Antrag auf Elterngeld ab April 2025 - Anlage: Einkünfte neben dem Elterngeld zu Abschnitt 12.a

Antrag auf Elterngeld ab April 2025 - Anlage: Arbeitgeberbescheinigung
```

### Weiterführende Informationen

```
Informationen zum Elterngeld (Bundesministerium für Bildung, Familie, Senioren, Frauen und Jugend)

Informationen zum Elterngeld (Senatsverwaltung für Bildung, Jugend und Familie)

Neuregelungen beim Elterngeld für Geburten ab 1. April 2024 (Bundesministerium für Bildung, Familie, Senioren, Frauen und Jugend)

Familienportal (Bundesministerium für Bildung, Familie, Senioren, Frauen und Jugend)

Elterngeldrechner (Bundesministerium für Bildung, Familie, Senioren, Frauen und Jugend)
```

### Voraussetzungen

```
Das Kind kommt in einem Berliner Krankenhaus oder Geburtshaus zur Welt Die Einrichtung (das Krankenhaus bzw. das Geburtshaus) meldet in diesem Fall die Geburt dem zuständigen Standesamt und übermittelt die Geburtsanzeige.

oder: Das Kind kommt zu Hause zur Welt (Hausgeburt) In diesem Fall stellen Hebammen, Geburtshelfer, Ärztinnen und Ärzte die Geburtsbescheinigung aus. Diese muss dann von den Eltern dem zuständigen Standesamt vorgelegt werden.

ggf. Frist: 1 Woche Wenn das Kind zu Hause zur Welt kommt, dann muss die Geburt von den Eltern innerhalb einer Woche dem zuständigen Standesamt gemeldet und die Geburtsbescheinigung vorgelegt werden.

Dokumente in deutscher Sprache Sollten die erforderlichen Unterlagen / Urkunden nicht in deutscher Sprache vorliegen, so müssen diese durch eine/n in Deutschland beeidigte/n Dolmetscher/in übersetzt werden (unter "Weiterführende Informationen").Für einige Länder ist zudem eine Überbeglaubigung (Apostille oder Legalisation) erforderlich. Die Apostille (von der zuständigen Heimatbehörde im Heimatland ausgestellt) oder die Legalisation (von der deutschen Botschaft ausgestellt) muss direkt auf dem Original angebracht oder damit verbunden sein (mehr unter "Weiterführende Informationen").Bei Urkunden, die im Original in arabisch, griechisch, hebräisch oder kyrilisch ausgestellt wurden, muss die Übersetzung von Personennamen (wie Vor- und Familiennamen, Geburtsnamen) zwingend nach den Transliterationsnormen (ISO 9-1995 / ISO 843 / DIN 31634 / ELOT 734 usw.) erfolgen.

Sollten die erforderlichen Unterlagen / Urkunden nicht in deutscher Sprache vorliegen, so müssen diese durch eine/n in Deutschland beeidigte/n Dolmetscher/in übersetzt werden (unter "Weiterführende Informationen").

Für einige Länder ist zudem eine Überbeglaubigung (Apostill
```

### Erforderliche Unterlagen

```
Anzeige der Geburt entweder übermittelt die Einrichtung (das Krankenhaus bzw. das Geburtshaus) die Geburtsanzeigeoder die Eltern übermitteln die Geburtsbescheinigung innerhalb einer Woche (bei Hausgeburten)

entweder übermittelt die Einrichtung (das Krankenhaus bzw. das Geburtshaus) die Geburtsanzeige

oder die Eltern übermitteln die Geburtsbescheinigung innerhalb einer Woche (bei Hausgeburten)

ggf. Erklärung beider Elternteile über Vornamen und Familiennamen des Kindes (unterschrieben) (unter "Formulare") Die Namenserklärung kann auch formlos erfolgen, muss aber von beiden Elternteilen unterschrieben werden.Den Vordruck für die Namenserklärung erhalten Sie auch im Krankenhaus, Geburtshaus oder im Standesamt.Wenn die Einrichtung (Krankenhaus bzw. Geburtshaus) die Geburtsanzeige übermittelt, ist die Namenserklärung oft schon enthalten.

Die Namenserklärung kann auch formlos erfolgen, muss aber von beiden Elternteilen unterschrieben werden.

Den Vordruck für die Namenserklärung erhalten Sie auch im Krankenhaus, Geburtshaus oder im Standesamt.

Wenn die Einrichtung (Krankenhaus bzw. Geburtshaus) die Geburtsanzeige übermittelt, ist die Namenserklärung oft schon enthalten.

gültiger Personalausweis oder Reisepass der Eltern

Geburtsurkunde der Mutter

ggf. Geburtsurkunde des Vaters

ggf. Eheurkunde

ggf. Vaterschaftsanerkennung Erforderlich, sofern eine solche Erklärung abgegeben wurde und beide Eltern nicht miteinander verheiratet sind.

ggf. Sorgeerklärung Erforderlich, sofern eine solche Erklärung abgegeben wurde und beide Eltern nicht miteinander verheiratet sind.

ggf. Nachweis über die Auflösung der Ehe Ist die Kindesmutter geschieden oder verwitwet, ist die Eheurkunde sowie ein Nachweis über die Auflösung (Auflösungsvermerk auf der Urkunde oder rechtskräftiges Scheid
```

### Rechtsgrundlagen

```
Personenstandsgesetz (PStG) §§ 18-21 - Anzeige und Beurkundung

Personenstandsverordnung (PStV) § 33 - Nachweise bei Anzeige der Geburt

Verordnung zur Ausführung des Personenstandsgesetzes im Land Berlin (PStGAV Bln) § 9 - Gebührenfestsetzung
```

### Weiterführende Informationen

```
Verzeichnis zugelassener beeidigter Übersetzer/innen und Dolmetscher/innen

Auswärtiges Amt: Ausländische öffentliche Urkunden zur Verwendung in Deutschland
```

### Hinweise zur Zuständigkeit

```
Die Geburt eines Kindes muss in dem Standesamt des Geburtsortes/Geburtsbezirks gemeldet (angezeigt) werden. Der Wohnsitz der Eltern ist dabei nicht entscheidend.
```

### Aktuelle Hinweise zu dieser Dienstleistung

```
Bei der Online-Beantragung dieser Dienstleistung ist zwischen dem 10. und 12.07.2026 eine technische Störung aufgetreten: Nach dem Bezahlvorgang über das ePayment am Ende des Bestellprozesses haben die betroffenen Antragstellerinnen und Antragssteller eine Fehlermeldung erhalten. Die Bestellungen wurden nicht an die zuständigen Fachbehörden übermittelt, obwohl der Bezahlvorgang abgeschlossen war. Somit können die betroffenen Kundinnen und Kunden die bestellten Verwaltungsleistungen nicht erhalten. Die technische Störung wurde kurzfristig behoben. Die Fachbehörden können leider vereinzelt Personen nicht direkt informieren, da in diesen Fällen keine personenbezogenen Daten ermittelt werden konnten. Bitte prüfen Sie, ob alle der folgenden Punkte auf Ihre Bestellung zutreffen: 1. Sie haben zwischen Freitag, 10.07.2026, bis Sonntag, 12.07.2026, diese Dienstleistung online beantragt. 2. Sie haben die Dienstleistung mit Kreditkarte oder PayPal erfolgreich bezahlt. 3. Sie haben den Antrag zur Bestellung der Dienstleistung nicht einreichen können und erhielten eine Fehlermeldung. 4. Sie haben noch keine Leistung oder noch keinen Bescheid oder noch keine Rückzahlung durch die fachlich zuständige Behörde erhalten. Wenn bei Ihnen alle vier Punkte zutreffen, melden Sie sich bitte unter Angabe Ihres Geburtsdatums sowie mit einem Zahlungsnachweis der Buchung (keinen vollständigen Kontoauszug) unter der eMail-Adresse antragsservice@itdz-berlin.de, damit eine Rückerstattung der Gebühr veranlasst werden kann. Die Verwaltungsleistung beantragen Sie bitte erneut. Eine Verrechnung ist nicht möglich.

Bei der Online-Beantragung dieser Dienstleistung ist zwischen dem 11. und 12.03.2026 sowie zwischen dem 14. und 16.03.2026 eine technische Störung aufgetreten: Nach dem Bezahlvorgang über das e
```

### Online-Abwicklung

```
Jetzt online erledigen

Kostenpflichtige Ermittlung des zuständigen Standesamtes in Berlin (Geburt) (Wenn Ihnen das zuständige Standesamt gänzlich unbekannt ist)

Kostenfreie eigenständige Suche nach dem zuständigen Standesamt (Wenn Ihnen das heute zuständige Standesamt nicht bekannt ist, Sie jedoch die ehemalige Standesamtsbezeichnung kennen)
```

### Voraussetzungen

```
Die Geburt wurde bei dem Standesamt, in dessen Bezirk die Person geboren wurde, bereits beurkundet.

Sie sind berechtigt, die Urkunde zu beantragen Die Urkunde kann beantragt werden von: der beurkundeten Person selbsteiner Person, die in gerader Linie mit der beurkundeten Person verwandt ist (Eltern, Kinder, Großeltern, Enkelkinder)der/dem Ehefrau/Ehemann oder Lebenspartnerin/LebenspartnerGeschwistern, sofern sie ein berechtigtes Interesse an der Ausstellung der Urkunde glaubhaft machenPersonen, die ein rechtliches Interesse glaubhaft machenPersonen, die über eine Vollmacht verfügen

der beurkundeten Person selbst

einer Person, die in gerader Linie mit der beurkundeten Person verwandt ist (Eltern, Kinder, Großeltern, Enkelkinder)

der/dem Ehefrau/Ehemann oder Lebenspartnerin/Lebenspartner

Geschwistern, sofern sie ein berechtigtes Interesse an der Ausstellung der Urkunde glaubhaft machen

Personen, die ein rechtliches Interesse glaubhaft machen

Personen, die über eine Vollmacht verfügen

Ihnen muss das zuständige Standesamt bekannt sein Wenn Ihnen nur die ehemalige Bezeichnung des Berliner Standesamts bekannt ist, dann haben Sie die Möglichkeit, selbst kostenlos online nach dem zuständigen Standesamt zu suchen. Wenn Ihnen das Standesamt gänzlich unbekannt ist, können Sie eine kostenpflichtige Suche in Auftrag geben.

Für die Online-Antragstellung: Zustimmung zum elektronischen Bezahlverfahren oder Überweisung Zahlen Sie elektronisch direkt im Online-Verfahren per Kreditkarte (Visa, Mastercard)Sie können alternativ per Überweisung bezahlen. Sie erhalten dann einen Gebührenbescheid per Post.

Zahlen Sie elektronisch direkt im Online-Verfahren per Kreditkarte (Visa, Mastercard)

Sie können alternativ per Überweisung bezahlen. Sie erhalten dann einen Gebührenbescheid per 
```

### Erforderliche Unterlagen

```
Antrag auf Ausstellung einer Geburtsurkunde oder einer beglaubigten Abschrift aus dem Geburtenregister Den Antrag können Sie entweder online oder persönlich vor Ort stellen. Die Online-Antragstellung ist nur möglich, wenn Sie das zuständige Standesamt angeben können.

Die Online-Antragstellung ist nur möglich, wenn Sie das zuständige Standesamt angeben können.

Für die Antragstellung vor Ort: Identitätsnachweis Personalausweis oder Reisepass

Für die Antragstellung vor Ort: Verwandtschaftsnachweis (wenn Sie verwandt sind) Sind Sie in gerader Linie mit den beurkundeten Personen verwandt (Eltern, Kinder, Großeltern, Enkelkinder), benötigen Sie einen Verwandtschaftsnachweis: z. B. Geburtsurkunde, Eheurkunde oder Lebenspartnerschaftsurkunde.

Für die Antragstellung vor Ort: Nachweis eines rechtlichen Interesses (wenn Sie nicht verwandt sind) Sind Sie nicht in gerader Linie mit den beurkundeten Personen verwandt, benötigen Sie den Nachweis eines rechtlichen Interesses: z. B. Erbschein oder Grundbuchauszug.

Für die Antragstellung vor Ort: Vollmacht (wenn Sie die Urkunde für eine andere Person beantragen)
```

### Rechtsgrundlagen

```
Personenstandsgesetz (PStG) §§ 61f.

Personenstandsverordnung (PStV) §§ 53-55

Verordnung zur Ausführung des Personenstandsgesetzes im Land Berlin (PStGAV Bln) § 9 - Gebührenfestsetzung
```

### Weiterführende Informationen

```
Informationen zur Ermittlung des zuständigen Standesamtes (Landesamt für Bürger- und Ordnungsangelegenheiten)

Geburtsurkunde für Neugeborene (Erstbeurkundung) (Dienstleistung)

Auskunft aus den historischen Standesamtsunterlagen zu in Berlin beurkundeten Personenstandsfällen beantragen (für Geburten, die länger als 110 Jahre zurückliegen)
```

### Hinweise zur Zuständigkeit

```
Standesamt: Zuständig ist das Standesamt, in dessen Bezirk die Person tatsächlich geboren wurde (unabhängig vom Wohnsitz). Sollte Ihnen lediglich der Geburtsort "Berlin" bekannt sein, können Sie kostenpflichtig eine Ermittlung des zuständigen Standesamtes beauftragen.

Landesarchiv: Sollte die Geburt bereits länger als 110 Jahre zurückliegen, wenden Sie sich bitte an das Landesarchiv Berlin.
```

### Verwandte Dienstleistungen

```
Urkunden - Geburtsurkunde bei Geburt im Ausland oder in einem ehemaligen deutschen Gebiet beantragen
```

</details>

## A-23 — ElterngeldDigital guidance

**Question:** Can we apply for Elterngeld online?

**Annotation requires:** an online route exists; availability depends on the Bundesland and the authority; the answer states whether it covers the user's state and links the official portal

**Ingested pages:** 1 section(s) from `familienportal`
(https://familienportal.de/familienportal/rechner-antraege/elterngeld-digital)

**Keyword presence:** ✅ online  ✅ digital  ✅ ElterngeldDigital  ❌ Bundesland  ✅ Antrag

<details><summary>Ingested text</summary>

### Sie befinden sich hier:

```
Das Elterngeld gleicht fehlendes Einkommen aus, wenn Eltern ihr Kind nach der Geburt betreuen. Es sichert die wirtschaftliche Existenz der Familien und hilft Vätern und Müttern, Familie und Beruf besser zu vereinbaren.

Mit dem Angebot ElterngeldDigital können Sie Elterngeld in den Bundesländern Berlin, Brandenburg, Bremen, Hamburg, Mecklenburg-Vorpommern, Niedersachsen, Rheinland-Pfalz, Sachsen-Anhalt, Schleswig-Holstein und Thüringen auch mit elektronischer Unterstützung beantragen.

Ein digitaler Antragassistent hilft Ihnen beim Ausfüllen des Antrags. Danach können Sie das erstellte Dokument ausdrucken, unterschreiben und per Post an Ihre zuständige Elterngeldstelle schicken. Sollten Sie technische Probleme oder Fragen zum Elterngeldantrag haben, können Sie sich an die Support-Hotline von ElternDigital wenden: Montag bis Donnerstag, 10-12 und 13-15 Uhr, Tel. 0421 - 361 94195

Unabhängig vom Angebot ElterngeldDigital können Sie in Baden-Württemberg, Bayern, Hessen, Nordrhein-Westfalen, Saarland und Sachsen Elterngeld online beantragen.
```

</details>
