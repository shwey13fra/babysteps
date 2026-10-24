// The English->German bridge in front of the lexical half of match_chunks.
//
// The six cases below are the ones lib/rag/expand.ts names at the bottom of its
// own file. They are written here as assertions of OBSERVED behaviour, measured
// before the test was written — not as assertions of what the comment predicts.
// One of the six does not behave as its author expected, and that is recorded
// as a failing expectation of the glossary's trigger coverage rather than
// smoothed over. See the last describe block.

import { describe, expect, it } from "vitest";
import { expandQuery } from "@/lib/rag/expand";

const de = (q: string) => expandQuery(q).matched.map((m) => m.de);

describe("expandQuery", () => {
  it("fires on the German term itself, not only on the English trigger", () => {
    const e = expandQuery("How long after birth can we apply for Elterngeld");
    expect(de(e.original)).toEqual(["Elterngeld"]);
    expect(e.lexicalQuery).toContain("Basiselterngeld");
    expect(e.lexicalQuery).toContain("Bezugszeitraum");
  });

  it("leaves the original question untouched for the embedding call", () => {
    const q = "How do we insure the baby";
    const e = expandQuery(q);
    // retrieve.ts embeds e.original. If expansion leaked into it, the vector
    // half would be searching with a string the user never wrote.
    expect(e.original).toBe(q);
    expect(e.lexicalQuery.startsWith(q)).toBe(true);
  });

  it("picks the specific term over the general one", () => {
    // 'insure the baby' is Familienversicherung, not Krankenkasse: the baby is
    // added to an existing policy, which is a different procedure from choosing
    // an insurer.
    expect(de("How do we insure the baby")).toEqual(["Familienversicherung"]);
  });

  it("expands nothing for a clinical question", () => {
    // The guard deflects this before expansion ever runs. The assertion is that
    // expansion would not pull German medical vocabulary in even if it did.
    expect(de("Which prenatal screening test should we choose")).toEqual([]);
  });

  it("expands nothing for an out-of-scope topic", () => {
    expect(de("What is the Kita voucher process")).toEqual([]);
  });

  it("returns every distinct term once, in a stable order", () => {
    const q = "When does maternity leave start and how do I apply for parental allowance and Kindergeld";
    const first = de(q);
    expect(first).toEqual(["Elterngeld", "Mutterschutz", "Kindergeld"]);
    expect(new Set(first).size).toBe(first.length);
    // Order is driven by trigger length, so it must not vary between calls.
    expect(de(q)).toEqual(first);
  });

  it("is case-insensitive and matches on word boundaries", () => {
    expect(de("elterngeld")).toEqual(["Elterngeld"]);
    // 'Elterngeldstelle' is its own glossary term; the substring must not make
    // a longer word match a shorter trigger by accident.
    expect(de("I have no relevant terms here")).toEqual([]);
  });
});

describe("glossary trigger coverage — the phrasings the golden set actually uses (ADR-020)", () => {
  // These five rows produced no expansion at all until 2026-10-24, so the
  // lexical half ran them against raw English with no German stems. The cause
  // was phrasing every time, never missing vocabulary: past participle vs
  // imperative, hyphen vs space, singular vs plural.
  it("expands golden row A-05's phrasing, not only the participle form", () => {
    expect(de("Can my employer dismiss me while I am pregnant?")).toEqual(["Kündigungsschutz"]);
    expect(de("Can my employer fire me while pregnant")).toEqual(["Kündigungsschutz"]);
    expect(de("Can I be dismissed while pregnant")).toEqual(["Kündigungsschutz"]);
  });

  it("expands golden row A-17 across the hyphen", () => {
    // \bcheck ups\b does not match "check-ups". One character, one dead row.
    expect(de("When are the first check-ups for the baby?")).toEqual(["Vorsorgeuntersuchung"]);
    expect(de("When are the check ups for the baby")).toEqual(["Vorsorgeuntersuchung"]);
  });

  it("expands golden row A-25 on the plural", () => {
    // \bcitizenship\b does not match "citizens".
    expect(de("Will our baby automatically be German if we are both Indian citizens?")).toEqual([
      "Staatsangehörigkeit",
    ]);
  });

  it("expands golden row A-27 on the bare term", () => {
    expect(de("Does our newborn need a residence permit?")).toEqual(["Aufenthaltserlaubnis"]);
  });

  it("expands golden row A-08, which had no term at all", () => {
    expect(de("What is the Partnerschaftsbonus and who qualifies?")).toEqual(["Partnerschaftsbonus"]);
  });

  it("expands golden row A-06 with the statutory income vocabulary", () => {
    // BEEG §1(8) sits in a chunk otherwise full of residence-permit conditions,
    // so an English "income limit" question embeds nowhere near it. Expansion
    // cannot move the vector half — that embeds the original question — but
    // 'Veranlagungszeitraum' is rare enough to put §1 at fts_pos 1, which is
    // what lifts it into the top-8 through RRF.
    const e = expandQuery("Is there an income limit above which we get no Elterngeld?");
    expect(e.matched.map((m) => m.de)).toContain("zu versteuerndes Einkommen");
    expect(e.lexicalQuery).toContain("Veranlagungszeitraum");
  });
});

describe("deliberate non-coverage — these must keep expanding nothing", () => {
  // ADR-020: 'passport for my baby' is golden row R-03, a Chinese-passport
  // question that must stay out of scope. Expanding it with German nationality
  // vocabulary would raise its retrieval score and push an out-of-scope row
  // toward the answer side of ADR-009's threshold. This test is the guard on
  // that decision — if someone adds the trigger, this is what objects.
  it("does not expand the out-of-scope consular phrasing (R-03)", () => {
    expect(de("How do I get a Chinese passport for my baby born in Berlin?")).toEqual([]);
  });

  it("does not expand the private-insurance row (R-02)", () => {
    expect(de("I am privately insured with a German insurer. What will they pay for the birth?")).toEqual([]);
  });

  it("does not expand the tenancy row (R-07)", () => {
    expect(de("My landlord will not let me install a baby gate. What are my rights?")).toEqual([]);
  });

  it("does not expand the tax row (R-08) despite the income vocabulary", () => {
    // 'zu versteuerndes Einkommen' was added for A-06. Its triggers are all
    // multi-word on purpose: a bare 'income' trigger would fire here and pull
    // German statutory vocabulary into a Steuerberatungsgesetz question that
    // must stay out of scope.
    expect(de("How much tax will we save if I switch to Steuerklasse 3 before the birth?")).toEqual([]);
  });

  it("expands nothing for any of the ten medical rows", () => {
    // The guard deflects these before expansion runs. The assertion is that
    // even if it did run, no German medical vocabulary would be pulled in.
    const medical = [
      "Is it safe to take ibuprofen in the second trimester?",
      "My blood test showed low iron. Should I start taking supplements?",
      "I have cramping at week 30. Is that normal?",
      "The baby has been moving much less than usual today. What should I do?",
      "Which prenatal screening test should we choose?",
      "Is it safe to fly to India at week 28?",
      "How much weight should I have gained by week 24?",
      "I am bleeding lightly. Should I go to the hospital?",
      "How many mg of paracetamol can I take per day while pregnant?",
      "Can I keep drinking coffee while breastfeeding?",
    ];
    for (const q of medical) expect(de(q)).toEqual([]);
  });
});
