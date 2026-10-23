# Draft: request to the Consulate General of India, Frankfurt

**Status: draft for your review. Not sent.** I do not send outward-facing correspondence.
Fill the bracketed fields, decide whether to send it at all, and send it yourself.

Addressed to Frankfurt because that mission serves Hessen and is the one whose `robots.txt`
forbids us (`Disallow: /`). A near-identical letter can go to Berlin once we have a working URL
for it; Berlin's robots.txt does not currently forbid anything, so Berlin is a reliability
problem rather than a permission one.

Rule 15: no real person's contact details go in this repo. The bracketed fields stay bracketed
in the committed file.

---

Subject: Request for permission to index public consular information pages

To the Consulate General of India, Frankfurt am Main

[Sender name]
[Sender postal address]
[Sender e-mail]

[Date]

Dear Sir or Madam,

I am building a free, non-commercial information tool for Indian families having a baby in
Germany. It sets out, side by side, the German administrative deadlines and the Indian consular
steps that follow a birth — birth registration with the mission, and the child's first passport.
It answers questions only from official sources and shows the citation and the date the source
was last checked beside every answer. It gives no advice on individual cases and makes no
prediction about any application's outcome; where a decision rests with an authority, it names
that authority.

The Consulate's website at `www.cgifrankfurt.gov.in` currently serves a `robots.txt` containing
`User-agent: *` and `Disallow: /`. I treat that as a refusal and have not fetched any page from
the site, including pages that are publicly readable in a browser.

I would be grateful for your guidance on two points:

1. Whether the Consulate would permit an automated client, identifying itself as
   `BabyStepsBot`, to retrieve the public consular information pages on birth registration and
   minors' passports — at a low request rate, no more than once a week, and only those pages.
2. If not, whether the Consulate would prefer that the information be reproduced from the
   website manually with a visible citation and a "last checked" date, which is what the tool
   does at present, or whether the Consulate would rather it linked to the pages without
   reproducing their text.

I would rather ask than assume. If the current `robots.txt` reflects a deliberate policy, I will
continue to respect it, and point users to your pages instead of reproducing them.

I am happy to provide a demonstration of the tool, or to add any wording the Consulate considers
necessary alongside information drawn from its pages.

Thank you for your time.

Yours faithfully,

[Sender name]

---

## Notes for you, not for the letter

- Point 2 is the part worth sending even if point 1 is declined: it converts our hand-curation
  from something we do quietly into something the mission knows about and has had a chance to
  object to.
- If a reply permits fetching, the follow-up is a new ADR superseding ADR-019, adding the source
  to `data/corpus_manifest.yaml`, and `data/consular/india.yaml` becomes the crawl's seed rather
  than its substitute.
- No reply is the likely outcome. The worklist does not depend on an answer.
